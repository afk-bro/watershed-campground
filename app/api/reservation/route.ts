import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkAvailability } from "@/lib/availability/engine";
import { calculateTotal } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { reservationFormSchema } from "@/lib/reservation/validation";
import { createReservationRecord, type AuditContext } from "@/lib/reservation/reservation-service";
import { generateAdminNotificationHtml, generateGuestConfirmationHtml } from "@/lib/email/templates";
import { requireAdmin } from "@/lib/admin-auth";
import { getBaseUrl } from "@/lib/url-utils";
import { checkRateLimit, rateLimiters, getClientIp, createIpIdentifier, getRateLimitHeaders } from "@/lib/rate-limit-upstash";
import { resolvePublicOrganizationId } from "@/lib/tenancy/resolve-public-org";
import { logger } from "@/lib/logger";
import {
    verifyPaymentIntent,
    determinePaymentStatus
} from "@/lib/services/payment.service";
import { validationError } from "@/lib/api-helpers";

export async function POST(request: Request) {
    try {
        // 0. Rate Limiting
        const ip = getClientIp(request);
        const rlResult = await checkRateLimit(
            createIpIdentifier(ip, 'reservation_create'),
            rateLimiters.reservationCreate
        );

        if (!rlResult.success) {
            logger.warn(`[RateLimit] Blocked reservation attempt from ${ip}`);
            return NextResponse.json(
                { error: "Too many reservation attempts. Please try again later." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rlResult)
                }
            );
        }

        // 0.5. Org Resolution (CRITICAL - before any queries)
        const organizationId = await resolvePublicOrganizationId(request);
        if (!organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const baseUrl = getBaseUrl();
        const manageUrl = `${baseUrl}/manage-reservation`;

        const body = await request.json();
        const { paymentIntentId, paymentMethod, ...formDataRaw } = body;

        // 1. Validation
        const result = reservationFormSchema.safeParse(formDataRaw);
        if (!result.success) {
            return validationError(result.error);
        }
        const formData = result.data;

        // Security: Admin-only override flags - REJECT for non-admins
        const hasAdminOverrides = formData.forceConflict || formData.overrideBlackout || formData.isOffline || formData.overrideReason;
        if (hasAdminOverrides) {
            const { authorized } = await requireAdmin();
            if (!authorized) {
                // Explicit rejection: public users cannot use override flags
                return NextResponse.json(
                    { error: "Unauthorized: admin-only parameters detected" },
                    { status: 403 }
                );
            }
        }

        // 2. Retrieve Payment Intent & Campsite
        let paymentIntent: Awaited<ReturnType<typeof verifyPaymentIntent>>["paymentIntent"] | undefined;
        let recommendedSiteId: string;

        if (paymentIntentId) {
            const verification = await verifyPaymentIntent(paymentIntentId);
            if (!verification.success) {
                return NextResponse.json({ error: verification.error || "Payment verification failed" }, { status: 400 });
            }
            paymentIntent = verification.paymentIntent;
            recommendedSiteId = verification.campsiteId!;
        } else {
            // Check availability for non-prepaid bookings
            // Admin overrides handled at route layer (already guarded above)
            if (formData.forceConflict || formData.overrideBlackout) {
                // Admin is forcing availability - skip engine check
                if (!formData.campsiteId) {
                    return NextResponse.json(
                        { error: "Campsite ID required when using admin overrides" },
                        { status: 400 }
                    );
                }
                recommendedSiteId = formData.campsiteId;
            } else {
                // Normal availability check using new engine (org-scoped)
                const availabilityResult = await checkAvailability({
                    checkIn: formData.checkIn,
                    checkOut: formData.checkOut,
                    guestCount: formData.adults + formData.children,
                    campsiteId: formData.campsiteId,
                    organizationId
                });

                if (!availabilityResult.available || !availabilityResult.recommendedSiteId) {
                    return NextResponse.json(
                        { error: availabilityResult.message || "Dates no longer available." },
                        { status: 400 }
                    );
                }
                recommendedSiteId = availabilityResult.recommendedSiteId;
            }
        }

        // 3. Calculate Totals
        const { data: campsite } = await supabaseAdmin
            .from("campsites")
            .select("base_rate, id")
            .eq("id", recommendedSiteId)
            .single();

        if (!campsite) return NextResponse.json({ error: "Campsite not found" }, { status: 500 });

        const siteTotal = calculateTotal(campsite.base_rate, formData.checkIn, formData.checkOut);

        // Verify Add-on Prices
        let addonsTotal = 0;
        let validAddons: Array<{ id: string; quantity: number; price: number }> = [];
        if (Array.isArray(formData.addons) && formData.addons.length > 0) {
            type DbAddon = { id: string; price: number };
            const addonIds = formData.addons
                .filter((a: unknown): a is { id: string; quantity: number } => {
                    return !!a && typeof a === 'object' && 'id' in (a as Record<string, unknown>) && 'quantity' in (a as Record<string, unknown>);
                })
                .map(a => a.id);

            const { data: dbAddons } = await supabaseAdmin
                .from('addons')
                .select('id, price')
                .in('id', addonIds);

            if (Array.isArray(dbAddons)) {
                const dbIndex = new Map<string, number>(dbAddons.map((d: DbAddon) => [d.id, d.price]));
                validAddons = formData.addons
                    .filter((item: unknown): item is { id: string; quantity: number } => {
                        return !!item && typeof item === 'object' && 'id' in (item as Record<string, unknown>) && 'quantity' in (item as Record<string, unknown>);
                    })
                    .map((item) => {
                        const price = dbIndex.get(item.id);
                        return typeof price === 'number' ? { id: item.id, quantity: item.quantity, price } : null;
                    })
                    .filter((x): x is { id: string; quantity: number; price: number } => x !== null);
                addonsTotal = validAddons.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
        }
        formData.addons = validAddons; // Use verified addons
        const totalAmount = siteTotal + addonsTotal;

        // 4. Determine Payment Status
        const paymentContext = await determinePaymentStatus({
            paymentIntent,
            paymentMethod,
            totalAmount,
            checkIn: formData.checkIn,
            isOffline: formData.isOffline
        });

        // Add payment intent ID to context
        if (paymentIntentId) {
            paymentContext.paymentIntentId = paymentIntentId;
        }

        // 5. Create Reservation with audit context
        const auditContext: AuditContext = {
            source: 'web',
            userAgent: request.headers.get('user-agent') || undefined,
            // Note: IP hash could be added here with req.headers.get('x-forwarded-for') if needed
        };

        const { reservation, rawToken } = await createReservationRecord(
            { supabase: supabaseAdmin },
            formData,
            recommendedSiteId,
            { siteTotal, addonsTotal, totalAmount },
            paymentContext,
            organizationId,
            auditContext
        );

        // Construct magic link with properly encoded query parameters
        const magicLinkUrl = `${manageUrl}?rid=${encodeURIComponent(reservation.id)}&t=${encodeURIComponent(rawToken)}`;

        // 6. Send Emails (Async, don't block response)
        // Only sending critical emails here. Stripe webhooks handle the rest usually, but keeping pay-in-person/offline logic.
        const shouldSendEmail = (paymentMethod === 'in-person') || (formData.isOffline && formData.sendGuestEmail);

        if (shouldSendEmail) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const name = `${formData.firstName} ${formData.lastName}`;

            try {
                // Admin Notification
                await resend.emails.send({
                    from: "The Watershed Campground <onboarding@resend.dev>",
                    to: ["info@thewatershedcampground.com"],
                    replyTo: formData.email,
                    subject: `New Reservation Request: ${name}`,
                    html: generateAdminNotificationHtml({ ...formData, confirmationUrl: magicLinkUrl }, name)
                });

                // Guest Confirmation
                await resend.emails.send({
                    from: "The Watershed Campground <onboarding@resend.dev>",
                    to: [formData.email],
                    subject: "Reservation Confirmed",
                    html: generateGuestConfirmationHtml(
                        { ...formData, confirmationUrl: magicLinkUrl },
                        formData.firstName,
                        paymentContext.paymentStatus,
                        paymentContext.amountPaid,
                        paymentContext.balanceDue
                    )
                });
            } catch (emailError) {
                // Log email failure but don't fail the entire request
                logger.error("Failed to send reservation emails:", emailError);
                // Note: The reservation was successfully created, but email failed
                // Consider implementing a retry mechanism or background job
            }

            // Update email sent status
            await supabaseAdmin.from('reservations').update({ email_sent_at: new Date().toISOString() }).eq('id', reservation.id);
        }

        return NextResponse.json({
            success: true,
            reservationId: reservation.id,
            message: "Reservation confirmed"
        });

    } catch (error) {
        logger.error("Reservation API Error:", error, {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
        });

        // Return more helpful error message
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({
            error: "Failed to create reservation",
            details: process.env.NODE_ENV === 'production' ? undefined : errorMessage
        }, { status: 500 });
    }
}
