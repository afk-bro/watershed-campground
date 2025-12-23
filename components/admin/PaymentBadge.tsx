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
            className: 'bg-green-500/10 text-green-600 dark:text-green-400'
        },
        deposit_paid: {
            icon: '💳',
            label: 'Deposit',
            className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        },
        payment_due: {
            icon: '⏳',
            label: 'Due',
            className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
        },
        overdue: {
            icon: '!',
            label: 'Overdue',
            className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
        },
        failed: {
            icon: '✕',
            label: 'Failed',
            className: 'bg-red-500/10 text-red-600 dark:text-red-400'
        },
        refunded: {
            icon: '↩',
            label: 'Refund',
            className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
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
