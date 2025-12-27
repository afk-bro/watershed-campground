"use client";

import type { Reservation, ReservationStatus } from "@/lib/supabase";
import { getPaymentStatus, getNights } from "@/lib/admin/reservations/listing";
import RowActions from "@/components/admin/RowActions";

interface ReservationCardProps {
    reservation: Reservation;
    isSelected: boolean;
    isSubmitting: boolean;
    onToggle: (id: string) => void;
    onClick: (reservation: Reservation) => void;
    updateStatus: (id: string, status: ReservationStatus) => void;
    handleArchive: (id: string) => void;
    setAssigningReservation: (reservation: Reservation) => void;
}

export default function ReservationCard({
    reservation,
    isSelected,
    isSubmitting,
    onToggle,
    onClick,
    updateStatus,
    handleArchive,
    setAssigningReservation
}: ReservationCardProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'no_show';
    const isCheckedIn = reservation.status === 'checked_in';
    const isArchived = !!reservation.archived_at;

    const cardClass = `
        bg-[var(--color-surface-card)]
        border-2 rounded-lg p-4 transition-all
        ${isSelected
            ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
            : 'border-[var(--color-border-default)]'
        }
        ${isArchived
            ? 'opacity-50 bg-gray-50/30 dark:bg-gray-900/10'
            : isCancelled
                ? 'opacity-60 grayscale bg-gray-50/50 dark:bg-gray-900/20'
                : isCheckedIn
                    ? 'bg-green-50/30 dark:bg-green-900/10'
                    : 'hover:border-[var(--color-accent-gold)] hover:shadow-md'
        }
    `;

    const paymentStatus = getPaymentStatus({
        ...reservation,
        metadata: reservation.metadata || undefined
    });
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
        <div className={cardClass} data-testid={`reservation-card-${reservation.id}`}>
            {/* Header Row: Checkbox + Name + Actions */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            disabled={isSubmitting}
                            aria-label={`Select reservation for ${reservation.first_name} ${reservation.last_name}`}
                            className={`rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60 ${
                                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            checked={isSelected}
                            onChange={() => onToggle(reservation.id!)}
                        />
                    </div>
                    <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onClick(reservation)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onClick(reservation);
                            }
                        }}
                    >
                        <div className="font-semibold text-[var(--color-text-primary)] text-base truncate">
                            {reservation.first_name} {reservation.last_name}
                        </div>
                        {reservation.email && (
                            <div className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                                {reservation.email}
                            </div>
                        )}
                    </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <RowActions
                        reservation={reservation}
                        updateStatus={updateStatus}
                        onArchive={handleArchive}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>

            {/* Status Badge */}
            <div
                className="mb-3 cursor-pointer"
                onClick={() => onClick(reservation)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick(reservation);
                    }
                }}
            >
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    reservation.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                    reservation.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
                    reservation.status === 'checked_in' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700'
                }`}>
                    {reservation.status.replace('_', ' ')}
                </span>
            </div>

            {/* Details Grid */}
            <div
                className="grid grid-cols-2 gap-3 cursor-pointer"
                onClick={() => onClick(reservation)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick(reservation);
                    }
                }}
            >
                {/* Dates */}
                <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Dates</div>
                    <div className="text-sm text-[var(--color-text-primary)]">
                        {new Date(reservation.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                        <span className="text-[var(--color-text-muted)] mx-1">→</span>
                        {new Date(reservation.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                        {getNights(reservation.check_in, reservation.check_out)} nights
                    </div>
                </div>

                {/* Campsite */}
                <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Campsite</div>
                    {reservation.campsites ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] font-mono font-medium text-[var(--color-text-primary)] text-xs">
                            {reservation.campsites.code}
                        </span>
                    ) : (
                        <button
                            disabled={isSubmitting}
                            className={`flex items-center gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded font-medium text-xs transition-colors border border-amber-200/50 dark:border-amber-800/50 ${
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

                {/* Camping Unit */}
                <div className="col-span-2">
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Details</div>
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)]">
                        <span className="text-base text-[var(--color-text-muted)]">
                            {reservation.camping_unit?.includes('Tent') ? '⛺' : '🚐'}
                        </span>
                        <span>{reservation.camping_unit}</span>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        👥 {reservation.adults} Adults, {reservation.children} Kids
                    </div>
                </div>

                {/* Payment Status */}
                <div className="col-span-2">
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Payment</div>
                    <div className={`flex items-center gap-1 text-xs ${config.color}`}>
                        <span className="opacity-70">{config.icon}</span>
                        <span>{config.label}</span>
                    </div>
                </div>

                {/* Phone (if available) */}
                {reservation.phone && (
                    <div className="col-span-2">
                        <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Phone</div>
                        <div className="text-sm text-[var(--color-text-primary)]">{reservation.phone}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
