"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { type Reservation, type ReservationStatus, type OverviewItem } from "@/lib/supabase";
import ReservationDrawer from "@/components/admin/calendar/ReservationDrawer";
import AssignmentDialog from "@/components/admin/AssignmentDialog";
import Container from "@/components/Container";
import OnboardingChecklist from "@/components/admin/dashboard/OnboardingChecklist";
import BulkBar from "@/components/admin/reservations/BulkBar";
import { computeCounts, sortItems, type SortMode, type FilterType } from "@/lib/admin/reservations/listing";
import { useToast } from "@/components/ui/Toast";
import type { ReservationOverviewItem, BlockingEventOverviewItem } from "@/lib/supabase";

// New modular components
import ReservationRow from "@/components/admin/reservations/ReservationRow";
import MaintenanceRow from "@/components/admin/reservations/MaintenanceRow";
import ReservationCard from "@/components/admin/reservations/ReservationCard";
import MaintenanceCard from "@/components/admin/reservations/MaintenanceCard";
import DashboardStats from "@/components/admin/reservations/DashboardStats";
import DashboardSearch from "@/components/admin/reservations/DashboardSearch";
import { DemoDataBanner } from "@/components/admin/DemoDataBanner";
import { useViewportModeContext } from "@/components/providers/ViewportModeProvider";

