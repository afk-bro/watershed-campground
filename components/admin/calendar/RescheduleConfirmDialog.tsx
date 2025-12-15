import { Reservation } from "@/lib/supabase";
import { format, parseISO, differenceInDays } from "date-fns";
import { X, Calendar, Moon, ArrowRight, Home } from "lucide-react";

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
      return format(parseISO(dateStr), "EEE, MMM d, yyyy");
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
  const checkInMovedEarlier = checkInDaysDiff < 0;
  const checkInMovedLater = checkInDaysDiff > 0;

  // Calculate date direction for check-out
  const checkOutDaysDiff = checkOutChanged ? differenceInDays(parseISO(newEndDate), parseISO(oldEndDate)) : 0;
  const checkOutMovedEarlier = checkOutDaysDiff < 0;
  const checkOutMovedLater = checkOutDaysDiff > 0;

  // Build summary text
  const buildSummary = () => {
    const parts: string[] = [];

    if (checkInChanged) {
      const direction = checkInMovedEarlier ? "earlier" : "later";
      const days = Math.abs(checkInDaysDiff);
      parts.push(`Check-in moved ${days} ${days === 1 ? 'day' : 'days'} ${direction}`);
    }

    if (nightsChanged) {
      const change = newNights - oldNights;
      const verb = change > 0 ? "increased" : "decreased";
      parts.push(`Stay ${verb} from ${oldNights} → ${newNights} nights`);
    }

    if (campsiteChanged) {
      parts.push(`Campsite changed to ${newCampsiteName}`);
    }

    return parts.join(" • ");
  };

  const summary = buildSummary();

  return (
    <div className="fixed inset-0 bg-[var(--color-surface-overlay)] z-[60] flex items-center justify-center p-4">
      <div className="admin-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-default)] bg-brand-forest">
          <h2 className="text-xl font-heading font-bold text-accent-beige">
            Confirm Reschedule
          </h2>
          <button
            onClick={onCancel}
            className="text-accent-beige hover:text-accent-gold transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Guest Info */}
          <div className="mb-4 p-4 bg-[var(--color-surface-elevated)] rounded-lg">
            <div className="font-medium text-[var(--color-text-primary)]">
              {reservation.first_name} {reservation.last_name}
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">{reservation.email}</div>
          </div>

          {/* Summary Banner - THE GAME CHANGER */}
          {summary && (
            <div className="mb-6 p-4 bg-gradient-to-r from-[var(--color-accent-gold)]/10 to-[var(--color-accent-gold)]/5 border-l-4 border-[var(--color-accent-gold)] rounded-r-lg">
              <div className="flex items-start gap-3">
                <Calendar className="text-[var(--color-accent-gold)] flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-semibold text-[var(--color-text-primary)] mb-1">Reservation Changes</div>
                  <div className="text-sm text-[var(--color-text-primary)]">{summary}</div>
                </div>
              </div>
            </div>
          )}

          {/* Changes Table - Now with visual indicators */}
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-elevated)]">
                  <th className="text-left p-3 border-b-2 border-[var(--color-border-default)] w-8"></th>
                  <th className="text-left p-3 border-b-2 border-[var(--color-border-default)] w-32">Field</th>
                  <th className="text-left p-3 border-b-2 border-[var(--color-border-default)] text-[var(--color-text-muted)]">
                    Current
                  </th>
                  <th className="text-center p-3 border-b-2 border-[var(--color-border-default)] w-12"></th>
                  <th className="text-left p-3 border-b-2 border-[var(--color-border-default)] text-accent-gold">
                    New
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Campsite Row */}
                <tr className={campsiteChanged ? "bg-[var(--color-accent-gold)]/5" : "opacity-35"}>
                  <td className="p-3 border-b border-[var(--color-border-subtle)]">
                    <Home size={16} className="text-[var(--color-text-muted)]" />
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)]">
                    <span className={campsiteChanged ? "font-medium text-[var(--color-text-primary)]" : "font-normal text-[var(--color-text-muted)]"}>
                      Campsite
                    </span>
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
                    {oldCampsiteName}
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)] text-center">
                    {campsiteChanged && <ArrowRight size={16} className="text-[var(--color-accent-gold)] mx-auto" />}
                  </td>
                  <td className={`p-3 border-b border-[var(--color-border-subtle)] ${
                    campsiteChanged ? "text-accent-gold font-bold" : "text-[var(--color-text-secondary)]"
                  }`}>
                    {newCampsiteName}
                  </td>
                </tr>

                {/* Check-in Row - CRITICAL */}
                <tr className={checkInChanged ? "bg-[var(--color-accent-gold)]/5 border-l-4 border-[var(--color-accent-gold)]" : "opacity-35"}>
                  <td className="p-3 border-b border-[var(--color-border-subtle)]">
                    <Calendar size={16} className={checkInChanged ? "text-[var(--color-accent-gold)]" : "text-[var(--color-text-muted)]"} />
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)]">
                    <div className="flex flex-col gap-1">
                      <span className={checkInChanged ? "font-medium text-[var(--color-text-primary)]" : "font-normal text-[var(--color-text-muted)]"}>
                        Check-in
                      </span>
                      {checkInChanged && (
                        <span className={`text-xs font-normal ${
                          checkInMovedEarlier ? "text-[var(--color-status-active)]" : "text-[var(--color-warning)]"
                        }`}>
                          {checkInMovedEarlier
                            ? `${Math.abs(checkInDaysDiff)} ${Math.abs(checkInDaysDiff) === 1 ? 'day' : 'days'} earlier`
                            : `+${checkInDaysDiff} ${checkInDaysDiff === 1 ? 'day' : 'days'} later`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
                    {formatDate(oldStartDate)}
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)] text-center">
                    {checkInChanged && <ArrowRight size={16} className="text-[var(--color-accent-gold)] mx-auto" />}
                  </td>
                  <td className={`p-3 border-b border-[var(--color-border-subtle)] ${
                    checkInChanged ? "text-accent-gold font-bold" : "text-[var(--color-text-secondary)]"
                  }`}>
                    {formatDate(newStartDate)}
                  </td>
                </tr>

                {/* Check-out Row */}
                <tr className={checkOutChanged ? "bg-[var(--color-accent-gold)]/5 border-l-4 border-[var(--color-accent-gold)]" : "opacity-35"}>
                  <td className="p-3 border-b border-[var(--color-border-subtle)]">
                    <Calendar size={16} className={checkOutChanged ? "text-[var(--color-accent-gold)]" : "text-[var(--color-text-muted)]"} />
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)]">
                    <div className="flex flex-col gap-1">
                      <span className={checkOutChanged ? "font-medium text-[var(--color-text-primary)]" : "font-normal text-[var(--color-text-muted)]"}>
                        Check-out
                      </span>
                      {checkOutChanged && (
                        <span className={`text-xs font-normal ${
                          checkOutMovedEarlier ? "text-[var(--color-status-active)]" : "text-[var(--color-warning)]"
                        }`}>
                          {checkOutMovedEarlier
                            ? `${Math.abs(checkOutDaysDiff)} ${Math.abs(checkOutDaysDiff) === 1 ? 'day' : 'days'} earlier`
                            : `+${checkOutDaysDiff} ${checkOutDaysDiff === 1 ? 'day' : 'days'} later`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
                    {formatDate(oldEndDate)}
                  </td>
                  <td className="p-3 border-b border-[var(--color-border-subtle)] text-center">
                    {checkOutChanged && <ArrowRight size={16} className="text-[var(--color-accent-gold)] mx-auto" />}
                  </td>
                  <td className={`p-3 border-b border-[var(--color-border-subtle)] ${
                    checkOutChanged ? "text-accent-gold font-bold" : "text-[var(--color-text-secondary)]"
                  }`}>
                    {formatDate(newEndDate)}
                  </td>
                </tr>

                {/* Nights Row */}
                <tr className={nightsChanged ? "bg-[var(--color-accent-gold)]/5 border-l-4 border-[var(--color-accent-gold)]" : "opacity-35"}>
                  <td className="p-3">
                    <Moon size={16} className={nightsChanged ? "text-[var(--color-accent-gold)]" : "text-[var(--color-text-muted)]"} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className={nightsChanged ? "font-medium text-[var(--color-text-primary)]" : "font-normal text-[var(--color-text-muted)]"}>
                        Nights
                      </span>
                      {nightsChanged && (
                        <span className="text-xs font-normal text-[var(--color-text-muted)]">
                          {newNights > oldNights ? `+${newNights - oldNights}` : `${newNights - oldNights}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-[var(--color-text-secondary)]">
                    {oldNights} {oldNights === 1 ? "night" : "nights"}
                  </td>
                  <td className="p-3 text-center">
                    {nightsChanged && <ArrowRight size={16} className="text-[var(--color-accent-gold)] mx-auto" />}
                  </td>
                  <td className={`p-3 ${
                    nightsChanged ? "text-accent-gold font-bold" : "text-[var(--color-text-secondary)]"
                  }`}>
                    {newNights} {newNights === 1 ? "night" : "nights"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="error-message mb-4">
              <strong>Error:</strong> {validationError}
            </div>
          )}

          {/* Warning */}
          <div className="mb-6 p-4 bg-[var(--color-status-active)]/10 border border-[var(--color-status-active)]/30 rounded-lg text-[var(--color-text-primary)] text-sm">
            <strong>⚠️ Guest will receive email notification</strong>
            <br />
            An automated email will be sent to {reservation.email} with the updated reservation details.
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)]/80 transition-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isSubmitting || !!validationError}
                className="px-6 py-2 rounded-lg text-sm font-medium text-brand-forest bg-accent-gold hover:bg-accent-gold-dark hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
            {!isSubmitting && !validationError && (
              <p className="text-xs text-[var(--color-text-muted)] italic">
                Changes will be applied immediately and guest will be notified
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
