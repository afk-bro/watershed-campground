"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Reservation, type ReservationStatus } from "@/lib/supabase";
import StatusPill from "@/components/admin/StatusPill";
import RowActions from "@/components/admin/RowActions";
import Container from "@/components/Container";
import OnboardingChecklist from "@/components/admin/dashboard/OnboardingChecklist";

export default function AdminPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<ReservationStatus | 'all'>('all');

    useEffect(() => {
        fetchReservations();
    }, []);

    async function fetchReservations() {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/reservations');

            if (!response.ok) {
                throw new Error('Failed to fetch reservations');
            }

            const { data } = await response.json();
            setReservations(data || []);
        } catch (err) {
            console.error('Error fetching reservations:', err);
            setError('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(id: string, status: ReservationStatus) {
        try {
            const response = await fetch(`/api/admin/reservations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            // Optimistically update the UI
            setReservations(prev =>
                prev.map(r => r.id === id ? { ...r, status } : r)
            );
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update reservation status');
        }
    }

    const filteredReservations = filter === 'all'
        ? reservations
        : reservations.filter(r => r.status === filter);

    const statusCounts = reservations.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {} as Record<ReservationStatus, number>);

    if (loading) {
        return (
            <div className="py-12">
                <Container>
                    <div className="animate-fade-in">
                        <div className="skeleton-title mb-6" />
                        <div className="skeleton-text mb-3" />
                        <div className="skeleton-text mb-3 w-4/5" />
                        <div className="skeleton-text w-3/5" />
                        <div className="mt-8">
                            <div className="skeleton h-64 w-full" />
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-12">
                <Container>
                    <div className="error-message animate-fade-in">
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
        <div className="py-12">
            <Container>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-brand-forest mb-2">
                            Reservation Management
                        </h1>
                        <p className="text-[var(--color-text-muted)]">
                            View and manage all campground reservations
                        </p>
                    </div>
                    <Link href="/admin/calendar">
                        <button className="bg-[var(--color-accent-gold)] text-[var(--color-text-inverse)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                            📅 View Calendar
                        </button>
                    </Link>
                </div>

                <OnboardingChecklist />

                {/* Filter Buttons */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-surface ${
                            filter === 'all'
                                ? 'bg-[var(--color-accent-gold)] text-[var(--color-text-inverse)]'
                                : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)]'
                        }`}
                    >
                        All ({reservations.length})
                    </button>
                    {(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] as ReservationStatus[]).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-surface ${
                                filter === status
                                    ? 'bg-[var(--color-accent-gold)] text-[var(--color-text-inverse)]'
                                    : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)]'
                            }`}
                        >
                            <StatusPill status={status} /> ({statusCounts[status] || 0})
                        </button>
                    ))}
                </div>

                {/* Reservations Table */}
                <div className="admin-table">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Guest
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Check-in
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Check-out
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Party
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Unit
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Campsite
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {filteredReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                                            No reservations found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReservations.map((reservation) => (
                                        <tr key={reservation.id} className="hover:bg-[var(--color-surface-elevated)] transition-surface">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-[var(--color-text-inverse)]">
                                                    {reservation.first_name} {reservation.last_name}
                                                </div>
                                                <div className="text-xs text-[var(--color-text-muted)]">
                                                    {reservation.city}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-[var(--color-text-primary)]">
                                                    {reservation.email}
                                                </div>
                                                <div className="text-xs text-[var(--color-text-muted)]">
                                                    {reservation.phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                {new Date(reservation.check_in).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                {new Date(reservation.check_out).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                {reservation.adults}A, {reservation.children}C
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                {reservation.camping_unit}
                                            </td>
                                            <td className="px-4 py-3">
                                                {reservation.campsites ? (
                                                    <div>
                                                        <div className="font-medium text-sm text-[var(--color-text-inverse)]">
                                                            {reservation.campsites.code}
                                                        </div>
                                                        <div className="text-xs text-[var(--color-text-muted)]">
                                                            {reservation.campsites.name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[var(--color-text-muted)] italic">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusPill status={reservation.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <RowActions
                                                    reservation={reservation}
                                                    updateStatus={updateStatus}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Container>
        </div>
    );
}
