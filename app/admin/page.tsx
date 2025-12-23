"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, X, Wrench, Search } from "lucide-react";
import { type Reservation, type ReservationStatus, type OverviewItem } from "@/lib/supabase";
import StatusPill from "@/components/admin/StatusPill";
import RowActions from "@/components/admin/RowActions";
import ReservationDrawer from "@/components/admin/calendar/ReservationDrawer";
import AssignmentDialog from "@/components/admin/AssignmentDialog";
import Container from "@/components/Container";
import OnboardingChecklist from "@/components/admin/dashboard/OnboardingChecklist";
import BulkBar from "@/components/admin/reservations/BulkBar";
import { computeCounts, getNights, sortItems, type SortMode } from "@/lib/admin/reservations/listing";

type FilterType = ReservationStatus | 'all' | 'maintenance';

export default function AdminPage() {
    const [items, setItems] = useState<OverviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [sortMode, setSortMode] = useState<SortMode>('start_date');
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/reservations');
            if (!response.ok) {
                throw new Error('Failed to fetch reservations');
            }

            const { data } = await response.json();

            // Note: Blocking events (maintenance) don't have archived_at, so we'll show them when showArchived is false
                        const filtered = showArchived
                                ? (data || []).filter((item: unknown): item is OverviewItem => {
                                        if (!item || typeof item !== 'object') return false;
                                        const anyItem = item as Record<string, unknown>;
                                        const type = anyItem.type;
                                        const archived = (anyItem as Record<string, unknown>).archived_at;
                                        return type === 'reservation' && archived != null;
                                    })
                                : (Array.isArray(data) ? data : []);

            setItems(filtered);
        } catch (err) {
            console.error('Error fetching reservations:', err);
            setError('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }, [showArchived]);

    // Clear selection when filter changes to avoid confusion
    useEffect(() => {
        setSelectedIds(new Set());
    }, [filter, showArchived]);

    useEffect(() => {
        void fetchReservations();
    }, [fetchReservations]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && searchQuery) {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    const updateStatus = async (id: string, status: ReservationStatus) => {
        try {
            const response = await fetch(`/api/admin/reservations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            await fetchReservations();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const handleAssignCampsite = async (reservationId: string, campsiteId: string) => {
        const res = await fetch(`/api/admin/reservations/${reservationId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campsiteId }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to assign campsite');
        }

        await fetchReservations();
    };

    // Filter by status
    const statusFilteredItems = (() => {
        if (filter === 'all') return items;
        if (filter === 'maintenance') return items.filter(item => item.type === 'maintenance' || item.type === 'blackout');
        // Filter by reservation status
        return items.filter(item => item.type === 'reservation' && item.status === filter);
    })();

    // Apply search filter
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return statusFilteredItems;

        const query = searchQuery.toLowerCase();
        return statusFilteredItems.filter(item => {
            if (item.type !== 'reservation') return false;

            // Type guard: we know it's a reservation now
            const reservation = item as Extract<OverviewItem, { type: 'reservation' }>;

            // Search across name, email, phone, ID, and campsite code
            const searchableText = [
                reservation.guest_name,
                reservation.guest_email,
                reservation.guest_phone,
                reservation.id,
                reservation.campsite_code,
            ].filter(Boolean).join(' ').toLowerCase();

            return searchableText.includes(query);
        });
    }, [statusFilteredItems, searchQuery]);

    const sortedItems = [...filteredItems].sort((a, b) => {
        const getDateValue = (item: OverviewItem) => {
            if (sortMode === 'created_at') {
                if (item.type === 'reservation' && item.created_at) return item.created_at;
                // Maintenance/blackout items may not have created_at; fall back to their start date
            }
            return item.type === 'reservation' ? item.check_in : item.start_date;
        };

        const aDate = new Date(getDateValue(a) ?? 0).getTime();
        const bDate = new Date(getDateValue(b) ?? 0).getTime();

        // Descending (most recent first)
        if (bDate !== aDate) return bDate - aDate;

        // Stable tie-breaker to keep reservations ahead of maintenance when dates match
        if (a.type !== b.type) return a.type === 'reservation' ? -1 : 1;
        return 0;
    });

    // Only reservations can be selected for bulk operations
    const selectableReservations = sortedItems.filter(item => item.type === 'reservation');

    const toggleSelection = (id: string, itemType: 'reservation' | 'maintenance' | 'blackout') => {
        // Only allow selecting reservations
        if (itemType !== 'reservation') return;

        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === selectableReservations.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableReservations.map(item => item.id)));
        }
    };

    const handleBulkAction = async (action: 'check_in' | 'check_out' | 'cancel') => {
        if (!confirm(`Are you sure you want to ${action.replace('_', ' ')} ${selectedIds.size} reservations?`)) return;

        try {
            const res = await fetch('/api/admin/reservations/bulk-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reservationIds: Array.from(selectedIds),
                    status: action 
                }),
            });

            if (!res.ok) throw new Error('Bulk update failed');
            
            // Optionally could use returned data to reconcile, but refetch is safer for MVP
            await fetchReservations();
            setSelectedIds(new Set()); // Clear selection on success
        } catch (error) {
            console.error(error);
            alert("Failed to perform bulk action");
        }
    };

    const handleBulkAssignRandom = async () => {
        if (!confirm(`Auto-assign campsites for ${selectedIds.size} reservations?`)) return;
        
        try {
            const res = await fetch('/api/admin/reservations/bulk-assign-random', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: Array.from(selectedIds) }),
            });

            const data = await res.json();
            
            // Report results
            const successCount = (data.results || []).filter((r: unknown) => {
                return r && typeof r === 'object' && (r as Record<string, unknown>).success;
            }).length;
            const failCount = (data.results || []).length - successCount;
            
            alert(`Assigned ${successCount} reservations. ${failCount} failed or no spots available.`);
            
            await fetchReservations();
            
            // Keep failures selected? For now clear all to be simple, 
            // but advanced UX would be: set selection to just the failed IDs.
            if (failCount === 0) {
                setSelectedIds(new Set());
            } else {
                const failedIds = new Set<string>(
                    (data.results || []).filter((r: unknown) => {
                        return r && typeof r === 'object' && !(r as Record<string, unknown>).success;
                    }).map((r: unknown) => (r as Record<string, unknown>).id as string)
                );
                setSelectedIds(failedIds);
            }

        } catch (error) {
            console.error("Bulk Assign Error:", error);
            alert("Failed to run bulk assignment");
        }
    };

    const handleBulkArchive = async (action: 'archive' | 'restore') => {
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.size} reservations?`)) return;

        try {
            const res = await fetch('/api/admin/reservations/bulk-archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reservationIds: Array.from(selectedIds),
                    action 
                }),
            });

            if (!res.ok) throw new Error(`${action} failed`);
            
            await fetchReservations();
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            alert(`Failed to ${action} items`);
        }
    };

    const { statusCounts, maintenanceCount } = computeCounts(items);

    const getNights = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    // Get current filter label for "Showing:" text
    const getFilterLabel = () => {
        if (showArchived) return 'Archived';
        if (filter === 'all') return 'All';
        if (filter === 'maintenance') return 'Maintenance';
        return filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="py-12">
                <Container>
                    <div className="animate-fade-in space-y-4">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="flex gap-2 mb-8">
                             {[1,2,3,4].map(i => <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />)}
                        </div>
                        <div className="h-96 w-full bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
                    </div>
                </Container>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-12">
                <Container>
                    <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
                        <strong>Error:</strong> {error}
                    </div>
                    <button
                        onClick={() => fetchReservations()}
                        className="mt-4 px-4 py-2 bg-[var(--color-accent-gold)] text-[var(--color-text-inverse)] rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Retry
                    </button>
                </Container>
            </div>
        );
    }

    return (
        <div className="py-8 min-h-screen bg-[var(--color-background)]">
            <Container>
                {/* Row 1: Title Only */}
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                        Reservations
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        Manage bookings and blocks
                    </p>
                </div>

                <OnboardingChecklist />

                {/* Row 2: Full-width Status Tabs */}
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
                                    {items.length}
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
                                    <span className="font-semibold text-[var(--color-text-primary)]">{sortedItems.length}</span>
                                    {' '}{sortedItems.length === 1 ? 'result' : 'results'}
                                </>
                            ) : (
                                <>
                                    {' · '}
                                    <span className="font-semibold text-[var(--color-text-primary)]">{sortedItems.length}</span>
                                    {' total'}
                                </>
                            )}
                            {searchQuery && (
                                <>
                                    {' · '}
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-[var(--color-text-muted)]/50 hover:text-[var(--color-text-primary)] transition-colors underline"
                                    >
                                        clear
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 3: Search + Controls */}
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

                {/* Reservations Table */}
                <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 pl-4 py-3 w-10 text-left font-medium text-gray-500 shrink-0">
                                        <input
                                            type="checkbox"
                                            className="rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60"
                                            checked={selectedIds.size > 0 && selectedIds.size === selectableReservations.length}
                                            ref={input => { if (input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < selectableReservations.length; }}
                                            onChange={toggleAll}
                                        />
                                    </th>
                            <th className="px-5 py-3 w-[20%]">Guest</th>
                                    <th className="px-5 py-3 w-[15%] whitespace-nowrap">Dates</th>
                                    <th className="px-5 py-3 w-[20%]">Details</th>
                                    <th className="px-5 py-3 w-[15%]">Campsite</th>
                                    <th className="px-5 py-3 w-[12%]">Status</th>
                                    <th className="px-5 py-3 w-[13%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                                {sortedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-[var(--color-text-muted)]">
                                            No items found matching this filter.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedItems.map((item) => {
                                        // Handle blocking events (maintenance/blackout)
                                        if (item.type === 'maintenance' || item.type === 'blackout') {
                                            const isSelected = selectedIds.has(item.id);
                                            const rowClass = `group transition-colors cursor-pointer border-l-2 opacity-70 ${
                                                isSelected
                                                    ? 'border-l-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
                                                    : 'border-l-transparent hover:bg-[var(--color-surface-elevated)]'
                                            }`;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={rowClass}
                                                    title="Maintenance blocks cannot be bulk-operated"
                                                >
                                                    {/* Checkbox - Disabled for maintenance */}
                                                    <td className="px-3 pl-4 py-4 w-10 align-middle" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center min-h-[28px]">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded-md border-2 border-[var(--color-border-subtle)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 w-5 h-5 opacity-30 cursor-not-allowed"
                                                                disabled
                                                                checked={false}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Guest Column - Show "—" for maintenance */}
                                                    <td className="px-5 py-4 align-top">
                                                        <div className="flex items-center gap-2">
                                                            <Wrench size={16} className="text-[var(--color-text-muted)]" />
                                                            <span className="text-[var(--color-text-muted)] italic">Maintenance Block</span>
                                                        </div>
                                                    </td>

                                                    {/* Dates Column */}
                                                    <td className="px-5 py-4 align-top whitespace-nowrap">
                                                        <div className="text-[var(--color-text-primary)]">
                                                            {new Date(item.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                                            <span className="text-[var(--color-text-muted)] mx-2">→</span>
                                                            {new Date(item.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                                        </div>
                                                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                                            {getNights(item.start_date, item.end_date)} days
                                                        </div>
                                                    </td>

                                                    {/* Details Column - Show reason */}
                                                    <td className="px-5 py-4 align-top">
                                                        <div
                                                            className="text-[var(--color-text-muted)] text-sm truncate max-w-xs"
                                                            title={item.reason || 'No reason specified'}
                                                        >
                                                            {item.reason || 'No reason specified'}
                                                        </div>
                                                    </td>

                                                    {/* Campsite Column */}
                                                    <td className="px-5 py-4 align-middle">
                                                        <div className="flex items-center min-h-[28px]">
                                                            {item.campsite_code ? (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] font-mono font-medium text-[var(--color-text-muted)] text-xs h-7">
                                                                    {item.campsite_code}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[var(--color-text-muted)] text-xs italic">All sites</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Status Column - Show maintenance pill */}
                                                    <td className="px-5 py-4 align-middle">
                                                        <div className="flex items-center min-h-[28px]">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                                🛠️ Blocked
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Actions Column */}
                                                    <td className="px-5 py-4 align-middle text-right">
                                                        <div className="flex items-center justify-end min-h-[28px]">
                                                            <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs">
                                                                Edit
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // Handle regular reservations (guard against non-reservation items)
                                        if (item.type !== 'reservation') {
                                            return null;
                                        }
                                        const reservation = item as unknown as Reservation;
                                        // Row-level styling based on status
                                        const isCancelled = reservation.status === 'cancelled' || reservation.status === 'no_show';
                                        const isCheckedIn = reservation.status === 'checked_in';
                                        const isSelected = selectedIds.has(reservation.id!);

                                        const rowClass = `group transition-colors cursor-pointer border-l-2 ${
                                            isSelected
                                                ? 'border-l-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5'
                                                : 'border-l-transparent'
                                        } ${
                                            isCancelled
                                                ? 'opacity-60 grayscale bg-gray-50/50 dark:bg-gray-900/20'
                                                : isCheckedIn
                                                    ? 'bg-green-50/30 hover:bg-green-50/60 dark:bg-green-900/10 dark:hover:bg-green-900/20'
                                                    : 'hover:bg-[var(--color-surface-elevated)]'
                                        }`;

                                        return (
                                            <tr
                                                key={reservation.id}
                                                className={rowClass}
                                                onClick={() => setSelectedReservation(reservation)}
                                            >
                                                {/* Checkbox Column */}
                                                <td className="px-3 pl-4 py-4 w-10 align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center min-h-[28px]">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded-md border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-0 cursor-pointer w-5 h-5 transition-all hover:border-[var(--color-accent-gold)]/60"
                                                            checked={selectedIds.has(reservation.id!)}
                                                            onChange={() => toggleSelection(reservation.id!, 'reservation')}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Guest Column */}
                                                <td className="px-5 py-4 align-top">
                                                    <div className="font-semibold text-[var(--color-text-primary)] text-base">
                                                        {reservation.first_name} {reservation.last_name}
                                                    </div>
                                                    <div className="text-[var(--color-text-muted)] text-xs mt-0.5">
                                                        {[reservation.email, reservation.phone].filter(Boolean).join(" • ")}
                                                    </div>
                                                </td>

                                                {/* Dates Column */}
                                                <td className="px-5 py-4 align-top whitespace-nowrap">
                                                    <div className="text-[var(--color-text-primary)]">
                                                        {new Date(reservation.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                                        <span className="text-[var(--color-text-muted)] mx-2">→</span>
                                                        {new Date(reservation.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                                    </div>
                                                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                                        {getNights(reservation.check_in, reservation.check_out)} nights
                                                    </div>
                                                </td>

                                                {/* Details Column */}
                                                <td className="px-5 py-4 align-top">
                                                    <div className="flex flex-col gap-1">
                                                         <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                                                            <span className="text-base text-[var(--color-text-muted)]">
                                                                 {reservation.camping_unit?.includes('Tent') ? '⛺' : '🚐'}
                                                            </span>
                                                            <span>{reservation.camping_unit}</span>
                                                        </div>
                                                        <div className="text-xs text-[var(--color-text-muted)] flex gap-2">
                                                            <span>👥 {reservation.adults} Adults, {reservation.children} Kids</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Campsite Column */}
                                                <td className="px-5 py-4 align-middle">
                                                    <div className="flex items-center min-h-[28px]">
                                                        {reservation.campsites ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] font-mono font-medium text-[var(--color-text-primary)] text-xs h-7">
                                                                {reservation.campsites.code}
                                                            </span>
                                                        ) : (
                                                            <button
                                                                className="flex items-center gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded font-medium text-xs transition-colors group/unassigned border border-amber-200/50 dark:border-amber-800/50 h-7"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAssigningReservation(reservation);
                                                                }}
                                                            >
                                                                <AlertTriangle size={14} className="stroke-[2.5]" />
                                                                <span className="font-bold text-xs uppercase tracking-wide translate-y-[0.5px]">Assign</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status Column */}
                                                <td className="px-5 py-4 align-middle">
                                                    <div className="flex items-center min-h-[28px]">
                                                        <StatusPill status={reservation.status} />
                                                    </div>
                                                </td>

                                                {/* Actions Column */}
                                                <td className="px-5 py-4 align-middle text-right">
                                                    <div className="flex items-center justify-end min-h-[28px]">
                                                        <RowActions
                                                            reservation={reservation}
                                                            updateStatus={updateStatus}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Container>

            <ReservationDrawer
                reservation={selectedReservation}
                isOpen={!!selectedReservation}
                onClose={() => setSelectedReservation(null)}
            />

            <AssignmentDialog
                reservation={assigningReservation}
                isOpen={!!assigningReservation}
                onClose={() => setAssigningReservation(null)}
                onAssign={handleAssignCampsite}
            />

            <BulkBar
                selectedCount={selectedIds.size}
                showArchived={showArchived}
                onCheckIn={() => handleBulkAction('check_in')}
                onCheckOut={() => handleBulkAction('check_out')}
                onCancel={() => handleBulkAction('cancel')}
                onAssign={handleBulkAssignRandom}
                onArchive={() => handleBulkArchive('archive')}
                onRestore={() => handleBulkArchive('restore')}
                onClearSelection={() => setSelectedIds(new Set())}
            />
        </div>
    );
}
