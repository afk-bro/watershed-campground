"use client";

import { format, isToday, isWeekend } from "date-fns";

interface CalendarDaysHeaderProps {
  days: Date[];
  todayX: number | null;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  headerTodayRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export default function CalendarDaysHeader({
  days,
  todayX,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  headerTodayRef,
  className = ""
}: CalendarDaysHeaderProps) {
  return (
    <div 
      className={`flex sticky top-0 z-30 bg-[var(--color-surface-elevated)] border-b-2 border-[var(--color-border-strong)] ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      data-header-row="true"
    >
      {/* Corner Sticky */}
      <div 
        className="sticky left-0 w-32 sm:w-48 lg:w-64 bg-[var(--color-surface-elevated)] border-r border-[var(--color-border-default)] pt-5 pb-3 px-2 lg:px-3 font-semibold text-[var(--color-text-muted)] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-40 text-xs lg:text-sm"
        data-no-pan="true"
      >
        Campsite
      </div>

      {/* Days */}
      <div className="flex relative">
        {days.map((day) => (
          <div
            key={day.toString()}
            ref={isToday(day) ? headerTodayRef : null}
            className={`flex-shrink-0 w-10 sm:w-12 lg:w-14 py-3 lg:py-4 flex flex-col items-center justify-center border-r border-[var(--color-border-subtle)] transition-colors
              ${isWeekend(day) ? 'bg-[var(--color-surface-card)]' : ''}
              ${isToday(day) ? 'bg-[var(--color-accent-gold)]/10' : ''}`}
          >
            <span className={`text-[10px] lg:text-xs font-medium uppercase tracking-wider mb-1
              ${isToday(day) ? 'text-[var(--color-accent-gold)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
              {format(day, "eee")}
            </span>
            <span className={`text-xs lg:text-sm font-bold
              ${isToday(day) ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-primary)]'}`}>
              {format(day, "d")}
            </span>
          </div>
        ))}

        {/* Today Indicator Line (Extension into header) */}
        {todayX !== null && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-[var(--color-accent-gold)]/40 z-50 pointer-events-none"
            style={{ left: `${todayX + 112}px` }} // Offset adjustment based on layout
          />
        )}
      </div>
    </div>
  );
}
