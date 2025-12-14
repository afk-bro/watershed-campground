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
                    className="px-2 py-1 text-xs rounded bg-[var(--color-status-confirmed)] text-white hover:opacity-90 transition-opacity"
                >
                    Confirm
                </button>
                <button
                    onClick={() => updateStatus(id, 'cancelled')}
                    className="px-2 py-1 text-xs rounded bg-[var(--color-status-cancelled)] text-white hover:opacity-90 transition-opacity"
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
                    className="px-2 py-1 text-xs rounded bg-[var(--color-status-active)] text-white hover:opacity-90 transition-opacity"
                >
                    Check-in
                </button>
                <button
                    onClick={() => updateStatus(id, 'cancelled')}
                    className="px-2 py-1 text-xs rounded bg-[var(--color-status-cancelled)] text-white hover:opacity-90 transition-opacity"
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
                className="px-2 py-1 text-xs rounded bg-[var(--color-surface-primary)] text-white hover:bg-[var(--color-surface-secondary)] transition-surface"
            >
                Check-out
            </button>
        );
    }

    // For checked_out / cancelled / no_show: no main actions for now
    return <span className="text-xs text-[var(--color-text-muted)]">No actions</span>;
}
