type PaymentStatus = 'paid' | 'deposit_paid' | 'payment_due' | 'overdue' | 'failed' | 'refunded';

interface PaymentBadgeProps {
    status: PaymentStatus;
    amount?: number;
}

export default function PaymentBadge({ status, amount }: PaymentBadgeProps) {
    const config = {
        paid: {
            icon: '✓',
            label: 'Paid',
            className: 'bg-[var(--color-status-confirmed-bg)] text-[var(--color-status-confirmed)]'
        },
        deposit_paid: {
            icon: '💳',
            label: 'Deposit',
            className: 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)]'
        },
        payment_due: {
            icon: '⏳',
            label: 'Due',
            className: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)]'
        },
        overdue: {
            icon: '!',
            label: 'Overdue',
            className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
        },
        failed: {
            icon: '✕',
            label: 'Failed',
            className: 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
        },
        refunded: {
            icon: '↩',
            label: 'Refund',
            className: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)]'
        }
    };

    const { icon, label, className } = config[status];

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
            <span className="text-[11px] leading-none">{icon}</span>
            <span>{label}</span>
        </span>
    );
}
