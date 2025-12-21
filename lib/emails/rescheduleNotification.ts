import { escapeHtml } from "../htmlEscape";
import { format, parseISO, differenceInDays } from "date-fns";

type RescheduleEmailParams = {
  guestFirstName: string;
  oldCampsiteName: string;
  newCampsiteName: string;
  oldCheckIn: string;
  oldCheckOut: string;
  newCheckIn: string;
  newCheckOut: string;
  manageUrl: string;
};

export function generateRescheduleEmail(params: RescheduleEmailParams): {
  subject: string;
  html: string;
} {
  const {
    guestFirstName,
    oldCampsiteName,
    newCampsiteName,
    oldCheckIn,
    oldCheckOut,
    newCheckIn,
    newCheckOut,
    manageUrl,
  } = params;

  // Format dates with timezone and day of week
  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "EEE, MMM d, yyyy");
  };

  // Calculate nights
  const oldNights = differenceInDays(parseISO(oldCheckOut), parseISO(oldCheckIn));
  const newNights = differenceInDays(parseISO(newCheckOut), parseISO(newCheckIn));

  const subject = "Your Watershed Campground Reservation Has Been Updated";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0b3d2e; margin-bottom: 24px;">Reservation Updated</h1>

      <p>Hi ${escapeHtml(guestFirstName)},</p>

      <p>Your reservation has been rescheduled by our team. Here are the updated details:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;"></th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Previous</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #c8a75a;">Updated</th>
          </tr>
        </thead>
        <tbody>
          ${
            oldCampsiteName !== newCampsiteName
              ? `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Campsite</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
              oldCampsiteName
            )}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #c8a75a; font-weight: bold;">${escapeHtml(
              newCampsiteName
            )}</td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Campsite</td>
            <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
              oldCampsiteName
            )}</td>
          </tr>
          `
          }
          ${
            oldCheckIn !== newCheckIn
              ? `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Check-in</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(
              oldCheckIn
            )}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #c8a75a; font-weight: bold;">${formatDate(
              newCheckIn
            )}</td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Check-in</td>
            <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(
              oldCheckIn
            )}</td>
          </tr>
          `
          }
          ${
            oldCheckOut !== newCheckOut
              ? `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Check-out</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(
              oldCheckOut
            )}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #c8a75a; font-weight: bold;">${formatDate(
              newCheckOut
            )}</td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Check-out</td>
            <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(
              oldCheckOut
            )}</td>
          </tr>
          `
          }
          ${
            oldNights !== newNights
              ? `
          <tr>
            <td style="padding: 12px; font-weight: bold;">Nights</td>
            <td style="padding: 12px;">${oldNights} ${
                  oldNights === 1 ? "night" : "nights"
                }</td>
            <td style="padding: 12px; color: #c8a75a; font-weight: bold;">${newNights} ${
                  newNights === 1 ? "night" : "nights"
                }</td>
          </tr>
          `
              : `
          <tr>
            <td style="padding: 12px; font-weight: bold;">Nights</td>
            <td colspan="2" style="padding: 12px;">${oldNights} ${
                  oldNights === 1 ? "night" : "nights"
                }</td>
          </tr>
          `
          }
        </tbody>
      </table>

      <p style="margin-top: 24px;">If you have any questions about this change, please contact us.</p>

      <h2 style="color: #0b3d2e; margin-top: 32px; margin-bottom: 16px;">Manage Your Reservation</h2>
      <p>You can view your updated reservation details using this secure link:</p>
      <p>
        <a href="${escapeHtml(
          manageUrl
        )}" style="display: inline-block; background-color: #0b3d2e; color: #e9dfc7; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Reservation
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">Or copy this link: ${escapeHtml(
        manageUrl
      )}</p>

      <p style="margin-top: 32px;">Best regards,<br>The Watershed Campground Team</p>

      <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        This is an automated notification. If you did not expect this change, please contact us immediately.
      </p>
    </div>
  `;

  return { subject, html };
}
