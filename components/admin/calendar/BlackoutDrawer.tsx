"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { BlackoutDate, Campsite } from "@/lib/supabase";

interface BlackoutDrawerProps {
  blackout: BlackoutDate | null;
  campsiteName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, reason: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function BlackoutDrawer({
  blackout,
  campsiteName,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: BlackoutDrawerProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (blackout) {
      setReason(blackout.reason || "");
      setConfirmDelete(false);
    }
  }, [blackout]);

  if (!blackout) return null;

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(blackout.id, reason);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(blackout.id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-[var(--color-surface-card)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-[var(--color-border-subtle)] ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
          <div>
            <h2 className="text-xl font-heading font-bold text-[var(--color-text-primary)]">Blackout Details</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{campsiteName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-card)] rounded-full transition-surface text-[var(--color-text-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 h-[calc(100vh-80px)] overflow-y-auto">
            
            {/* Date Info */}
            <div className="bg-[var(--color-surface-generated)]/5 p-4 rounded-lg border border-[var(--color-border-default)]">
                <div className="flex items-center gap-3 text-[var(--color-text-primary)] mb-2">
                    <Calendar size={18} className="text-[var(--color-text-muted)]" />
                    <span className="font-medium">
                        {format(parseISO(blackout.start_date), "MMM d, yyyy")} - {format(parseISO(blackout.end_date), "MMM d, yyyy")}
                    </span>
                </div>
            </div>

            {/* Reason Input */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Reason
                </label>
                <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:outline-none"
                    placeholder="Maintenance, Private Event, etc."
                />
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-[var(--color-border-subtle)] space-y-3">
                <button
                    onClick={handleUpdate}
                    disabled={isSubmitting || reason === blackout.reason}
                    className="w-full py-2.5 rounded-lg bg-[var(--color-text-primary)] text-[var(--color-surface-primary)] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </button>

                {!confirmDelete ? (
                     <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full py-2.5 rounded-lg border border-[var(--color-error)] text-[var(--color-error)] font-medium hover:bg-[var(--color-error)]/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={16} />
                        Delete Blackout
                    </button>
                ) : (
                    <div className="p-4 bg-[var(--color-error)]/10 rounded-lg space-y-3 border border-[var(--color-error)]/20 animate-scale-in">
                        <div className="flex items-center gap-2 text-[var(--color-error)] text-sm font-medium">
                            <AlertTriangle size={16} />
                            Confirm Deletion?
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 py-1.5 rounded-md border border-[var(--color-error)]/30 text-[var(--color-text-primary)] text-sm hover:bg-[var(--color-surface-elevated)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-1.5 rounded-md bg-[var(--color-error)] text-white text-sm hover:bg-[var(--color-error)]/90"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </>
  );
}
