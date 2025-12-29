import { contactFormSchema } from "@/lib/schemas";
import { escapeHtml } from "@/lib/htmlEscape";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, validationError } from "@/lib/api-helpers";
import { getResendClient, isResendConfigured } from "@/lib/services/email.service";
import {
    checkRateLimit,
    getRateLimitHeaders,
    getClientIp,
    createIpIdentifier,
    rateLimiters
} from "@/lib/rate-limit-upstash";

export async function POST(request: Request) {
    try {
        // Rate Limiting (3 requests per 5 minutes per IP - spam prevention)
        const ip = getClientIp(request);
        const identifier = createIpIdentifier(ip, 'contact-form');
        const rateLimit = await checkRateLimit(identifier, rateLimiters.contactForm);

        if (!rateLimit.success) {
            return errorResponse(
                "Too many contact requests. Please try again later.",
                429,
                getRateLimitHeaders(rateLimit)
            );
        }

        const body = await request.json();

        // Validate request body
        const result = contactFormSchema.safeParse(body);
        if (!result.success) {
            return validationError(result.error);
        }

        const { firstName, lastName, email, message } = result.data;
        const name = `${firstName} ${lastName}`; // Add name variable here

        // Check for API key
        if (!isResendConfigured()) {
            logger.warn("Mock email sending - RESEND_API_KEY not configured", {
                to: "info@thewatershedcampground.com",
                subject: `New Contact Inquiry from ${name}`,
                from: email,
                message,
            });
            return successResponse({ success: true, message: "Mock email sent" });
        }

        const resend = getResendClient();

        try {
            const data = await resend.emails.send({
                from: "The Watershed Campground <onboarding@resend.dev>",
                to: ["info@thewatershedcampground.com"], // Replace with actual admin email
                replyTo: email,
                subject: `New Contact Inquiry from ${escapeHtml(name)}`,
                html: `
          <h1>New Contact Inquiry</h1>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
            });

            return successResponse({ success: true, data });
        } catch (emailError) {
            logger.error("Failed to send contact email via Resend", emailError, {
                name,
                email,
            });
            return errorResponse("Failed to send email", 500);
        }
    } catch (error) {
        logger.error("Contact form API error", error);
        return errorResponse("Internal server error", 500);
    }
}
