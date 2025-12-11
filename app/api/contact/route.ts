import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactFormSchema } from "@/lib/schemas";
import { escapeHtml } from "@/lib/htmlEscape";

// Initialize Resend inside the handler to avoid build-time errors if key is missing
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate request body
        const result = contactFormSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { firstName, lastName, email, message } = result.data;
        const name = `${firstName} ${lastName}`; // Add name variable here

        // Check for API key
        if (!process.env.RESEND_API_KEY) {
            console.log("Mock Email Sending (RESEND_API_KEY missing):", {
                to: "info@thewatershedcampground.com",
                subject: `New Contact Inquiry from ${name}`,
                from: email,
                message,
            });
            return NextResponse.json({ success: true, message: "Mock email sent" });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

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

            return NextResponse.json({ success: true, data });
        } catch (emailError) {
            console.error("Resend error:", emailError);
            return NextResponse.json(
                { error: "Failed to send email" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Contact API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
