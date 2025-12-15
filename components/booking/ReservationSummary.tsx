"use client";

import { format, parseISO, differenceInDays } from "date-fns";
import { Calendar, Users, Edit2 } from "lucide-react";

interface ReservationSummaryProps {
    checkIn: string | null;
    checkOut: string | null;
    guests: number;
    unitType?: string;
    currentStep: number;
    totalSteps: number;
    onChangeDates?: () => void;
    onChangeDetails?: () => void;
}

export default function ReservationSummary({
    checkIn,
    checkOut,
    guests,
    unitType,
    currentStep,
    totalSteps,
    onChangeDates,
    onChangeDetails
}: ReservationSummaryProps) {
    if (!checkIn || !checkOut) return null;

    const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
    const stepLabels = ['Dates', 'Details', 'Select Site'];

    return (
        <div className="bg-[var(--color-surface-elevated)]/50 border border-[var(--color-accent-gold)]/20 rounded-xl p-4 mb-6 backdrop-blur-sm">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--color-border-subtle)]">
                <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Step {currentStep} of {totalSteps} · {stepLabels[currentStep - 1]}
                </span>
                <div className="flex gap-1">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 w-8 rounded-full transition-all ${
                                i < currentStep
                                    ? 'bg-[var(--color-accent-gold)]'
                                    : 'bg-[var(--color-accent-gold)]/20'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Reservation details */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                {/* Dates */}
                <div className="flex items-center gap-2 flex-1">
                    <Calendar className="w-4 h-4 text-[var(--color-accent-gold)]/70 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            {format(parseISO(checkIn), 'MMM d')} → {format(parseISO(checkOut), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-accent-gold)]/10 px-2 py-0.5 rounded-full">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                        </span>
                    </div>
                    {onChangeDates && (
                        <button
                            onClick={onChangeDates}
                            className="text-xs text-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold-dark)] flex items-center gap-1 transition-colors ml-auto sm:ml-0"
                            aria-label="Change dates"
                        >
                            <Edit2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Change</span>
                        </button>
                    )}
                </div>

                {/* Guests - shown on step 2+ */}
                {currentStep >= 2 && (
                    <>
                        <div className="hidden sm:block w-px h-6 bg-[var(--color-border-subtle)]"></div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[var(--color-accent-gold)]/70 flex-shrink-0" />
                            <span className="text-sm text-[var(--color-text-primary)]">
                                {guests} {guests === 1 ? 'Guest' : 'Guests'}
                                {unitType && (
                                    <span className="text-[var(--color-text-muted)] ml-1">· {unitType}</span>
                                )}
                            </span>
                            {onChangeDetails && currentStep > 2 && (
                                <button
                                    onClick={onChangeDetails}
                                    className="text-xs text-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold-dark)] flex items-center gap-1 transition-colors"
                                    aria-label="Change details"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    <span className="hidden sm:inline">Change</span>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
