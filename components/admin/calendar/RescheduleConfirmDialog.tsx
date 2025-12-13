import { Reservation } from "@/lib/supabase";
import { format, parseISO, differenceInDays } from "date-fns";
import { X } from "lucide-react";

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
  const datesChanged = oldStartDate !== newStartDate || oldEndDate !== newEndDate;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-brand-forest">
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
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-900">
              {reservation.first_name} {reservation.last_name}
            </div>
            <div className="text-sm text-slate-600">{reservation.email}</div>
          </div>

          {/* Changes Table */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Reservation Changes</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 border-b-2 border-slate-200"></th>
                  <th className="text-left p-3 border-b-2 border-slate-200 text-slate-600">
                    Current
                  </th>
                  <th className="text-left p-3 border-b-2 border-slate-200 text-accent-gold">
                    New
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className={campsiteChanged ? "bg-amber-50" : ""}>
                  <td className="p-3 font-medium text-slate-700 border-b border-slate-100">
                    Campsite
                  </td>
                  <td className="p-3 border-b border-slate-100">{oldCampsiteName}</td>
                  <td className={`p-3 border-b border-slate-100 ${
                    campsiteChanged ? "text-accent-gold font-bold" : ""
                  }`}>
                    {newCampsiteName}
                  </td>
                </tr>
                <tr className={datesChanged ? "bg-amber-50" : ""}>
                  <td className="p-3 font-medium text-slate-700 border-b border-slate-100">
                    Check-in
                  </td>
                  <td className="p-3 border-b border-slate-100">{formatDate(oldStartDate)}</td>
                  <td className={`p-3 border-b border-slate-100 ${
                    oldStartDate !== newStartDate ? "text-accent-gold font-bold" : ""
                  }`}>
                    {formatDate(newStartDate)}
                  </td>
                </tr>
                <tr className={datesChanged ? "bg-amber-50" : ""}>
                  <td className="p-3 font-medium text-slate-700 border-b border-slate-100">
                    Check-out
                  </td>
                  <td className="p-3 border-b border-slate-100">{formatDate(oldEndDate)}</td>
                  <td className={`p-3 border-b border-slate-100 ${
                    oldEndDate !== newEndDate ? "text-accent-gold font-bold" : ""
                  }`}>
                    {formatDate(newEndDate)}
                  </td>
                </tr>
                <tr className={oldNights !== newNights ? "bg-amber-50" : ""}>
                  <td className="p-3 font-medium text-slate-700">Nights</td>
                  <td className="p-3">
                    {oldNights} {oldNights === 1 ? "night" : "nights"}
                  </td>
                  <td className={`p-3 ${
                    oldNights !== newNights ? "text-accent-gold font-bold" : ""
                  }`}>
                    {newNights} {newNights === 1 ? "night" : "nights"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <strong>Error:</strong> {validationError}
            </div>
          )}

          {/* Warning */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <strong>⚠️ Guest will receive email notification</strong>
            <br />
            An automated email will be sent to {reservation.email} with the updated reservation details.
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || !!validationError}
              className="px-6 py-2 rounded-lg text-sm font-medium text-brand-forest bg-accent-gold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
