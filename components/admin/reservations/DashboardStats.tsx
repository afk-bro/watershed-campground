"use client";

import type { ReservationStatus, OverviewItem } from "@/lib/supabase";
import type { FilterType } from "@/lib/admin/reservations/listing";

interface DashboardStatsProps {
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    showArchived: boolean;
    totalCount: number;
    statusCounts: Record<ReservationStatus, number>;
    maintenanceCount: number;
    sortedItemsCount: number;
    searchQuery: string;
    onClearSearch: () => void;
    getFilterLabel: () => string;
}

export default function DashboardStats({
    filter,
    setFilter,
    showArchived,
    totalCount,
    statusCounts,
    maintenanceCount,
    sortedItemsCount,
    searchQuery,
    onClearSearch,
    getFilterLabel
}: DashboardStatsProps) {
    return (
        <div className="w-full border-b border-[var(--color-border-default)]/10 mb-6">
            <div className="flex w-full items-center justify-between gap-4">
                {/* Left: Tabs */}
                <div className="flex min-w-0 flex-1 gap-6 overflow-x-auto scrollbar-hide pb-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            filter === 'all'
                                ? 'border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]'
                                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        {showArchived ? 'Archived' : 'All'}
                        <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                            filter === 'all'
                                ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                            {totalCount}
                        </span>
                    </button>
                    {!showArchived && (
                        <>
                            {(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as ReservationStatus[]).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${
                                        filter === status
                                            ? 'border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]'
                                            : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`}
                                >
                                    {status.replace('_', ' ')}
                                    <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                                        filter === status
                                            ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }`}>
                                        {statusCounts[status] || 0}
                                    </span>
                                </button>
                            ))}
                            <button
                                onClick={() => setFilter('maintenance')}
                                className={`pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    filter === 'maintenance'
                                        ? 'border-amber-500 text-amber-600 dark:text-amber-500'
                                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                🛠️ Maintenance
                                <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                                    filter === 'maintenance'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}>
                                    {maintenanceCount}
                                </span>
                            </button>
                        </>
                    )}
                </div>

                {/* Right: Meta info */}
                <div className="shrink-0 text-xs text-[var(--color-text-muted)]/50 whitespace-nowrap pb-2">
                    Showing: <span className="font-semibold text-[var(--color-text-primary)]">{getFilterLabel()}</span>
                    {searchQuery ? (
                        <>
                            {' · '}
                            <span className="font-semibold text-[var(--color-text-primary)]">{sortedItemsCount}</span>
                            {' '}{sortedItemsCount === 1 ? 'result' : 'results'}
                        </>
                    ) : (
                        <>
                            {' · '}
                            <span className="font-semibold text-[var(--color-text-primary)]">{sortedItemsCount}</span>
                            {' total'}
                        </>
                    )}
                    {searchQuery && (
                        <>
                            {' · '}
                            <button
                                onClick={onClearSearch}
                                className="text-[var(--color-text-muted)]/50 hover:text-[var(--color-text-primary)] transition-colors underline"
                            >
                                clear
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
