"use client";

import { ReactNode } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Info, Search, Filter } from "lucide-react";

interface CalendarMonthHeaderProps {
  date: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  // Search & Filters
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  showAvailability: boolean;
  onShowAvailabilityChange: (show: boolean) => void;
  children?: ReactNode;
}

export default function CalendarMonthHeader({
  date,
  onPrevMonth,
  onNextMonth,
  onToday,
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  showAvailability,
  onShowAvailabilityChange,
  children
}: CalendarMonthHeaderProps) {
  return (
    <div className="flex flex-col border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
      {/* Top row: Search and Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:px-6 gap-4 border-b border-[var(--color-border-subtle)]/50">
        <div className="relative w-full sm:w-64 lg:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-[var(--color-text-muted)]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search guest or reservation..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-sm focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:outline-none transition-all placeholder-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full sm:w-auto pl-3 pr-8 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] text-sm focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:outline-none appearance-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="RV">RV Sites</option>
              <option value="Tent">Tent Sites</option>
              <option value="Cabin">Cabins</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[var(--color-text-muted)]">
              <Filter size={14} />
            </div>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] text-sm font-medium cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-all">
            <input
              type="checkbox"
              checked={showAvailability}
              onChange={(e) => onShowAvailabilityChange(e.target.checked)}
              className="rounded text-[var(--color-accent-gold)] focus:ring-[var(--color-accent-gold)]"
            />
            <span className="text-[var(--color-text-primary)]">Availability</span>
          </label>
        </div>
      </div>

      {/* Bottom row: Pagination and Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:px-6 gap-4">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] tracking-tight">
            {format(date, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1 bg-[var(--color-surface-elevated)] p-1 rounded-lg border border-[var(--color-border-subtle)] shadow-sm">
            <button
              onClick={onPrevMonth}
              aria-label="Previous Month"
              className="p-1.5 hover:bg-[var(--color-surface-card)] rounded-md transition-surface text-[var(--color-text-primary)] hover:text-[var(--color-accent-gold)]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={onToday}
              className="px-3 py-1 text-xs font-semibold hover:bg-[var(--color-surface-card)] hover:text-[var(--color-accent-gold)] rounded-md transition-surface text-[var(--color-text-primary)] border-x border-[var(--color-border-subtle)]"
            >
              Today
            </button>
            <button
              onClick={onNextMonth}
              aria-label="Next Month"
              className="p-1.5 hover:bg-[var(--color-surface-card)] rounded-md transition-surface text-[var(--color-text-primary)] hover:text-[var(--color-accent-gold)]"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-active)]"></span>
            <span className="text-[var(--color-text-muted)]">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-pending)]"></span>
            <span className="text-[var(--color-text-muted)]">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-text-muted)]/30"></span>
            <span className="text-[var(--color-text-muted)]">Blackout</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
