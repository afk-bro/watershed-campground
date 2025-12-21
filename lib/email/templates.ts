
interface EmailTemplateData {
    firstName: string;
    checkIn: string;
    checkOut: string;
    email: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    postalCode: string;
    adults: number;
    children: number;
    campingUnit: string;
    rvLength: string;
    rvYear?: string;
    hearAbout?: string;
    contactMethod: string;
    comments?: string;
    confirmationUrl: string;
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

export function generateAdminNotificationHtml(data: EmailTemplateData, name: string): string {
    return `
      <h1>New Reservation Request</h1>
      
      <h2>Guest Information</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
      <p><strong>Address:</strong> ${escapeHtml(data.address1)}${data.address2 ? `, ${escapeHtml(data.address2)}` : ""}, ${escapeHtml(data.city)}, ${escapeHtml(data.postalCode)}</p>
      
      <h2>Reservation Details</h2>
      <p><strong>Dates:</strong> ${escapeHtml(data.checkIn)} to ${escapeHtml(data.checkOut)}</p>
      <p><strong>Party:</strong> ${escapeHtml(String(data.adults))} Adults, ${escapeHtml(String(data.children))} Children</p>
      <p><strong>Camping Unit:</strong> ${escapeHtml(data.campingUnit)} (${escapeHtml(data.rvLength)}${data.rvYear ? `, ${escapeHtml(data.rvYear)}` : ""})</p>
      
      <h2>Additional Info</h2>
      <p><strong>Heard About:</strong> ${escapeHtml(data.hearAbout || "N/A")}</p>
      <p><strong>Preferred Contact:</strong> ${escapeHtml(data.contactMethod)}</p>
      <p><strong>Comments:</strong> ${escapeHtml(data.comments || "None")}</p>
    `;
}

export function generateGuestConfirmationHtml(
    data: EmailTemplateData,
    name: string,
    paymentStatus: string,
    amountPaid: number,
    balanceDue: number
): string {

    const paymentMessage = paymentStatus === 'pay_on_arrival'
        ? '<p><strong>Payment Method:</strong> Pay in person when you arrive (cash or card accepted)</p>'
        : paymentStatus === 'deposit_paid'
            ? `<p><strong>Deposit Received:</strong> $${amountPaid.toFixed(2)}<br><strong>Balance Due:</strong> $${balanceDue.toFixed(2)}</p>`
            : `<p><strong>Payment Received:</strong> $${amountPaid.toFixed(2)} - Thank you!</p>`;

    return `
      <h1>Reservation Confirmed!</h1>
      <p>Hi ${escapeHtml(data.firstName)},</p>
      <p>Great news! Your reservation for <strong>${escapeHtml(data.checkIn)} to ${escapeHtml(data.checkOut)}</strong> has been confirmed.</p>

      ${paymentMessage}

      <h2>Manage Your Reservation</h2>
      <p>You can view or cancel your reservation using this secure link:</p>
      <p><a href="${escapeHtml(data.confirmationUrl)}" style="display: inline-block; background-color: #0b3d2e; color: #e9dfc7; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Manage Reservation</a></p>
      <p style="color: #666; font-size: 14px;">Or copy this link: ${escapeHtml(data.confirmationUrl)}</p>
      <p style="color: #666; font-size: 14px;"><strong>Keep this link safe!</strong> Anyone with this link can view and manage your reservation.</p>

      <p>Best regards,<br>The Watershed Campground Team</p>
    `;
}
