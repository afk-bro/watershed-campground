import { escapeHtml } from "../htmlEscape";
import { format, parseISO } from "date-fns";

type CancellationEmailParams = {
    guestFirstName: string;
    campsiteName: string;
    checkIn: string;
    checkOut: string;
    refundAmount?: number;
};

export function generateCancellationEmail(params: CancellationEmailParams): {
    subject: string;
    html: string;
} {
    const {
        guestFirstName,
        campsiteName,
        checkIn,
        checkOut,
        refundAmount
    } = params;

    // Format dates
    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'N/A';
            return format(parseISO(dateStr), "EEE, MMM d, yyyy");
        } catch {
            return dateStr;
        }
    };

    const subject = "Reservation Cancelled - Watershed Campground";

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #991b1b; margin-bottom: 24px;">Reservation Cancelled</h1>

      <p>Hi ${escapeHtml(guestFirstName)},</p>

      <p>This email confirms that your reservation at The Watershed Campground has been cancelled.</p>

      <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #374151;">Cancelled Details</h3>
        <p style="margin: 8px 0;"><strong>Campsite:</strong> ${escapeHtml(campsiteName)}</p>
        <p style="margin: 8px 0;"><strong>Check-in:</strong> ${formatDate(checkIn)}</p>
        <p style="margin: 8px 0;"><strong>Check-out:</strong> ${formatDate(checkOut)}</p>
      </div>

      ${refundAmount !== undefined && refundAmount > 0
            ? `<p>A refund of <strong>$${refundAmount.toFixed(2)}</strong> has been processed to your original payment method. Please allow 5-10 business days for this to appear on your statement.</p>`
            : ''}

      <p style="margin-top: 24px;">We hope to have the opportunity to host you in the future.</p>

      <p style="margin-top: 32px;">Best regards,<br>The Watershed Campground Team</p>
    </div>
  `;

    return { subject, html };
}
