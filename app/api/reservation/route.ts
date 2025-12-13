import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { reservationFormSchema } from "@/lib/schemas";
import { supabase } from "@/lib/supabase";
import { escapeHtml } from "@/lib/htmlEscape";
import { checkAvailability } from "@/lib/availability";
import { createClient } from "@supabase/supabase-js";

// Create service role client for server-side operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

function generateToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 64-char random string
}

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
    console.log("DEBUG: Reservation API Hit");
    try {
        const body = await request.json();
        console.log("DEBUG: Received body", body);

        // Validate request body
        const result = reservationFormSchema.safeParse(body);
        if (!result.success) {
            console.error("DEBUG: Validation failed", result.error.flatten());
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const formData = result.data;
        const name = `${formData.firstName} ${formData.lastName}`;

        // CRITICAL: Check availability before creating reservation
        console.log("DEBUG: Checking availability...");
        const totalGuests = formData.adults + formData.children;
        const availabilityResult = await checkAvailability({
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guestCount: totalGuests,
        });

        if (!availabilityResult.available || !availabilityResult.recommendedSiteId) {
            console.log("DEBUG: No campsites available");
            return NextResponse.json(
                {
                    error: "No availability",
                    message: availabilityResult.message || "No campsites available for the selected dates. Please try different dates or contact us directly.",
                },
                { status: 400 }
            );
        }

        console.log("DEBUG: Campsite available, assigned:", availabilityResult.recommendedSiteId);

        // Generate magic link token
        const rawToken = generateToken();
        const tokenHash = hashToken(rawToken);

        // Save to Supabase (using service role to bypass RLS)
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
                    status: 'pending',
                    public_edit_token_hash: tokenHash,
                    campsite_id: availabilityResult.recommendedSiteId, // Auto-assigned campsite
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
        console.log("DEBUG: Supabase insert successful");

        // Generate magic link for guest to manage their reservation
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const manageUrl = `${baseUrl}/manage-reservation?rid=${reservation.id}&t=${rawToken}`;

        // Check for API key
        if (!process.env.RESEND_API_KEY) {
            console.log("DEBUG: Mock Reservation Email (RESEND_API_KEY missing)");
            return NextResponse.json({ success: true, message: "Mock email sent" });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        try {
            console.log("DEBUG: Sending emails via Resend...");
            // Send email to admin
            await resend.emails.send({
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
            console.log("DEBUG: Admin email sent");

            // Send confirmation to user with magic link
            await resend.emails.send({
                from: "The Watershed Campground <onboarding@resend.dev>",
                to: [formData.email],
                subject: "We received your reservation request",
                html: `
          <h1>Reservation Request Received</h1>
          <p>Hi ${escapeHtml(formData.firstName)},</p>
          <p>Thanks for your reservation request! We have received your details for <strong>${escapeHtml(formData.checkIn)} to ${escapeHtml(formData.checkOut)}</strong>.</p>
          <p>This is <strong>not</strong> a confirmation of your booking. We will review availability and contact you via ${escapeHtml(formData.contactMethod.toLowerCase())} shortly to confirm details and arrange deposit.</p>

          <h2>Manage Your Reservation</h2>
          <p>You can view or cancel your reservation using this secure link:</p>
          <p><a href="${escapeHtml(manageUrl)}" style="display: inline-block; background-color: #0b3d2e; color: #e9dfc7; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Manage Reservation</a></p>
          <p style="color: #666; font-size: 14px;">Or copy this link: ${escapeHtml(manageUrl)}</p>
          <p style="color: #666; font-size: 14px;"><strong>Keep this link safe!</strong> Anyone with this link can view and manage your reservation.</p>

          <p>Best regards,<br>The Watershed Campground Team</p>
        `,
            });
            console.log("DEBUG: User confirmation email sent");

            return NextResponse.json({ success: true });
        } catch (emailError) {
            console.error("DEBUG: Resend error:", emailError);
            return NextResponse.json(
                { error: "Failed to send email" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("DEBUG: Uncaught error in API", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
