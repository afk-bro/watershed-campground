"use client";

import { useEffect, useState, useCallback } from "react";
import { type Reservation, type ReservationStatus, type OverviewItem } from "@/lib/supabase";
import Container from "@/components/Container";
import OnboardingChecklist from "@/components/admin/dashboard/OnboardingChecklist";
import BulkBar from "@/components/admin/reservations/BulkBar";
import ReservationsFilters from "@/components/admin/reservations/ReservationsFilters";
import ReservationsTable from "@/components/admin/reservations/ReservationsTable";
import ReservationDrawer from "@/components/admin/calendar/ReservationDrawer";
import AssignmentDialog from "@/components/admin/AssignmentDialog";
import { computeCounts, sortItems, type SortMode, type FilterType } from "@/lib/admin/reservations/listing";

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

    const [searchQuery, setSearchQuery] = useState("");

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/reservations');
            if (!response.ok) throw new Error('Failed to fetch reservations');

            const { data } = await response.json();

            // Note: Blocking events (maintenance) don't have archived_at, so we'll show them when showArchived is false
            const filtered = showArchived
                ? (data || []).filter((item: unknown): item is OverviewItem => {
                    if (!item || typeof item !== 'object') return false;
                    const anyItem = item as Record<string, unknown>;
                    return anyItem.type === 'reservation' && (anyItem as Record<string, unknown>).archived_at != null;
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
    }, [filter, showArchived, searchQuery]);

    useEffect(() => {
        void fetchReservations();
    }, [fetchReservations]);

    const updateStatus = async (id: string, status: ReservationStatus) => {
        try {
            const response = await fetch(`/api/admin/reservations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error('Failed to update status');
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

    const filteredItems = (() => {
        let result = items;
        
        // 1. Filter by status
        if (filter === 'maintenance') {
            result = result.filter(item => item.type === 'maintenance' || item.type === 'blackout');
        } else if (filter !== 'all') {
            result = result.filter(item => item.type === 'reservation' && item.status === filter);
        }

        // 2. Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item => {
                if (item.type === 'reservation') {
                    const r = item as unknown as Reservation;
                    return (
                        r.first_name.toLowerCase().includes(q) ||
                        r.last_name.toLowerCase().includes(q) ||
                        r.email?.toLowerCase().includes(q) ||
                        r.phone?.includes(q) ||
                        r.id?.toLowerCase().includes(q) ||
                        r.campsites?.code?.toLowerCase().includes(q)
                    );
                } 
                // Maintenance items
                return item.reason?.toLowerCase().includes(q) || item.campsite_code?.toLowerCase().includes(q);
            });
        }
        
        return result;
    })();

    const sortedItems = sortItems(filteredItems, sortMode);
    const selectableReservations = sortedItems.filter(item => item.type === 'reservation');

    // Selection Logic
    const toggleSelection = (id: string, itemType: 'reservation' | 'maintenance' | 'blackout') => {
        if (itemType !== 'reservation') return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === selectableReservations.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(selectableReservations.map(item => item.id)));
    };

    // Bulk Actions
    const handleBulkAction = async (action: 'check_in' | 'check_out' | 'cancel') => {
        if (!confirm(`Are you sure you want to ${action.replace('_', ' ')} ${selectedIds.size} reservations?`)) return;
        try {
            await fetch('/api/admin/reservations/bulk-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: Array.from(selectedIds), status: action }),
            });
            await fetchReservations();
            setSelectedIds(new Set());
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
            const successCount = (data.results || []).filter((r: unknown) => r && typeof r === 'object' && (r as any).success).length;
            const failCount = (data.results || []).length - successCount;
            alert(`Assigned ${successCount} reservations. ${failCount} failed or no spots available.`);
            await fetchReservations();
            if (failCount === 0) setSelectedIds(new Set());
            else {
                const failedIds = new Set<string>((data.results || []).filter((r: unknown) => r && !(r as any).success).map((r: any) => r.id as string));
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
            await fetch('/api/admin/reservations/bulk-archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationIds: Array.from(selectedIds), action }),
            });
            await fetchReservations();
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            alert(`Failed to ${action} items`);
        }
    };

    const { statusCounts, maintenanceCount } = computeCounts(items);

    if (error) {
        return (
            <div className="py-12"><Container><div className="text-red-600">Error: {error}</div><button onClick={() => fetchReservations()}>Retry</button></Container></div>
        );
    }

    return (
        <div className="py-8 min-h-screen bg-[var(--color-background)]">
            <Container>
                <div className="space-y-6">
                    <div className={selectedIds.size > 0 ? "opacity-60 pointer-events-none transition-opacity duration-300" : ""}>
                        <ReservationsFilters
                            filter={filter}
                            setFilter={setFilter}
                            sortMode={sortMode}
                            setSortMode={setSortMode}
                            showArchived={showArchived}
                            setShowArchived={setShowArchived}
                            statusCounts={statusCounts}
                            maintenanceCount={maintenanceCount}
                            totalCount={filteredItems.length}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />
                    </div>

                    <div className="relative sticky top-6 z-40">
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

                    <ReservationsTable 
                        items={sortedItems}
                        loading={loading}
                        selectedIds={selectedIds}
                        selectAllState={selectedIds.size > 0 && selectedIds.size === selectableReservations.length ? 'all' : selectedIds.size > 0 ? 'some' : 'none'}
                        onToggleSelection={toggleSelection}
                        onToggleAll={toggleAll}
                        onSelectReservation={setSelectedReservation}
                        onAssignClick={(res, e) => { e.stopPropagation(); setAssigningReservation(res); }}
                        updateStatus={updateStatus}
                        onClearFilters={() => {
                            setFilter('all');
                            setSearchQuery('');
                        }}
                    />
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


        </div>
    );
}
