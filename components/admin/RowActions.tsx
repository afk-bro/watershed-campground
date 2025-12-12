import type { Reservation, ReservationStatus } from "@/lib/supabase";

type Props = {
    reservation: Reservation;
    updateStatus: (id: string, status: ReservationStatus) => void;
};

export default function RowActions({ reservation, updateStatus }: Props) {
    const { id, status } = reservation;

    if (!id) return null;

    if (status === 'pending') {
        return (
            <div className="flex gap-2">
                <button
                    onClick={() => updateStatus(id, 'confirmed')}
                    className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                    Confirm
                </button>
                <button
                    onClick={() => updateStatus(id, 'cancelled')}
                    className="px-2 py-1 text-xs rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (status === 'confirmed') {
        return (
            <div className="flex gap-2">
                <button
                    onClick={() => updateStatus(id, 'checked_in')}
                    className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    Check-in
                </button>
                <button
                    onClick={() => updateStatus(id, 'cancelled')}
                    className="px-2 py-1 text-xs rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (status === 'checked_in') {
        return (
            <button
                onClick={() => updateStatus(id, 'checked_out')}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-white hover:bg-slate-900 transition-colors"
            >
                Check-out
            </button>
        );
    }

    // For checked_out / cancelled / no_show: no main actions for now
    return <span className="text-xs text-slate-400">No actions</span>;
}
