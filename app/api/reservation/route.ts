import { NextResponse } from "next/server";
import { Resend } from "resend";
import { reservationFormSchema } from "@/lib/schemas";
import { escapeHtml } from "@/lib/htmlEscape";

// Initialize Resend inside the handler to avoid build-time errors if key is missing
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate request body
        const result = reservationFormSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const formData = result.data;
        const name = `${formData.firstName} ${formData.lastName}`;

        // Check for API key
        if (!process.env.RESEND_API_KEY) {
            console.log("Mock Reservation Email (RESEND_API_KEY missing):", formData);
            return NextResponse.json({ success: true, message: "Mock email sent" });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        try {
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
          <p><strong>Heard About:</strong> ${escapeHtml(formData.hearAbout) || "N/A"}</p>
          <p><strong>Preferred Contact:</strong> ${escapeHtml(formData.contactMethod)}</p>
          <p><strong>Comments:</strong> ${escapeHtml(formData.comments) || "None"}</p>
        `,
            });

            // Send confirmation to user (optional)
            await resend.emails.send({
                from: "The Watershed Campground <onboarding@resend.dev>",
                to: [formData.email],
                subject: "We received your reservation request",
                html: `
          <h1>Reservation Request Received</h1>
          <p>Hi ${escapeHtml(formData.firstName)},</p>
          <p>Thanks for your reservation request! We have received your details for <strong>${escapeHtml(formData.checkIn)} to ${escapeHtml(formData.checkOut)}</strong>.</p>
          <p>This is <strong>not</strong> a confirmation of your booking. We will review availability and contact you via ${escapeHtml(formData.contactMethod.toLowerCase())} shortly to confirm details and arrange deposit.</p>
          <p>Best regards,<br>The Watershed Campground Team</p>
        `,
            });

            return NextResponse.json({ success: true });
        } catch (emailError) {
            console.error("Resend error:", emailError);
            return NextResponse.json(
                { error: "Failed to send email" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Reservation API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
