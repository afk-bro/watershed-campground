import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import crypto from 'crypto';
import Stripe from "stripe";
import { checkAvailability } from "@/lib/availability";
import { calculateTotal } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2025-11-17.clover" as any,
});

// Schema for validation
const reservationFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    address1: z.string().min(1, "Address is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    checkIn: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid check-in date",
    }),
    checkOut: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid check-out date",
    }),
    rvLength: z.string().min(1, "RV length is required"),
    rvYear: z.string().optional(),
    adults: z.coerce.number().min(1, "At least 1 adult is required"),
    children: z.coerce.number().min(0).default(0),
    campingUnit: z.string().min(1, "Camping unit type is required"),
    hearAbout: z.string().optional(),
    contactMethod: z.enum(["Phone", "Email", "Either"]),
    comments: z.string().optional(),
    addons: z.array(z.object({
        id: z.string(),
        quantity: z.number().min(1),
        price: z.number()
    })).optional().default([]),
    campsiteId: z.string().optional() // Essential for locking the specific site selected at checkout
});

// Helpers
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function escapeHtml(unsafe: string) {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const manageUrl = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/manage-reservation` : 'http://localhost:3000/manage-reservation';

export async function POST(request: Request) {
    console.log("DEBUG: Reservation API Hit");
    try {
        const body = await request.json();
        console.log("DEBUG: Received body", body);

        const { paymentIntentId, paymentMethod, ...formDataRaw } = body;

        // Validate request body
        const result = reservationFormSchema.safeParse(formDataRaw);
        if (!result.success) {
            console.error("DEBUG: Validation failed", result.error.flatten());
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const formData = result.data;
        const name = `${formData.firstName} ${formData.lastName}`;

        // Retrieve payment intent if provided (do this once to avoid duplicate API calls)
        let paymentIntent: Stripe.PaymentIntent | null = null;
        if (paymentIntentId) {
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
            }
        }

        // Determine campsite ID based on payment status
        let recommendedSiteId: string;

        // If payment has already been processed, use the campsite from payment intent metadata
        // This prevents race conditions where the site gets booked between payment and reservation creation
        if (paymentIntent) {
            // Use campsite ID from payment intent metadata (locked at payment time)
            const metadataCampsiteId = paymentIntent.metadata.campsiteId;
            if (!metadataCampsiteId) {
                console.error("DEBUG: Payment intent missing campsiteId in metadata");
                return NextResponse.json({ error: "Invalid payment: missing campsite information" }, { status: 400 });
            }

            recommendedSiteId = metadataCampsiteId;
            console.log("DEBUG: Using campsite from payment intent metadata:", recommendedSiteId);

        } else {
            // For offline/admin bookings, check availability normally
            const availabilityResult = await checkAvailability({
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                guestCount: formData.adults + formData.children,
                campsiteId: formData.campsiteId
            });

            if (!availabilityResult.available || !availabilityResult.recommendedSiteId) {
                console.log("DEBUG: No campsites available");
                return NextResponse.json({ error: "Dates no longer available." }, { status: 400 });
            }

            recommendedSiteId = availabilityResult.recommendedSiteId;
        }

        // Fetch Campsite Base Rate
        const { data: campsite, error: siteError } = await supabaseAdmin
            .from("campsites")
            .select("base_rate, id, name, type")
            .eq("id", recommendedSiteId)
            .single();

        if (siteError || !campsite) {
            console.error("Site fetch error:", siteError);
            return NextResponse.json({ error: "Failed to retrieve campsite details" }, { status: 500 });
        }

        // Calculate Site Total
        const siteTotal = calculateTotal(campsite.base_rate, formData.checkIn, formData.checkOut);

        // Fetch & Calculate Add-ons Total (Secure Server-Side)
        let addonsTotal = 0;
        let validAddons: any[] = [];

        if (formData.addons && formData.addons.length > 0) {
            const addonIds = formData.addons.map(a => a.id);
            const { data: dbAddons, error: fetchErr } = await supabaseAdmin
                .from('addons')
                .select('id, price')
                .in('id', addonIds);

            if (!fetchErr && dbAddons) {
                validAddons = formData.addons.map(item => {
                    const dbItem = dbAddons.find(d => d.id === item.id);
                    if (!dbItem) return null;
                    return {
                        ...item,
                        price: dbItem.price // Enforce DB price
                    };
                }).filter(Boolean);

                addonsTotal = validAddons.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
        }

        let totalAmount = siteTotal + addonsTotal;

        // 1. Verify Payment OR Check Admin Bypass
        let paymentStatus = 'pending';
        let amountPaid = 0;
        let balanceDue = 0;
        let policySnapshot = null;
        let paymentType = 'full';
        let remainderDueAt = null;

        const isOffline = (formDataRaw as any).isOffline;
        const adminToken = request.headers.get("Authorization")?.split(" ")[1];

        if (paymentIntent) {
            // Payment intent already verified above
            paymentStatus = 'paid';
            amountPaid = (paymentIntent.amount_received || 0) / 100;

            // Sanity Check: If paid amount implies full payment (within small margin)
            if (Math.abs(totalAmount - amountPaid) < 0.50) {
                balanceDue = 0;
            } else {
                balanceDue = totalAmount - amountPaid;
                if (balanceDue < 0) balanceDue = 0; // Should not happen unless refund needed
            }

            // Extract Policy Info
            const policyId = paymentIntent.metadata.policyId;
            if (policyId) {
                const { data: policy } = await supabaseAdmin.from('payment_policies').select('*').eq('id', policyId).single();
                if (policy) {
                    policySnapshot = policy;
                    if (policy.policy_type === 'deposit') {
                        paymentStatus = 'deposit_paid';
                        paymentType = 'deposit';

                        if (policy.due_days_before_checkin) {
                            const checkInDate = new Date(formData.checkIn);
                            checkInDate.setDate(checkInDate.getDate() - policy.due_days_before_checkin);
                            remainderDueAt = checkInDate.toISOString();
                        }
                    }
                }
            }
        } else if (isOffline && adminToken) {
            // ADMIN OFFLINE BYPASS
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(adminToken);
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized: Invalid Admin Token" }, { status: 401 });
            }

            // If authorized, mark as fully paid offline
            paymentStatus = 'paid_offline'; // Custom status for audit? Or just 'paid'? Let's use 'paid' for now to keep status simple, or 'confirmed'
            // Actually, let's use 'confirmed' status for reservation, and track payment in 'amount_paid'

            // Assume full payment for offline unless specified? 
            // To keep V1 simple: Admin "Mark as Paid" means FULL payment.
            amountPaid = totalAmount;
            balanceDue = 0;
            paymentType = 'offline_cash';

            console.log(`DEBUG: Admin bypass used by ${user.email}`);

        } else if (paymentMethod === 'in-person') {
            // Pay in person - no payment yet, full amount due on arrival
            paymentStatus = 'pay_on_arrival';
            amountPaid = 0;
            balanceDue = totalAmount;
            paymentType = 'cash';
            console.log("DEBUG: Pay in person reservation");
        } else {
            // No payment intent and no valid payment method
            return NextResponse.json({ error: "Payment method required" }, { status: 400 });
        }

        // Generate magic link token
        const rawToken = generateToken();
        const tokenHash = hashToken(rawToken);

        // 2. Insert Reservation
        console.log("DEBUG: Attempting Supabase insert...");
        const { data: reservation, error: dbError } = await supabaseAdmin
            .from('reservations')
            .insert([
                {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    address1: formData.address1,
                    address2: formData.address2,
                    city: formData.city,
                    postal_code: formData.postalCode,
                    check_in: formData.checkIn,
                    check_out: formData.checkOut,
                    adults: formData.adults,
                    children: formData.children,
                    rv_length: formData.rvLength,
                    rv_year: formData.rvYear,
                    camping_unit: formData.campingUnit,
                    hear_about: formData.hearAbout,
                    contact_method: formData.contactMethod,
                    comments: formData.comments,
                    status: 'confirmed',
                    public_edit_token_hash: tokenHash,
                    campsite_id: recommendedSiteId,

                    // Payment fields
                    stripe_payment_intent_id: paymentIntentId,
                    payment_status: paymentStatus,
                    amount_paid: amountPaid,
                    total_amount: totalAmount,
                    balance_due: balanceDue,
                    payment_policy_snapshot: policySnapshot,
                    remainder_due_at: remainderDueAt
                }
            ])
            .select()
            .single();

        if (dbError || !reservation) {
            console.error("DEBUG: Supabase error:", dbError);
            return NextResponse.json(
                { error: "Failed to save reservation: " + dbError?.message },
                { status: 500 }
            );
        }

        // 6. Save Add-ons (New for Tier 3)
        // 3. Save Add-ons
        if (validAddons.length > 0) {
            const addonsToInsert = validAddons.map((addon) => ({
                reservation_id: reservation.id,
                addon_id: addon.id,
                quantity: addon.quantity,
                price_at_booking: addon.price
            }));

            const { error: addonError } = await supabaseAdmin
                .from('reservation_addons')
                .insert(addonsToInsert);

            if (addonError) {
                console.error("Error saving addons:", addonError);
            }
        }

        // 2. Insert Transaction Ledger
        if (paymentIntentId) {
            const { error: trxError } = await supabaseAdmin.from('payment_transactions').insert([{
                reservation_id: reservation.id,
                amount: amountPaid,
                currency: 'cad',
                type: paymentType,
                status: 'succeeded',
                stripe_payment_intent_id: paymentIntentId,
                metadata: { policy_snapshot: policySnapshot }
            }]);

            if (trxError) {
                console.error("Failed to insert transaction ledger:", trxError);
                // Don't fail the request, just log it. Data integrity issue but reservation is safe.
            }
        }

        console.log("DEBUG: Supabase insert successful");

        // Send confirmation emails ONLY for pay-in-person reservations
        // For Stripe payments, the webhook handles email sending (more reliable)
        if (paymentMethod === 'in-person') {
            const resend = new Resend(process.env.RESEND_API_KEY);

            try {
                console.log("DEBUG: Sending pay-in-person confirmation email...");
                console.log("DEBUG: RESEND_API_KEY configured:", !!process.env.RESEND_API_KEY);

            // Send email to admin
            const adminEmailResult = await resend.emails.send({
                from: "The Watershed Campground <onboarding@resend.dev>",
                to: ["info@thewatershedcampground.com"], // Replace with actual admin email
                replyTo: formData.email,
                subject: `New Reservation Request: ${escapeHtml(name)} (${escapeHtml(formData.checkIn)} to ${escapeHtml(formData.checkOut)})`,
                html: `
          <h1>New Reservation Request</h1>
          
          <h2>Guest Information</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(formData.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(formData.phone)}</p>
          <p><strong>Address:</strong> ${escapeHtml(formData.address1)}${formData.address2 ? `, ${escapeHtml(formData.address2)}` : ""}, ${escapeHtml(formData.city)}, ${escapeHtml(formData.postalCode)}</p>
          
          <h2>Reservation Details</h2>
          <p><strong>Dates:</strong> ${escapeHtml(formData.checkIn)} to ${escapeHtml(formData.checkOut)}</p>
          <p><strong>Party:</strong> ${escapeHtml(String(formData.adults))} Adults, ${escapeHtml(String(formData.children))} Children</p>
          <p><strong>Camping Unit:</strong> ${escapeHtml(formData.campingUnit)} (${escapeHtml(formData.rvLength)}${formData.rvYear ? `, ${escapeHtml(formData.rvYear)}` : ""})</p>
          
          <h2>Additional Info</h2>
          <p><strong>Heard About:</strong> ${escapeHtml(formData.hearAbout || "N/A")}</p>
          <p><strong>Preferred Contact:</strong> ${escapeHtml(formData.contactMethod)}</p>
          <p><strong>Comments:</strong> ${escapeHtml(formData.comments || "None")}</p>
        `,
            });
            console.log("DEBUG: Admin email sent successfully:", adminEmailResult);

            // Payment status message for guest email
            const paymentMessage = paymentStatus === 'pay_on_arrival'
                ? '<p><strong>Payment Method:</strong> Pay in person when you arrive (cash or card accepted)</p>'
                : paymentStatus === 'deposit_paid'
                ? `<p><strong>Deposit Received:</strong> $${amountPaid.toFixed(2)}<br><strong>Balance Due:</strong> $${balanceDue.toFixed(2)}</p>`
                : `<p><strong>Payment Received:</strong> $${amountPaid.toFixed(2)} - Thank you!</p>`;

            // Send confirmation to user with magic link
            const guestEmailResult = await resend.emails.send({
                from: "The Watershed Campground <onboarding@resend.dev>",
                to: [formData.email],
                subject: "Reservation Confirmed - The Watershed Campground",
                html: `
          <h1>Reservation Confirmed!</h1>
          <p>Hi ${escapeHtml(formData.firstName)},</p>
          <p>Great news! Your reservation for <strong>${escapeHtml(formData.checkIn)} to ${escapeHtml(formData.checkOut)}</strong> has been confirmed.</p>

          ${paymentMessage}

          <h2>Manage Your Reservation</h2>
          <p>You can view or cancel your reservation using this secure link:</p>
          <p><a href="${escapeHtml(manageUrl)}" style="display: inline-block; background-color: #0b3d2e; color: #e9dfc7; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Manage Reservation</a></p>
          <p style="color: #666; font-size: 14px;">Or copy this link: ${escapeHtml(manageUrl)}</p>
          <p style="color: #666; font-size: 14px;"><strong>Keep this link safe!</strong> Anyone with this link can view and manage your reservation.</p>

          <p>Best regards,<br>The Watershed Campground Team</p>
        `,
            });
                console.log("DEBUG: Guest confirmation email sent successfully:", guestEmailResult);
                console.log("DEBUG: Email sent to:", formData.email);

                // Mark email as sent
                await supabaseAdmin
                    .from('reservations')
                    .update({ email_sent_at: new Date().toISOString() })
                    .eq('id', reservation.id);

            } catch (emailError) {
                console.error("DEBUG: Email sending failed:", emailError);
                console.error("DEBUG: Email error details:", JSON.stringify(emailError, null, 2));
                // Don't fail the reservation - email is not critical for pay-in-person
            }
        }

        // For Stripe payments, return immediately - webhook will send email
        const message = paymentMethod === 'in-person'
            ? 'Reservation created. Confirmation email sent.'
            : 'Reservation created. Confirmation email will be sent once payment is processed.';

        return NextResponse.json({
            success: true,
            reservationId: reservation.id,
            message: message
        });
    } catch (error) {
        console.error("DEBUG: Uncaught error in API", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
