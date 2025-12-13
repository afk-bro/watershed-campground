"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Reservation, type ReservationStatus } from "@/lib/supabase";
import StatusPill from "@/components/admin/StatusPill";
import RowActions from "@/components/admin/RowActions";
import Container from "@/components/Container";

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
                    <div className="text-center">Loading reservations...</div>
                </Container>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-12">
                <Container>
                    <div className="text-center text-red-600">{error}</div>
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
                        <p className="text-slate-600">
                            View and manage all campground reservations
                        </p>
                    </div>
                    <Link href="/admin/calendar">
                        <button className="bg-accent-gold text-brand-forest px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all">
                            📅 View Calendar
                        </button>
                    </Link>
                </div>

                {/* Filter Buttons */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === 'all'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        All ({reservations.length})
                    </button>
                    {(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] as ReservationStatus[]).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === status
                                    ? 'bg-brand-forest text-accent-beige'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <StatusPill status={status} /> ({statusCounts[status] || 0})
                        </button>
                    ))}
                </div>

                {/* Reservations Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-100 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Guest
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Check-in
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Check-out
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Party
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Unit
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Campsite
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                                            No reservations found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReservations.map((reservation) => (
                                        <tr key={reservation.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">
                                                    {reservation.first_name} {reservation.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {reservation.city}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-700">
                                                    {reservation.email}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {reservation.phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {new Date(reservation.check_in).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {new Date(reservation.check_out).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {reservation.adults}A, {reservation.children}C
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {reservation.camping_unit}
                                            </td>
                                            <td className="px-4 py-3">
                                                {reservation.campsite ? (
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">
                                                            {reservation.campsite.code}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {reservation.campsite.name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">
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
