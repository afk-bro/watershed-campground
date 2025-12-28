"use client";

import { useEffect, useState } from "react";
import { X, Calendar, MousePointer2 } from "lucide-react";

export default function InstructionalOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOverlay = localStorage.getItem("has_seen_blackout_overlay");
    if (!hasSeenOverlay) {
      // Small delay to appear after page load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleDismiss = (dontShowAgain: boolean) => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem("has_seen_blackout_overlay", "true");
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-surface-card)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div className="bg-brand-forest p-6 text-white text-center">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Calendar size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-heading font-bold mb-2">Add Blackout Dates</h3>
          <p className="text-white/80 text-sm">
            Block availability so guests can&apos;t book during closures, maintenance, or private use.
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center flex-shrink-0 text-[var(--color-accent-gold)] font-bold">1</div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Click and drag</p>
                <p className="text-sm text-[var(--color-text-muted)]">Select dates directly on the calendar grid.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center flex-shrink-0 text-[var(--color-accent-gold)] font-bold">2</div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Choose &quot;Blackout&quot;</p>
                <p className="text-sm text-[var(--color-text-muted)]">Select Blackout Date from the popup menu.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleDismiss(false)}
              className="flex-1 py-2.5 px-4 rounded-lg font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors text-sm"
            >
              Got it
            </button>
            <button
              onClick={() => handleDismiss(true)}
              className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-[var(--color-status-active)] text-white hover:bg-[var(--color-status-active)]/90 transition-colors shadow-sm text-sm"
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
