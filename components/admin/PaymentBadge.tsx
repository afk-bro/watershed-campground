type PaymentStatus = 'paid' | 'deposit_paid' | 'payment_due' | 'overdue' | 'failed' | 'refunded';

interface PaymentBadgeProps {
    status: PaymentStatus;
    amount?: number;
}

export default function PaymentBadge({ status, amount }: PaymentBadgeProps) {
    const config = {
        paid: {
            icon: '✅',
            label: 'Paid',
            className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
        },
        deposit_paid: {
            icon: '💳',
            label: 'Deposit Paid',
            className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50'
        },
        payment_due: {
            icon: '⚠️',
            label: 'Payment Due',
            className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50'
        },
        overdue: {
            icon: '⚠️',
            label: 'Overdue',
            className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50'
        },
        failed: {
            icon: '❌',
            label: 'Failed',
            className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
        },
        refunded: {
            icon: '↩',
            label: 'Refunded',
            className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/50'
        }
    };

    const { icon, label, className } = config[status];

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${className}`}>
            <span className="text-[11px] leading-none">{icon}</span>
            <span>{label}</span>
        </div>
    );
}
