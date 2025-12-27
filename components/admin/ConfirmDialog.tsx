"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isSubmitting?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = 'info',
  isSubmitting = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="text-red-500" size={24} />,
      btn: "bg-red-600 hover:bg-red-700 text-white",
      border: "border-red-500/20"
    },
    warning: {
      icon: <AlertTriangle className="text-orange-500" size={24} />,
      btn: "bg-orange-600 hover:bg-orange-700 text-white",
      border: "border-orange-500/20"
    },
    info: {
      icon: <AlertTriangle className="text-blue-500" size={24} />,
      btn: "bg-brand-forest hover:bg-opacity-90 text-white",
      border: "border-blue-500/20"
    }
  };

  const activeStyles = variantStyles[variant];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] animate-in zoom-in-95 duration-200">
        <div className={`bg-[var(--color-surface-card)] rounded-xl shadow-2xl overflow-hidden border ${activeStyles.border}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-3">
              {activeStyles.icon}
              <h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">
                {title}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--color-surface-card)] rounded-full transition-surface text-[var(--color-text-muted)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 bg-[var(--color-surface-elevated)] flex items-center justify-end gap-3 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] rounded-lg transition-surface border border-[var(--color-border-default)]"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm ${activeStyles.btn} hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
            >
              {isSubmitting ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
