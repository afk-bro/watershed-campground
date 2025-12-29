/**
 * Payment Configuration
 *
 * Centralized payment status labels, icons, and styling variants.
 * Single source of truth for payment-related UI configuration.
 */

import type { PaymentStatus } from "@/lib/admin/reservations/listing";

export interface PaymentStatusConfig {
  icon: string;
  label: string;
  color: string;
}

/**
 * Payment status display configuration
 *
 * Maps payment statuses to their visual representation:
 * - icon: Emoji or symbol displayed
 * - label: Human-readable status text
 * - color: Tailwind CSS classes for text color (light + dark mode)
 */
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, PaymentStatusConfig> = {
  paid: {
    icon: '✓',
    label: 'Paid in full',
    color: 'text-green-600/60 dark:text-green-400/60'
  },
  deposit_paid: {
    icon: '💳',
    label: 'Deposit paid',
    color: 'text-blue-600/60 dark:text-blue-400/60'
  },
  payment_due: {
    icon: '⏳',
    label: 'Payment due',
    color: 'text-amber-600/80 dark:text-amber-400/80'
  },
  overdue: {
    icon: '⚠️',
    label: 'Payment overdue',
    color: 'text-red-600/80 dark:text-red-400/80'
  },
  failed: {
    icon: '✕',
    label: 'Payment failed',
    color: 'text-red-600/80 dark:text-red-400/80'
  },
  refunded: {
    icon: '↩',
    label: 'Refunded',
    color: 'text-gray-600/60 dark:text-gray-400/60'
  }
} as const;

/**
 * Get payment status configuration
 *
 * @param status - Payment status to look up
 * @returns Configuration object with icon, label, and color
 *
 * @example
 * ```tsx
 * const config = getPaymentStatusConfig('paid');
 * console.log(config.label); // "Paid in full"
 * ```
 */
export function getPaymentStatusConfig(status: PaymentStatus): PaymentStatusConfig {
  return PAYMENT_STATUS_CONFIG[status];
}
