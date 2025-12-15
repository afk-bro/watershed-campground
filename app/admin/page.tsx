"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { supabase, type Reservation, type ReservationStatus } from "@/lib/supabase";
import StatusPill from "@/components/admin/StatusPill";
import RowActions from "@/components/admin/RowActions";
import ReservationDrawer from "@/components/admin/calendar/ReservationDrawer";
import AssignmentDialog from "@/components/admin/AssignmentDialog";
import Container from "@/components/Container";
import OnboardingChecklist from "@/components/admin/dashboard/OnboardingChecklist";

export default function AdminPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<ReservationStatus | 'all'>('all');
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);

    // Clear selection when filter changes to avoid confusion
    useEffect(() => {
        setSelectedIds(new Set());
    }, [filter, showArchived]);

    useEffect(() => {
        fetchReservations();
    }, [showArchived]); // Re-fetch when archive mode toggles

    useEffect(() => {
        fetchReservations();
    }, []);

    const updateStatus = async (id: string, status: ReservationStatus) => {
        const { error } = await supabase
            .from('reservations')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
            return;
        }

        fetchReservations();
    };

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/reservations');
            if (!response.ok) {
                throw new Error('Failed to fetch reservations');
            }

            const { data } = await response.json();

            // Filter archived/non-archived client-side
            let filtered = data || [];
            if (showArchived) {
                filtered = filtered.filter((r: Reservation) => r.archived_at !== null);
            } else {
                filtered = filtered.filter((r: Reservation) => r.archived_at === null);
            }

            setReservations(filtered);
        } catch (err) {
            console.error('Error fetching reservations:', err);
            setError('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }

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

        fetchReservations();
    };

    const filteredReservations = filter === 'all'
        ? reservations
        : reservations.filter(r => r.status === filter);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredReservations.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredReservations.map(r => r.id!))); // id! assumption safe for fetched data
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
            const successCount = data.results.filter((r: any) => r.success).length;
            const failCount = data.results.length - successCount;
            
            alert(`Assigned ${successCount} reservations. ${failCount} failed or no spots available.`);
            
            fetchReservations();
            
            // Keep failures selected? For now clear all to be simple, 
            // but advanced UX would be: set selection to just the failed IDs.
            if (failCount === 0) {
                setSelectedIds(new Set());
            } else {
                 const failedIds = new Set<string>(
                    data.results.filter((r: any) => !r.success).map((r: any) => r.id as string)
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

    const statusCounts = reservations.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {} as Record<ReservationStatus, number>);

    const getNights = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        Reservations
                    </h1>
                </div>

                <OnboardingChecklist />

                {/* Filter Tabs & Actions */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-default)] pb-2">
                    <div className="flex overflow-x-auto gap-1 items-center">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                filter === 'all'
                                    ? 'border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]'
                                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            }`}
                        >
                            {showArchived ? 'Archived' : 'All'} ({reservations.length})
                        </button>
                        {!showArchived && (['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as ReservationStatus[]).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${
                                    filter === status
                                        ? 'border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]'
                                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                {status.replace('_', ' ')} <span className="text-xs opacity-70 ml-1">({statusCounts[status] || 0})</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="rounded border-gray-300 text-[var(--color-accent-gold)] focus:ring-[var(--color-accent-gold)]"
                            />
                            Show Archived
                        </label>
                        <Link href="/admin/calendar">
                            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] rounded-md transition-colors whitespace-nowrap">
                                <span>📅</span> Calendar
                            </button>
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
                                    className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                                    checked={selectedIds.size > 0 && selectedIds.size === filteredReservations.length}
                                    ref={input => { if (input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredReservations.length; }}
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
                                {filteredReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-[var(--color-text-muted)]">
                                            No reservations found matching this filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReservations.map((reservation) => {
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
                                                <td className="px-3 pl-4 py-4 w-10 align-top" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                                                        checked={selectedIds.has(reservation.id!)}
                                                        onChange={() => toggleSelection(reservation.id!)}
                                                    />
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

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-full px-6 py-3 flex items-center gap-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                            {selectedIds.size}
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">Selected</span>
                    </div>
                    
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                    
                    <div className="flex items-center gap-2">
                        <button 
                             onClick={() => handleBulkAction('check_in')}
                             className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
                        >
                            Check In
                        </button>
                        <button 
                             onClick={() => handleBulkAction('check_out')}
                             className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
                        >
                            Check Out
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                    
                    {!showArchived ? (
                         <>
                            <button 
                                onClick={handleBulkAssignRandom}
                                className="px-3 py-1.5 hover:bg-amber-50 text-amber-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Auto-Assign
                            </button>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                            <button 
                                onClick={() => handleBulkArchive('archive')}
                                className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Archive
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => handleBulkArchive('restore')}
                            className="px-3 py-1.5 hover:bg-green-50 text-green-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            Restore
                        </button>
                    )}

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                    <button 
                        onClick={() => handleBulkAction('cancel')}
                         className="px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                    <button 
                        onClick={() => setSelectedIds(new Set())}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