export default function AdminPage() {
    const { showToast } = useToast();
    const { isPhone } = useViewportModeContext();
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/reservations');
            if (!response.ok) throw new Error('Failed to fetch reservations');

            const { data } = await response.json();

            const filtered = showArchived
                ? (data || []).filter((item: any) => item.type === 'reservation' && item.archived_at != null)
                : (Array.isArray(data) ? data : []);

            setItems(filtered);
        } catch (err) {
            console.error('Error fetching reservations:', err);
            setError('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }, [showArchived]);

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
        if (isSubmitting) return;
        if (status === 'cancelled' && !confirm('Are you sure?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/admin/reservations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!response.ok) throw new Error('Failed to update status');

            await fetchReservations();
            showToast(`Reservation ${status.replace('_', ' ')}`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Failed to update status', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignCampsite = async (reservationId: string, campsiteId: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/reservations/${reservationId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campsiteId }),
            });

            if (!res.ok) throw new Error('Failed to assign campsite');

            await fetchReservations();
            showToast('Campsite assigned successfully', 'success');
        } catch (error) {
            showToast('Failed to assign campsite', 'error');
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkAction = async (action: 'check_in' | 'check_out' | 'cancel') => {
        if (isSubmitting || !confirm(`Process ${selectedIds.size} reservations?`)) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/reservations/bulk-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: Array.from(selectedIds), status: action }),
            });
            if (!res.ok) throw new Error('Bulk update failed');
            await fetchReservations();
            setSelectedIds(new Set());
            showToast(`${selectedIds.size} reservations updated`, 'success');
        } catch (error) {
            showToast("Failed to perform bulk action", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkAssignRandom = async () => {
        if (isSubmitting || !confirm(`Auto-assign ${selectedIds.size} reservations?`)) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/reservations/bulk-assign-random', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: Array.from(selectedIds) }),
            });
            const data = await res.json();
            const successCount = (data.results || []).filter((r: any) => r.success).length;
            showToast(`Assigned ${successCount} reservations.`, 'success');
            await fetchReservations();
            setSelectedIds(new Set());
        } catch (error) {
            showToast("Failed to run bulk assignment", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkArchive = async (action: 'archive' | 'restore') => {
        if (isSubmitting || !confirm(`${action} ${selectedIds.size} items?`)) return;
        setIsSubmitting(true);
        try {
            await fetch('/api/admin/reservations/bulk-archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: Array.from(selectedIds), action }),
            });
            await fetchReservations();
            setSelectedIds(new Set());
            showToast(`Items ${action}d`, 'success');
        } catch (error) {
            showToast(`Failed to ${action} items`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleArchive = async (reservationId: string) => {
        if (isSubmitting || !confirm('Archive this reservation?')) return;
        setIsSubmitting(true);
        try {
            await fetch('/api/admin/reservations/bulk-archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: [reservationId], action: 'archive' }),
            });
            await fetchReservations();
            showToast('Reservation archived', 'success');
        } catch (error) {
            showToast('Failed to archive reservation', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMaintenance = async (maintenanceId: string) => {
        if (isSubmitting || !confirm('Delete maintenance block?')) return;
        setIsSubmitting(true);
        try {
            await fetch(`/api/admin/blackout-dates/${maintenanceId}`, { method: 'DELETE' });
            await fetchReservations();
            showToast('Maintenance block deleted', 'success');
        } catch (error) {
            showToast('Failed to delete', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter and Sort Logic
    const statusFilteredItems = useMemo(() => {
        if (filter === 'all') return items;
        if (filter === 'maintenance') return items.filter(item => item.type === 'maintenance' || item.type === 'blackout');
        return items.filter(item => item.type === 'reservation' && item.status === filter);
    }, [items, filter]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return statusFilteredItems;
        const q = searchQuery.toLowerCase();
        
        return statusFilteredItems.filter(item => {
            if (item.type === 'reservation') {
                const res = item as any;
                const fullName = `${res.first_name || ''} ${res.last_name || ''}`.toLowerCase();
                const email = (res.email || '').toLowerCase();
                const phone = (res.phone || '').toLowerCase();
                const id = (res.id || '').toLowerCase();
                const campsiteCode = (res.campsites?.code || '').toLowerCase();
                
                return fullName.includes(q) || 
                       email.includes(q) || 
                       phone.includes(q) || 
                       id.includes(q) || 
                       campsiteCode.includes(q);
            } else {
                // Maintenance / Blackout items
                const mt = item as any;
                const reason = (mt.reason || '').toLowerCase();
                const campsiteCode = (mt.campsite_code || '').toLowerCase();
                return reason.includes(q) || campsiteCode.includes(q);
            }
        });
    }, [statusFilteredItems, searchQuery]);

    const sortedItems = useMemo(() => sortItems(filteredItems, sortMode), [filteredItems, sortMode]);
    const selectableReservations = useMemo(() => sortedItems.filter(item => item.type === 'reservation'), [sortedItems]);
    const { statusCounts, maintenanceCount } = useMemo(() => computeCounts(items), [items]);

    const getFilterLabel = () => {
        if (showArchived) return 'Archived';
        if (filter === 'all') return 'All';
        if (filter === 'maintenance') return 'Maintenance';
        return filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    if (loading) return <div className="py-12"><Container><div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-900 rounded-lg" /></Container></div>;
    if (error) return <div className="py-12"><Container><div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div></Container></div>;

    return (
        <div className="py-8 min-h-screen bg-[var(--color-background)]">
            <Container>
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Reservations</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Manage bookings and blocks</p>
                </div>

                <DemoDataBanner 
                    hasNonDemoReservations={items.some(item => 
                        item.type === 'reservation' && 
                        (!(item as any).metadata || (item as any).metadata.is_demo !== true)
                    )}
                    onSeedComplete={() => fetchReservations()}
                />

                <OnboardingChecklist />

                <DashboardStats
                    filter={filter}
                    setFilter={setFilter}
                    showArchived={showArchived}
                    totalCount={items.length}
                    statusCounts={statusCounts}
                    maintenanceCount={maintenanceCount}
                    sortedItemsCount={sortedItems.length}
                    searchQuery={searchQuery}
                    onClearSearch={() => setSearchQuery('')}
                    getFilterLabel={getFilterLabel}
                />

                <DashboardSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortMode={sortMode}
                    setSortMode={setSortMode}
                    showArchived={showArchived}
                    setShowArchived={setShowArchived}
                    searchInputRef={searchInputRef}
                />

                {/* Mobile Card View */}
                {isPhone ? (
                    <div className="space-y-3">
                        {sortedItems.length === 0 ? (
                            <div className="bg-[var(--color-surface-card)] rounded-lg border border-[var(--color-border-subtle)] p-8 text-center text-[var(--color-text-muted)]">
                                No items found.
                            </div>
                        ) : (
                            <>
                                {selectableReservations.length > 0 && (
                                    <div className="bg-[var(--color-surface-card)] rounded-lg border border-[var(--color-border-subtle)] p-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded-md w-5 h-5 cursor-pointer border-2 border-[var(--color-border-subtle)] checked:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)]"
                                                checked={selectedIds.size > 0 && selectedIds.size === selectableReservations.length}
                                                onChange={() => setSelectedIds(selectedIds.size === selectableReservations.length ? new Set() : new Set(selectableReservations.map(i => i.id)))}
                                            />
                                            <span className="text-sm text-[var(--color-text-secondary)]">
                                                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                                            </span>
                                        </label>
                                    </div>
                                )}
                                {sortedItems.map(item => (
                                    item.type === 'reservation' ? (
                                        <ReservationCard
                                            key={item.id}
                                            reservation={item as any}
                                            isSelected={selectedIds.has(item.id)}
                                            isSubmitting={isSubmitting}
                                            onToggle={() => toggleSelection(item.id)}
                                            onClick={setSelectedReservation}
                                            updateStatus={updateStatus}
                                            handleArchive={handleArchive}
                                            setAssigningReservation={setAssigningReservation}
                                        />
                                    ) : (
                                        <MaintenanceCard
                                            key={item.id}
                                            item={item as BlockingEventOverviewItem}
                                            isSelected={selectedIds.has(item.id)}
                                            isSubmitting={isSubmitting}
                                            onToggle={() => toggleSelection(item.id)}
                                            onDelete={handleDeleteMaintenance}
                                        />
                                    )
                                ))}
                            </>
                        )}
                    </div>
                ) : (
                    /* Desktop Table View */
                    <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed border-collapse">
                                <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-3 pl-4 py-3 w-10 text-left">
                                            <input
                                                type="checkbox"
                                                className="rounded-md w-5 h-5 cursor-pointer"
                                                checked={selectedIds.size > 0 && selectedIds.size === selectableReservations.length}
                                                onChange={() => setSelectedIds(selectedIds.size === selectableReservations.length ? new Set() : new Set(selectableReservations.map(i => i.id)))}
                                            />
                                        </th>
                                        <th className="px-5 py-3 w-[260px] border-l border-[var(--color-border-default)]/20">Guest</th>
                                        <th className="px-5 py-3 w-[180px] border-l border-[var(--color-border-default)]/20">Dates</th>
                                        <th className="px-5 py-3 min-w-0 border-l border-[var(--color-border-default)]/20">Details</th>
                                        <th className="px-5 py-3 w-[110px] text-center border-l border-[var(--color-border-default)]/20">Campsite</th>
                                        <th className="px-5 py-3 w-[180px] text-center border-l border-[var(--color-border-default)]/20">Status</th>
                                        <th className="px-5 py-3 w-[90px] text-center border-l border-[var(--color-border-default)]/20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                                    {sortedItems.length === 0 ? (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-[var(--color-text-muted)]">No items found.</td></tr>
                                    ) : (
                                        sortedItems.map(item => (
                                            item.type === 'reservation' ? (
                                                <ReservationRow
                                                    key={item.id}
                                                    reservation={item as any}
                                                    isSelected={selectedIds.has(item.id)}
                                                    isSubmitting={isSubmitting}
                                                    onToggle={() => toggleSelection(item.id)}
                                                    onClick={setSelectedReservation}
                                                    updateStatus={updateStatus}
                                                    handleArchive={handleArchive}
                                                    setAssigningReservation={setAssigningReservation}
                                                />
                                            ) : (
                                                <MaintenanceRow
                                                    key={item.id}
                                                    item={item as BlockingEventOverviewItem}
                                                    isSelected={selectedIds.has(item.id)}
                                                    isSubmitting={isSubmitting}
                                                    onToggle={() => toggleSelection(item.id)}
                                                    onDelete={handleDeleteMaintenance}
                                                />
                                            )
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Container>

            <ReservationDrawer reservation={selectedReservation} isOpen={!!selectedReservation} onClose={() => setSelectedReservation(null)} />
            <AssignmentDialog reservation={assigningReservation} isOpen={!!assigningReservation} onClose={() => setAssigningReservation(null)} onAssign={handleAssignCampsite} />
            <BulkBar
                selectedCount={selectedIds.size}
                showArchived={showArchived}
                isSubmitting={isSubmitting}
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
