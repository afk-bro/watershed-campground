import { Reservation } from "@/lib/supabase";
import { format, parseISO, differenceInDays } from "date-fns";
import { X, Mail } from "lucide-react";

type Props = {
  isOpen: boolean;
  reservation: Reservation | null;
  oldCampsiteName: string;
  newCampsiteName: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  validationError: string | null;
};

export default function RescheduleConfirmDialog({
  isOpen,
  reservation,
  oldCampsiteName,
  newCampsiteName,
  oldStartDate,
  oldEndDate,
  newStartDate,
  newEndDate,
  onConfirm,
  onCancel,
  isSubmitting,
  validationError,
}: Props) {
  if (!isOpen || !reservation) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  const oldNights = differenceInDays(parseISO(oldEndDate), parseISO(oldStartDate));
  const newNights = differenceInDays(parseISO(newEndDate), parseISO(newStartDate));

  const campsiteChanged = oldCampsiteName !== newCampsiteName;
  const checkInChanged = oldStartDate !== newStartDate;
  const checkOutChanged = oldEndDate !== newEndDate;
  const nightsChanged = oldNights !== newNights;

  // Calculate date direction for check-in
  const checkInDaysDiff = checkInChanged ? differenceInDays(parseISO(newStartDate), parseISO(oldStartDate)) : 0;

  // Calculate date direction for check-out
  const checkOutDaysDiff = checkOutChanged ? differenceInDays(parseISO(newEndDate), parseISO(oldEndDate)) : 0;

  // Build compact diff description
  const buildDateShift = (daysDiff: number) => {
    if (daysDiff === 0) return null;
    const days = Math.abs(daysDiff);
    const direction = daysDiff < 0 ? "earlier" : "later";
    return `${days} ${days === 1 ? 'day' : 'days'} ${direction}`;
  };

  // Build one-line impact summary
  const buildImpactSummary = () => {
    const parts: string[] = [];

    if (checkInChanged) {
      const days = Math.abs(checkInDaysDiff);
      const direction = checkInDaysDiff < 0 ? "earlier" : "later";
      parts.push(`Moved ${days} ${days === 1 ? 'day' : 'days'} ${direction}`);
    }

    if (campsiteChanged) {
      parts.push("Site changed");
    }

    if (nightsChanged) {
      const change = newNights - oldNights;
      parts.push(`${change > 0 ? '+' : ''}${change} nights`);
    }

    return parts.join(" · ");
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-surface-overlay)] z-[60] flex items-center justify-center p-4">
      <div className="admin-card w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)] bg-brand-forest shrink-0">
          <h2 className="text-lg font-heading font-bold text-accent-beige">
            Confirm Reschedule
          </h2>
          <button
            onClick={onCancel}
            className="text-accent-beige hover:text-accent-gold transition-colors p-1"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable if needed */}
        <div className="px-4 py-3 overflow-auto flex-1 space-y-3">
          {/* Guest Info - Single line */}
          <div className="text-sm text-[var(--color-text-primary)]">
            <span className="font-medium">{reservation.first_name} {reservation.last_name}</span>
            <span className="mx-2 text-[var(--color-text-muted)]">·</span>
            <span className="text-[var(--color-text-muted)]">{reservation.email}</span>
          </div>

          {/* Impact Summary - One line */}
          {(checkInChanged || campsiteChanged || nightsChanged) && (
            <div className="text-sm text-[var(--color-text-muted)]">
              {buildImpactSummary()}
            </div>
          )}

          {/* Changes - Compact Diff List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Changes
            </div>

            {/* Campsite */}
            <div className="flex items-baseline gap-3">
              <div className="text-sm text-[var(--color-text-muted)] w-24 shrink-0">Campsite</div>
              <div className="flex-1 text-sm">
                {campsiteChanged ? (
                  <>
                    <span className="text-[var(--color-text-muted)]">{oldCampsiteName}</span>
                    <span className="mx-2 opacity-50">→</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{newCampsiteName}</span>
                  </>
                ) : (
                  <span className="text-[var(--color-text-muted)]">{oldCampsiteName} (unchanged)</span>
                )}
              </div>
            </div>

            {/* Check-in */}
            <div className="flex items-baseline gap-3">
              <div className="text-sm text-[var(--color-text-muted)] w-24 shrink-0">Check-in</div>
              <div className="flex-1 text-sm flex items-baseline gap-2">
                {checkInChanged ? (
                  <>
                    <span className="text-[var(--color-text-muted)]">{formatDate(oldStartDate)}</span>
                    <span className="opacity-50">→</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{formatDate(newStartDate)}</span>
                    {buildDateShift(checkInDaysDiff) && (
                      <span className="text-xs rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5">
                        {buildDateShift(checkInDaysDiff)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[var(--color-text-muted)]">{formatDate(oldStartDate)} (unchanged)</span>
                )}
              </div>
            </div>

            {/* Check-out */}
            <div className="flex items-baseline gap-3">
              <div className="text-sm text-[var(--color-text-muted)] w-24 shrink-0">Check-out</div>
              <div className="flex-1 text-sm flex items-baseline gap-2">
                {checkOutChanged ? (
                  <>
                    <span className="text-[var(--color-text-muted)]">{formatDate(oldEndDate)}</span>
                    <span className="opacity-50">→</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{formatDate(newEndDate)}</span>
                    {buildDateShift(checkOutDaysDiff) && (
                      <span className="text-xs rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5">
                        {buildDateShift(checkOutDaysDiff)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[var(--color-text-muted)]">{formatDate(oldEndDate)} (unchanged)</span>
                )}
              </div>
            </div>

            {/* Nights - only show if changed */}
            {nightsChanged && (
              <div className="flex items-baseline gap-3">
                <div className="text-sm text-[var(--color-text-muted)] w-24 shrink-0">Duration</div>
                <div className="flex-1 text-sm flex items-baseline gap-2">
                  <span className="text-[var(--color-text-muted)]">
                    {oldNights} {oldNights === 1 ? "night" : "nights"}
                  </span>
                  <span className="opacity-50">→</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {newNights} {newNights === 1 ? "night" : "nights"}
                  </span>
                  <span className="text-xs rounded-full bg-blue-500/10 text-blue-400 px-2 py-0.5">
                    {newNights > oldNights ? `+${newNights - oldNights}` : newNights - oldNights} nights
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="error-message text-sm">
              <strong>Error:</strong> {validationError}
            </div>
          )}

          {/* Email Notification - Compact single line */}
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] pt-2">
            <Mail size={14} className="shrink-0" />
            <span>Guest will receive email notification</span>
          </div>
        </div>

        {/* Footer - Sticky Actions */}
        <div className="px-4 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)] sticky bottom-0 shrink-0">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-surface disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || !!validationError}
              className="px-6 py-2 rounded-lg text-sm font-medium text-brand-forest bg-accent-gold hover:bg-accent-gold-dark hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
