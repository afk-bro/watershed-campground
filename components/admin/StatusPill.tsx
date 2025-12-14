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
        pending: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)] border border-[var(--color-status-pending)]/20',
        confirmed: 'bg-[var(--color-status-confirmed-bg)] text-[var(--color-status-confirmed)] border border-[var(--color-status-confirmed)]/20',
        cancelled: 'bg-[var(--color-status-cancelled-bg)] text-[var(--color-status-cancelled)] border border-[var(--color-status-cancelled)]/20',
        checked_in: 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border border-[var(--color-status-active)]/20',
        checked_out: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)] border border-[var(--color-status-neutral)]/20',
        no_show: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)] border border-[var(--color-status-neutral)]/30 opacity-80',
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[status]}`}>
            {labelMap[status]}
        </span>
    );
}
