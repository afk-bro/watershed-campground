import type { ReservationStatus } from "@/lib/supabase";

type Props = {
    status: ReservationStatus;
};

export default function StatusPill({ status }: Props) {
    const labelMap: Record<ReservationStatus, string> = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        checked_in: 'Checked In',
        checked_out: 'Checked Out',
        no_show: 'No Show',
    };

    // Muted/Subtle Styles (Pastel backgrounds + darker text)
    const colorClasses: Record<ReservationStatus, string> = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        confirmed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        cancelled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50',
        checked_in: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        checked_out: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        no_show: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${colorClasses[status]}`}>
            {labelMap[status]}
        </span>
    );
}
