import { Check, X, LogIn, LogOut } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/lib/supabase";
import type { LucideIcon } from "lucide-react";

type Props = {
    reservation: Reservation;
    updateStatus: (id: string, status: ReservationStatus) => void;
};

type ActionButtonProps = {
    onClick: () => void;
    icon: LucideIcon;
    colorClass: string;
    title: string;
};

function ActionButton({ onClick, icon: Icon, colorClass, title }: ActionButtonProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            title={title}
            className={`p-2 rounded-full transition-colors cursor-pointer ${colorClass}`}
        >
            <Icon size={16} />
        </button>
    );
}

export default function RowActions({ reservation, updateStatus }: Props) {
    const { id, status } = reservation;

    if (!id) return null;

    if (status === 'pending') {
        return (
            <div className="flex gap-2 justify-end">
                <ActionButton
                    onClick={() => updateStatus(id, 'confirmed')}
                    icon={Check}
                    colorClass="text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
                    title="Confirm Reservation"
                />
                <ActionButton
                    onClick={() => updateStatus(id, 'cancelled')}
                    icon={X}
                    colorClass="text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                    title="Cancel"
                />
            </div>
        );
    }

    if (status === 'confirmed') {
        return (
            <div className="flex gap-2 justify-end">
                <ActionButton
                    onClick={() => updateStatus(id, 'checked_in')}
                    icon={LogIn}
                    colorClass="text-blue-600 hover:bg-blue-200 hover:ring-1 hover:ring-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:ring-blue-600"
                    title="Check In"
                />
                <ActionButton
                    onClick={() => updateStatus(id, 'cancelled')}
                    icon={X}
                    colorClass="text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                    title="Cancel"
                />
            </div>
        );
    }

    if (status === 'checked_in') {
        return (
            <div className="flex gap-2 justify-end">
                 <ActionButton
                    onClick={() => updateStatus(id, 'checked_out')}
                    icon={LogOut}
                    colorClass="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    title="Check Out"
                />
            </div>
        );
    }

    // For checked_out / cancelled / no_show: no main actions for now
    return <span className="text-xs text-[var(--color-text-muted)] italic">--</span>;
}
