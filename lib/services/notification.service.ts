/**
 * Notification Service
 *
 * Centralized email notification logic for reservation-related communications.
 * Handles confirmation emails, update notifications, and cancellation notices.
 */

import { getResendClient } from "@/lib/services/email.service";
import { generateRescheduleEmail } from "@/lib/emails/rescheduleNotification";
import { generateCancellationEmail } from "@/lib/emails/cancellationConfirmation";
import { generateGuestConfirmationHtml } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

/**
 * Email notification types
 */
export type EmailNotificationType =
  | 'reservation_confirmation'
  | 'reservation_update'
  | 'reservation_cancellation';

/**
 * Details about changes made to a reservation
 */
export interface ReservationChangeDetails {
  oldCampsite?: string;
  newCampsite?: string;
  oldCheckIn?: string;
  newCheckIn?: string;
  oldCheckOut?: string;
  newCheckOut?: string;
}

/**
 * Reservation data needed for email notifications
 */
export interface EmailReservationData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  check_in: string;
  check_out: string;
  guest_count?: number;
  campsite?: {
    name: string;
    code: string;
  };
}

/**
 * Payment context for confirmation emails
 */
export interface PaymentContext {
  paymentStatus: 'paid' | 'deposit_paid' | 'pay_on_arrival';
  amountPaid: number;
  balanceDue: number;
}

/**
 * Parameters for sending reservation notifications
 */
export interface EmailNotificationParams {
  type: EmailNotificationType;
  reservation: EmailReservationData;
  changeDetails?: ReservationChangeDetails;
  paymentContext?: PaymentContext;
  manageUrl?: string;
}

/**
 * Result of email notification attempt
 */
export interface EmailResult {
  sent: boolean;
  error?: unknown;
}

/**
 * Generate email content based on notification type
 */
function generateEmailContent(
  params: EmailNotificationParams,
  baseUrl: string
): { subject: string; html: string } | null {
  const { type, reservation, changeDetails, paymentContext } = params;

  // Use provided manageUrl or construct default
  const manageUrl = params.manageUrl || `${baseUrl}/manage-reservation?rid=${reservation.id}`;

  switch (type) {
    case 'reservation_confirmation': {
      if (!paymentContext) {
        logger.error('Payment context required for confirmation email');
        return null;
      }

      // Create confirmation email data structure
      const confirmationData = {
        firstName: reservation.first_name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        confirmationUrl: manageUrl,
        // Additional fields required by template but not used in this context
        email: reservation.email,
        phone: '',
        address1: '',
        city: '',
        postalCode: '',
        adults: 0,
        children: 0,
        campingUnit: '',
        rvLength: '',
        contactMethod: ''
      };

      return {
        subject: 'Reservation Confirmed - Watershed Campground',
        html: generateGuestConfirmationHtml(
          confirmationData,
          reservation.first_name,
          paymentContext.paymentStatus,
          paymentContext.amountPaid,
          paymentContext.balanceDue
        )
      };
    }

    case 'reservation_update': {
      if (!changeDetails) {
        logger.error('Change details required for update email');
        return null;
      }

      const oldCampsiteName = changeDetails.oldCampsite || reservation.campsite?.name || 'Unassigned';
      const newCampsiteName = changeDetails.newCampsite || reservation.campsite?.name || 'Unassigned';
      const oldCheckIn = changeDetails.oldCheckIn || reservation.check_in;
      const oldCheckOut = changeDetails.oldCheckOut || reservation.check_out;

      return generateRescheduleEmail({
        guestFirstName: reservation.first_name,
        oldCampsiteName,
        newCampsiteName,
        oldCheckIn,
        oldCheckOut,
        newCheckIn: reservation.check_in,
        newCheckOut: reservation.check_out,
        manageUrl
      });
    }

    case 'reservation_cancellation': {
      const campsiteName = changeDetails?.oldCampsite || reservation.campsite?.name || 'Unassigned';
      const checkIn = changeDetails?.oldCheckIn || reservation.check_in;
      const checkOut = changeDetails?.oldCheckOut || reservation.check_out;

      return generateCancellationEmail({
        guestFirstName: reservation.first_name,
        campsiteName,
        checkIn,
        checkOut,
        refundAmount: 0 // TODO: Add refund calculation when implemented
      });
    }

    default:
      logger.error(`Unknown email notification type: ${type}`);
      return null;
  }
}

/**
 * Send a reservation notification email
 *
 * @param params - Email notification parameters
 * @returns Result indicating success or failure
 */
export async function sendReservationNotification(
  params: EmailNotificationParams
): Promise<EmailResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Generate email content
    const emailContent = generateEmailContent(params, baseUrl);
    if (!emailContent) {
      return {
        sent: false,
        error: new Error('Failed to generate email content')
      };
    }

    // Get Resend client
    const resend = getResendClient();

    // Send email
    await resend.emails.send({
      from: "The Watershed Campground <onboarding@resend.dev>",
      to: [params.reservation.email],
      subject: emailContent.subject,
      html: emailContent.html
    });

    logger.info(`Sent ${params.type} email to ${params.reservation.email} for reservation ${params.reservation.id}`);

    return {
      sent: true
    };
  } catch (error) {
    logger.error(`Failed to send ${params.type} email:`, error);
    return {
      sent: false,
      error
    };
  }
}

/**
 * Determine if a notification should be sent based on changes
 *
 * @param oldReservation - Previous reservation state
 * @param newReservation - Updated reservation state
 * @returns Notification type or null if no notification needed
 */
export function shouldSendNotification(
  oldReservation: {
    status: string;
    campsite_id: string | null;
    check_in: string;
    check_out: string;
  },
  newReservation: {
    status: string;
    campsite_id: string | null;
    check_in: string;
    check_out: string;
  }
): EmailNotificationType | null {
  // Check for cancellation
  if (newReservation.status === 'cancelled' && oldReservation.status !== 'cancelled') {
    return 'reservation_cancellation';
  }

  // Check for date changes
  const datesChanged =
    oldReservation.check_in !== newReservation.check_in ||
    oldReservation.check_out !== newReservation.check_out;

  // Check for campsite changes
  const campsiteChanged = oldReservation.campsite_id !== newReservation.campsite_id;

  // Send update notification if dates or campsite changed
  if (datesChanged || campsiteChanged) {
    return 'reservation_update';
  }

  return null;
}
