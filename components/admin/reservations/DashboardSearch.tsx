"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import type { SortMode } from "@/lib/admin/reservations/listing";

interface DashboardSearchProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sortMode: SortMode;
    setSortMode: (mode: SortMode) => void;
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function DashboardSearch({
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    showArchived,
    setShowArchived,
    searchInputRef
}: DashboardSearchProps) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[260px] flex-1 max-w-[520px]">
                <div className="relative group">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-accent-gold)] transition-colors"
                        size={16}
                    />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search name, email, phone, ref..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-gold)] transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            aria-label="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span>Sort</span>
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-gold)]"
                    >
                        <option value="start_date">Start date</option>
                        <option value="created_at">Created date</option>
                    </select>
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                    <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                        className="rounded border-gray-300 text-[var(--color-accent-gold)] focus:ring-[var(--color-accent-gold)]"
                    />
                    Show archived
                </label>

                <Link
                    href="/admin/calendar"
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)]/80 border border-[var(--color-border-subtle)] rounded-lg transition-all"
                >
                    <span>📅</span>
                    <span>Calendar</span>
                </Link>
            </div>
        </div>
    );
}
