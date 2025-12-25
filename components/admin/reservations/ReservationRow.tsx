"use client";

import type { Reservation, ReservationStatus } from "@/lib/supabase";
import { getPaymentStatus, getNights } from "@/lib/admin/reservations/listing";
import RowActions from "@/components/admin/RowActions";

interface ReservationRowProps {
    reservation: Reservation;
    isSelected: boolean;
    isSubmitting: boolean;
    onToggle: (id: string) => void;
    onClick: (reservation: Reservation) => void;
    updateStatus: (id: string, status: ReservationStatus) => void;
    handleArchive: (id: string) => void;
    setAssigningReservation: (reservation: Reservation) => void;
}

export default function ReservationRow({
    reservation,
    isSelected,
    isSubmitting,
    onToggle,
    onClick,
    updateStatus,
    handleArchive,
    setAssigningReservation
}: ReservationRowProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'no_show';
    const isCheckedIn = reservation.status === 'checked_in';
    const isArchived = !!(reservation as any).archived_at;

    const rowClass = `group transition-colors cursor-pointer border-l-2 ${
        isSelected
            ? 'border-l-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
            : 'border-l-transparent'
    } ${
        isArchived
            ? 'opacity-50 bg-gray-50/30 dark:bg-gray-900/10'
            : isCancelled
                ? 'opacity-60 grayscale bg-gray-50/50 dark:bg-gray-900/20'
                : isCheckedIn
                    ? 'bg-green-50/30 hover:bg-green-50/60 dark:bg-green-900/10 dark:hover:bg-green-900/20'
                    : 'hover:bg-[var(--color-surface-elevated)]'
    }`;

    const paymentStatus = getPaymentStatus(reservation as Parameters<typeof getPaymentStatus>[0]);
    const paymentConfig = {
        paid: { icon: '✓', label: 'Paid in full', color: 'text-green-600/60 dark:text-green-400/60' },
        deposit_paid: { icon: '💳', label: 'Deposit paid', color: 'text-blue-600/60 dark:text-blue-400/60' },
        payment_due: { icon: '⏳', label: 'Payment due', color: 'text-amber-600/80 dark:text-amber-400/80' },
        overdue: { icon: '⚠️', label: 'Payment overdue', color: 'text-red-600/80 dark:text-red-400/80' },
        failed: { icon: '✕', label: 'Payment failed', color: 'text-red-600/80 dark:text-red-400/80' },
        refunded: { icon: '↩', label: 'Refunded', color: 'text-gray-600/60 dark:text-gray-400/60' }
    };
    const config = paymentConfig[paymentStatus];

    return (
        <tr
            className={rowClass}
            onClick={() => onClick(reservation)}
        >
            <td className="px-3 pl-4 py-4 w-10 align-middle" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center min-h-[28px]">
                    <input
                        type="checkbox"
                        disabled={isSubmitting}
                        className={`rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60 ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        checked={isSelected}
                        onChange={() => onToggle(reservation.id!)}
                    />
                </div>
            </td>

            <td className="px-5 py-4 align-top border-l border-[var(--color-border-default)]/20">
                <div className="font-semibold text-[var(--color-text-primary)] text-base">
                    {reservation.first_name} {reservation.last_name}
                </div>
                <div className="text-[var(--color-text-muted)] text-xs mt-0.5 flex flex-col gap-0.5">
                    {reservation.email && (
                        <div className="truncate max-w-[240px]" title={reservation.email}>
                            {reservation.email}
                        </div>
                    )}
                    {reservation.phone && <div>{reservation.phone}</div>}
                </div>
            </td>

            <td className="px-5 py-4 align-top whitespace-nowrap border-l border-[var(--color-border-default)]/20">
                <div className="text-[var(--color-text-primary)]">
                    {new Date(reservation.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                    <span className="text-[var(--color-text-muted)] mx-2">→</span>
                    {new Date(reservation.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {getNights(reservation.check_in, reservation.check_out)} nights
                </div>
            </td>

            <td className="px-5 py-4 align-top min-w-0 border-l border-[var(--color-border-default)]/20">
                <div className="flex flex-col gap-1 max-w-[240px]">
                     <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                        <span className="text-base text-[var(--color-text-muted)]">
                             {reservation.camping_unit?.includes('Tent') ? '⛺' : '🚐'}
                        </span>
                        <span>{reservation.camping_unit}</span>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] flex gap-2">
                        <span>👥 {reservation.adults} Adults, {reservation.children} Kids</span>
                    </div>
                    <div className={`mt-0.5 flex items-center gap-1 text-xs ${config.color}`}>
                        <span className="opacity-70">{config.icon}</span>
                        <span>{config.label}</span>
                    </div>
                </div>
            </td>

            <td className="px-5 py-4 align-middle text-center border-l border-[var(--color-border-default)]/20">
                <div className="inline-flex justify-center items-center min-h-[28px]">
                    {reservation.campsites ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] font-mono font-medium text-[var(--color-text-primary)] text-xs h-7">
                            {reservation.campsites.code}
                        </span>
                    ) : (
                        <button
                            disabled={isSubmitting}
                            className={`flex items-center gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded font-medium text-xs transition-colors group/unassigned border border-amber-200/50 dark:border-amber-800/50 h-7 ${
                                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setAssigningReservation(reservation);
                            }}
                        >
                            <span>Unassigned</span>
                        </button>
                    )}
                </div>
            </td>

            <td className="px-5 py-4 align-middle text-center border-l border-[var(--color-border-default)]/20">
                 <div className="inline-flex justify-center items-center min-h-[28px]">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        reservation.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                        reservation.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        reservation.status === 'checked_in' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                        {reservation.status.replace('_', ' ')}
                    </span>
                 </div>
            </td>

            <td className="px-5 py-4 align-middle text-center border-l border-[var(--color-border-default)]/20">
                <div className="inline-flex items-center justify-center gap-2 min-h-[28px]">
                    <RowActions
                        reservation={reservation}
                        updateStatus={updateStatus}
                        onArchive={handleArchive}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </td>
        </tr>
    );
}
