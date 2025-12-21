"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import type { Reservation } from "@/lib/supabase";

function ManageReservationContent() {
    const searchParams = useSearchParams();
    const rid = searchParams.get('rid');
    const token = searchParams.get('t');

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!rid || !token) {
            setError('Invalid or missing reservation link');
            setLoading(false);
            return;
        }

        async function fetchReservation() {
            try {
                setLoading(true);
                const response = await fetch('/api/public/manage-reservation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reservation_id: rid, token }),
                });

                if (!response.ok) {
                    const { error } = await response.json();
                    throw new Error(error || 'Failed to load reservation');
                }

                const { reservation } = await response.json();
                setReservation(reservation);
            } catch (err: any) {
                setError(err.message || 'Failed to load reservation');
            } finally {
                setLoading(false);
            }
        }

        fetchReservation();
    }, [rid, token]);

    async function handleCancel() {
        if (!rid || !token) return;
        if (!confirm('Are you sure you want to cancel this reservation? This action cannot be undone.')) {
            return;
        }

        try {
            setCancelling(true);
            const response = await fetch('/api/public/manage-reservation/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservation_id: rid, token }),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Failed to cancel reservation');
            }

            const { reservation } = await response.json();
            setReservation(reservation);
            alert('Your reservation has been cancelled successfully.');
        } catch (err: any) {
            alert(err.message || 'Failed to cancel reservation');
        } finally {
            setCancelling(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 py-12">
                <Container>
                    <div className="text-center">Loading your reservation...</div>
                </Container>
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen bg-slate-50 py-12">
                <Container>
                    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
                        <div className="text-center">
                            <h1 className="text-2xl font-heading font-bold text-red-600 mb-4">
                                Unable to Load Reservation
                            </h1>
                            <p className="text-slate-600 mb-6">{error}</p>
                            <p className="text-sm text-slate-500">
                                Please check your email for the correct link, or contact us for assistance.
                            </p>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    const canCancel = reservation.status === 'pending' || reservation.status === 'confirmed';

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <Container>
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-brand-forest px-6 py-8">
                            <h1 className="text-3xl font-heading font-bold text-accent-gold mb-2">
                                Your Reservation
                            </h1>
                            <p className="text-accent-beige">
                                Manage your reservation details below
                            </p>
                        </div>

                        {/* Status */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Status:</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    reservation.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                    reservation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                                    reservation.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                    reservation.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                                    reservation.status === 'checked_out' ? 'bg-slate-200 text-slate-700' :
                                    'bg-zinc-200 text-zinc-800'
                                }`}>
                                    {reservation.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="px-6 py-6 space-y-6">
                            <div>
                                <h2 className="text-lg font-heading font-semibold text-brand-forest mb-4">
                                    Guest Information
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-600">Name</p>
                                        <p className="font-medium text-slate-900">
                                            {reservation.first_name} {reservation.last_name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Email</p>
                                        <p className="font-medium text-slate-900">{reservation.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Phone</p>
                                        <p className="font-medium text-slate-900">{reservation.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">City</p>
                                        <p className="font-medium text-slate-900">{reservation.city}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-6">
                                <h2 className="text-lg font-heading font-semibold text-brand-forest mb-4">
                                    Reservation Details
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-600">Check-in</p>
                                        <p className="font-medium text-slate-900">
                                            {new Date(reservation.check_in).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Check-out</p>
                                        <p className="font-medium text-slate-900">
                                            {new Date(reservation.check_out).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Party Size</p>
                                        <p className="font-medium text-slate-900">
                                            {reservation.adults} Adults, {reservation.children} Children
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Camping Unit</p>
                                        <p className="font-medium text-slate-900">{reservation.camping_unit}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">RV Length</p>
                                        <p className="font-medium text-slate-900">{reservation.rv_length}</p>
                                    </div>
                                    {reservation.rv_year && (
                                        <div>
                                            <p className="text-sm text-slate-600">RV Year</p>
                                            <p className="font-medium text-slate-900">{reservation.rv_year}</p>
                                        </div>
                                    )}
                                </div>
                                {reservation.comments && (
                                    <div className="mt-4">
                                        <p className="text-sm text-slate-600">Comments</p>
                                        <p className="font-medium text-slate-900">{reservation.comments}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {canCancel && (
                                <div className="border-t border-slate-200 pt-6">
                                    <button
                                        onClick={handleCancel}
                                        disabled={cancelling}
                                        className="w-full bg-rose-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
                                    </button>
                                    <p className="text-sm text-slate-500 text-center mt-3">
                                        Need to make changes? Please contact us directly.
                                    </p>
                                </div>
                            )}

                            {reservation.status === 'cancelled' && (
                                <div className="border-t border-slate-200 pt-6">
                                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                        <p className="text-rose-800 text-center">
                                            This reservation has been cancelled. If you have questions, please contact us.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}

export default function ManageReservationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 py-12">
                <Container>
                    <div className="text-center">Loading...</div>
                </Container>
            </div>
        }>
            <ManageReservationContent />
        </Suspense>
    );
}
