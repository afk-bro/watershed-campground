"use client";

import { Search, Filter, Ban } from "lucide-react";

interface CalendarControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string | 'ALL';
  onTypeChange: (type: string | 'ALL') => void;
  hideBlackouts: boolean;
  onHideBlackoutsChange: (hide: boolean) => void;
}

export default function CalendarControls({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  hideBlackouts,
  onHideBlackoutsChange,
}: CalendarControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--color-surface-card)] border-b border-[var(--color-border-default)] items-center justify-between">
      
      {/* Search Bar */}
      <div className="relative w-full sm:w-64 lg:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-[var(--color-text-muted)]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search guest or reservation..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] text-sm focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:outline-none transition-all placeholder-[var(--color-text-muted)]"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        
        {/* Type Filter */}
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

        {/* Blackout Toggle */}
        <button
          onClick={() => onHideBlackoutsChange(!hideBlackouts)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
            ${hideBlackouts 
                ? 'bg-[var(--color-surface-elevated)] border-[var(--color-text-muted)] text-[var(--color-text-muted)]' 
                : 'bg-[var(--color-surface-primary)] border-[var(--color-border-default)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
            }`}
          title={hideBlackouts ? "Show Blackouts" : "Hide Blackouts"}
        >
          <Ban size={16} className={hideBlackouts ? "opacity-50" : ""} />
          <span className="hidden sm:inline">{hideBlackouts ? "Hidden" : "Blackouts"}</span>
        </button>
      </div>
    </div>
  );
}
