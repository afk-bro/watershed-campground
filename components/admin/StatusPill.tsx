import { CheckCircle2, Clock, XCircle, LogIn, LogOut, HelpCircle, type LucideIcon } from "lucide-react";
import type { ReservationStatus } from "@/lib/supabase";

type Props = {
    status: ReservationStatus;
};

export default function StatusPill({ status }: Props) {
    const config: Record<ReservationStatus, { label: string; icon: LucideIcon; classes: string }> = {
        pending: {
            label: 'Pending',
            icon: Clock,
            classes: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
        },
        confirmed: {
            label: 'Confirmed',
            icon: CheckCircle2,
            classes: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
        },
        cancelled: {
            label: 'Cancelled',
            icon: XCircle,
            classes: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30'
        },
        checked_in: {
            label: 'Checked In',
            icon: LogIn,
            classes: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
        },
        checked_out: {
            label: 'Checked Out',
            icon: LogOut,
            classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        },
        no_show: {
            label: 'No Show',
            icon: HelpCircle,
            classes: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
        },
    };

    const { label, icon: Icon, classes } = config[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[10px] uppercase font-bold tracking-wide border w-[110px] justify-center ${classes}`}>
            <Icon size={12} className="shrink-0" />
            {label}
        </span>
    );
}
