"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useViewportModeContext } from '@/components/providers/ViewportModeProvider';

interface BottomSheetProps {
  /**
   * Whether the bottom sheet is open
   */
  isOpen: boolean;
  /**
   * Callback when the sheet should close
   */
  onClose: () => void;
  /**
   * Title of the sheet
   */
  title?: string;
  /**
   * Content of the sheet
   */
  children: ReactNode;
  /**
   * Footer actions (buttons, etc.)
   */
  footer?: ReactNode;
  /**
   * Custom className for the content area
   */
  className?: string;
}

/**
 * BottomSheet - Standard mobile detail editor pattern
 *
 * Displays as a bottom sheet on phone, modal dialog on tablet/desktop.
 * Handles backdrop, scroll locking, and keyboard interactions.
 *
 * @example
 * ```tsx
 * <BottomSheet
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit Reservation"
 *   footer={
 *     <>
 *       <button onClick={onClose}>Cancel</button>
 *       <button onClick={onSave}>Save</button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}: BottomSheetProps) {
  const { isPhone } = useViewportModeContext();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sheetClass = isPhone
    ? 'fixed inset-x-0 bottom-0 top-auto rounded-t-2xl max-h-[90vh]'
    : 'fixed inset-x-4 inset-y-4 sm:inset-x-auto sm:inset-y-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-full sm:max-h-[85vh] rounded-lg';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          ${sheetClass}
          bg-[var(--color-surface-elevated)]
          border border-[var(--color-border-default)]
          shadow-2xl
          z-50
          flex flex-col
          animate-in
          ${isPhone ? 'slide-in-from-bottom' : 'fade-in zoom-in-95'}
          duration-300
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)] flex-shrink-0">
            <h2
              id="bottom-sheet-title"
              className="text-lg font-heading font-bold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-6 py-4 ${className}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--color-border-default)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
