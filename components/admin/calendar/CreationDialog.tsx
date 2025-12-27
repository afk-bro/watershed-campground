"use client";

import { useState } from "react";
import { X, Calendar, Ban } from "lucide-react";
import { format } from "date-fns";

interface CreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  campsiteId: string;
  campsiteCode?: string; // Optional for display
  onCreateBlackout: (reason: string) => Promise<void>;
  onCreateReservation: () => void; // Redirects or opens modal
}

export default function CreationDialog({
  isOpen,
  onClose,
  startDate,
  endDate,
  campsiteId,
  campsiteCode,
  onCreateBlackout,
  onCreateReservation,
}: CreationDialogProps) {
  const [step, setStep] = useState<"SELECT" | "BLACKOUT_DETAILS">("SELECT");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateBlackout = async () => {
    setIsSubmitting(true);
    try {
      await onCreateBlackout(reason);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[var(--color-surface-card)] rounded-xl shadow-2xl z-50 overflow-hidden border border-[var(--color-border-subtle)] animate-scale-in">
        
        {/* Header */}
        <div className="bg-[var(--color-surface-elevated)] p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-[var(--color-text-primary)]">
              Create New Block
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d")} • {campsiteCode || "Campsite"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-surface-card)] rounded-full transition-surface text-[var(--color-text-muted)]">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === "SELECT" ? (
            <div className="space-y-3">
              <button
                onClick={onCreateReservation}
                className="w-full flex items-center gap-4 p-4 md:p-3.5 rounded-lg border border-[var(--color-border-default)] hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-surface-elevated)] transition-all group text-left touch-manipulation min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-status-active)]/10 flex items-center justify-center text-[var(--color-status-active)] group-hover:scale-110 transition-transform">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">New Reservation</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Book this site for a guest</div>
                </div>
              </button>

              <button
                onClick={() => setStep("BLACKOUT_DETAILS")}
                className="w-full flex items-center gap-4 p-4 md:p-3.5 rounded-lg border border-[var(--color-border-default)] hover:border-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-all group text-left touch-manipulation min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-text-muted)]/10 flex items-center justify-center text-[var(--color-text-muted)] group-hover:scale-110 transition-transform">
                  <Ban size={20} />
                </div>
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">Blackout Date</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Block for maintenance or closure</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Maintenance, Private Use"
                  className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-3.5 md:py-3 text-base focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("SELECT")}
                  className="flex-1 py-3.5 md:py-3 rounded-lg border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm hover:bg-[var(--color-surface-elevated)] touch-manipulation min-h-[48px]"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateBlackout}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 md:py-3 rounded-lg bg-[var(--color-text-primary)] text-[var(--color-surface-primary)] font-medium text-sm hover:opacity-90 disabled:opacity-50 touch-manipulation min-h-[48px]"
                >
                  {isSubmitting ? "Creating..." : "Confirm Blackout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
