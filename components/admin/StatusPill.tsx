import { memo } from "react";
import { CheckCircle2, Clock, XCircle, LogIn, LogOut, HelpCircle, type LucideIcon } from "lucide-react";
import type { ReservationStatus } from "@/lib/supabase";

type Props = {
    status: ReservationStatus;
};

const StatusPill = memo(function StatusPill({ status }: Props) {
    const config: Record<ReservationStatus, { label: string; icon: LucideIcon; classes: string }> = {
        pending: {
            label: 'Pending',
            icon: Clock,
            classes: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)] border-[var(--color-status-pending-border)]'
        },
        confirmed: {
            label: 'Confirmed',
            icon: CheckCircle2,
            classes: 'bg-[var(--color-status-confirmed-bg)] text-[var(--color-status-confirmed)] border-[var(--color-status-confirmed-border)]'
        },
        cancelled: {
            label: 'Cancelled',
            icon: XCircle,
            classes: 'bg-[var(--color-status-cancelled-bg)] text-[var(--color-status-cancelled)] border-[var(--color-status-cancelled-border)]'
        },
        checked_in: {
            label: 'Checked In',
            icon: LogIn,
            classes: 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border-[var(--color-status-active-border)]'
        },
        checked_out: {
            label: 'Checked Out',
            icon: LogOut,
            classes: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)] border-[var(--color-status-neutral-border)]'
        },
        no_show: {
            label: 'No Show',
            icon: HelpCircle,
            classes: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)] border-[var(--color-status-neutral-border)]'
        },
    };

    const { label, icon: Icon, classes } = config[status];

    return (
        <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[9px] uppercase font-bold tracking-wide border ${classes}`}>
            <Icon size={11} className="shrink-0" />
            {label}
        </span>
    );
});

export default StatusPill;
