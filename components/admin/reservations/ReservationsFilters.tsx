import Link from "next/link";
import { Search } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import { type ReservationStatus } from "@/lib/supabase";
import { type FilterType, type SortMode } from "@/lib/admin/reservations/listing";

interface ReservationsFiltersProps {
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    sortMode: SortMode;
    setSortMode: (mode: SortMode) => void;
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    statusCounts: Record<ReservationStatus, number>;
    maintenanceCount: number;
    totalCount: number;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function ReservationsFilters({
    filter,
    setFilter,
    sortMode,
    setSortMode,
    showArchived,
    setShowArchived,
    statusCounts,
    maintenanceCount,
    totalCount,
    searchQuery,
    setSearchQuery,
}: ReservationsFiltersProps) {
    return (
        <div className="flex flex-col gap-5 border-b border-[var(--color-border-default)] pb-5">
            {/* Top Row: Title + Search + Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reservations</h1>
                    <span className="text-[var(--color-text-secondary)] font-medium">({totalCount})</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--color-accent-gold)] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search guest, email, ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-gold)] transition-all"
                        />
                    </div>

                    <div className="h-6 w-px bg-[var(--color-border-subtle)] mx-1 hidden sm:block" />

                    {/* Controls */}
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as SortMode)}
                            className="bg-transparent font-medium hover:text-[var(--color-text-primary)] cursor-pointer focus:outline-none"
                        >
                            <option value="start_date">Start date</option>
                            <option value="created_at">Created date</option>
                        </select>

                        <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--color-text-primary)]">
                            <input 
                                type="checkbox" 
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="rounded border-gray-300 text-[var(--color-accent-gold)] focus:ring-[var(--color-accent-gold)]"
                            />
                            <span>Show archived</span>
                        </label>
                        
                        <Tooltip content="Calendar View" side="bottom">
                            <Link 
                                href="/admin/calendar" 
                                className="p-2 hover:bg-[var(--color-surface-elevated)] rounded-md transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center"
                            >
                                <span className="text-lg leading-none">📅</span>
                            </Link>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Tabs */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
                <div className="flex gap-6 items-center whitespace-nowrap border-b border-transparent">
                    <button
                        onClick={() => setFilter('all')}
                        className={`pb-2 text-sm font-medium transition-all ${
                            filter === 'all'
                                ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        All
                    </button>
                    {!showArchived && (
                        <>
                            {(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as ReservationStatus[]).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`pb-2 text-sm font-medium transition-all capitalize ${
                                        filter === status
                                            ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)]'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
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
                                className={`pb-2 text-sm font-medium transition-all capitalize ${
                                    filter === 'maintenance'
                                        ? 'text-amber-600 dark:text-amber-500 border-b-2 border-amber-500'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Maintenance 
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
            </div>
        </div>
    );
}
