import type { ReservationStatus } from "@/lib/supabase";

type Props = {
    status: ReservationStatus;
};

export default function StatusPill({ status }: Props) {
    const labelMap: Record<ReservationStatus, string> = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        checked_in: 'Checked in',
        checked_out: 'Checked out',
        no_show: 'No show',
    };

    const colorClasses: Record<ReservationStatus, string> = {
        pending: 'bg-amber-100 text-amber-800',
        confirmed: 'bg-emerald-100 text-emerald-800',
        cancelled: 'bg-rose-100 text-rose-800',
        checked_in: 'bg-blue-100 text-blue-800',
        checked_out: 'bg-slate-200 text-slate-700',
        no_show: 'bg-zinc-200 text-zinc-800',
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[status]}`}>
            {labelMap[status]}
        </span>
    );
}
