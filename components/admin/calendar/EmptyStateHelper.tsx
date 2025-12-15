"use client";

import { MousePointer2 } from "lucide-react";

export default function EmptyStateHelper() {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-60">
      <div className="bg-[var(--color-surface-card)]/90 backdrop-blur border border-[var(--color-border-subtle)] px-6 py-4 rounded-full shadow-lg flex items-center gap-3">
        <MousePointer2 className="text-[var(--color-accent-gold)] animate-bounce" size={20} />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No blackout dates yet</p>
          <p className="text-xs text-[var(--color-text-muted)]">Drag across the calendar to block dates</p>
        </div>
      </div>
    </div>
  );
}
