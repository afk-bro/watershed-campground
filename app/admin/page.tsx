"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { type Reservation, type ReservationStatus } from "@/lib/supabase";
import ReservationDrawer from "@/components/admin/calendar/ReservationDrawer";
import AssignmentDialog from "@/components/admin/AssignmentDialog";
import Container from "@/components/Container";
import OnboardingChecklist from "@/components/admin/dashboard/OnboardingChecklist";
import BulkBar from "@/components/admin/reservations/BulkBar";
import { computeCounts } from "@/lib/admin/reservations/listing";
import { useToast } from "@/components/ui/Toast";
import type { BlockingEventOverviewItem } from "@/lib/supabase";

// New modular components
import ReservationRow from "@/components/admin/reservations/ReservationRow";
import MaintenanceRow from "@/components/admin/reservations/MaintenanceRow";
import ReservationCard from "@/components/admin/reservations/ReservationCard";
import MaintenanceCard from "@/components/admin/reservations/MaintenanceCard";
import DashboardStats from "@/components/admin/reservations/DashboardStats";
import DashboardSearch from "@/components/admin/reservations/DashboardSearch";
import { DemoDataBanner } from "@/components/admin/DemoDataBanner";
import { useViewportModeContext } from "@/components/providers/ViewportModeProvider";

// Custom hooks
import { useReservationData } from "@/hooks/admin/useReservationData";
import { useReservationFilters } from "@/hooks/admin/useReservationFilters";
import { useBulkActions } from "@/hooks/admin/useBulkActions";
import { API_ENDPOINTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/admin/constants";

export default function AdminPage() {
    const { showToast } = useToast();
    const { isPhone } = useViewportModeContext();

    // UI state
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data fetching hook
    const { items, loading, error, refetch } = useReservationData({ showArchived });

    // Filtering and sorting hook
    const {
        filter,
        setFilter,
        sortMode,
        setSortMode,
        searchQuery,
        setSearchQuery,
        sortedItems,
    } = useReservationFilters(items);

    // Bulk actions hook
    const bulkActions = useBulkActions({
        onSuccess: async () => {
            await refetch();
            setSelectedIds(new Set());
        },
    });

    // Clear selection when filter or archived state changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [filter, showArchived]);

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
            const response = await fetch(API_ENDPOINTS.RESERVATION_DETAIL(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!response.ok) throw new Error(ERROR_MESSAGES.RESERVATION_UPDATE_FAILED);

            await refetch();
            showToast(`Reservation ${status.replace('_', ' ')}`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast(ERROR_MESSAGES.RESERVATION_UPDATE_FAILED, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignCampsite = async (reservationId: string, campsiteId: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(API_ENDPOINTS.RESERVATION_ASSIGN(reservationId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campsiteId }),
            });

            if (!res.ok) throw new Error(ERROR_MESSAGES.CAMPSITE_ASSIGN_FAILED);

            await refetch();
            showToast(SUCCESS_MESSAGES.CAMPSITE_ASSIGNED, 'success');
        } catch (error) {
            showToast(ERROR_MESSAGES.CAMPSITE_ASSIGN_FAILED, 'error');
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };
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
                    onSeedComplete={() => refetch()}
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
                                            isSubmitting={bulkActions.isSubmitting || isSubmitting}
                                            onToggle={() => toggleSelection(item.id)}
                                            onClick={setSelectedReservation}
                                            updateStatus={updateStatus}
                                            handleArchive={bulkActions.handleArchive}
                                            setAssigningReservation={setAssigningReservation}
                                        />
                                    ) : (
                                        <MaintenanceCard
                                            key={item.id}
                                            item={item as BlockingEventOverviewItem}
                                            isSelected={selectedIds.has(item.id)}
                                            isSubmitting={bulkActions.isSubmitting}
                                            onToggle={() => toggleSelection(item.id)}
                                            onDelete={bulkActions.handleDeleteMaintenance}
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
                                                    isSubmitting={bulkActions.isSubmitting || isSubmitting}
                                                    onToggle={() => toggleSelection(item.id)}
                                                    onClick={setSelectedReservation}
                                                    updateStatus={updateStatus}
                                                    handleArchive={bulkActions.handleArchive}
                                                    setAssigningReservation={setAssigningReservation}
                                                />
                                            ) : (
                                                <MaintenanceRow
                                                    key={item.id}
                                                    item={item as BlockingEventOverviewItem}
                                                    isSelected={selectedIds.has(item.id)}
                                                    isSubmitting={bulkActions.isSubmitting}
                                                    onToggle={() => toggleSelection(item.id)}
                                                    onDelete={bulkActions.handleDeleteMaintenance}
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
                isSubmitting={bulkActions.isSubmitting || isSubmitting}
                onCheckIn={() => bulkActions.handleBulkAction('check_in', selectedIds)}
                onCheckOut={() => bulkActions.handleBulkAction('check_out', selectedIds)}
                onCancel={() => bulkActions.handleBulkAction('cancel', selectedIds)}
                onAssign={() => bulkActions.handleBulkAssignRandom(selectedIds)}
                onArchive={() => bulkActions.handleBulkArchive('archive', selectedIds)}
                onRestore={() => bulkActions.handleBulkArchive('restore', selectedIds)}
                onClearSelection={() => setSelectedIds(new Set())}
            />
        </div>
    );
}
