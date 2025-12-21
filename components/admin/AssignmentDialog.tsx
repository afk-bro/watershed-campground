
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Or use API
import { X, Tent, Check } from 'lucide-react';
import type { Reservation } from '@/lib/supabase';

interface Campsite {
    id: string;
    name: string;
    code: string;
    type: string;
    max_rv_length: number | null;
    max_guests: number;
}

interface Props {
    reservation: Reservation | null;
    isOpen: boolean;
    onClose: () => void;
    onAssign: (reservationId: string, campsiteId: string) => Promise<void>;
}

export default function AssignmentDialog({ reservation, isOpen, onClose, onAssign }: Props) {
    const [campsites, setCampsites] = useState<Campsite[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && reservation) {
            fetchAvailability();
        }
    }, [isOpen, reservation]);

    const fetchAvailability = async () => {
        if (!reservation) return;
        setLoading(true);
        setError(null);

        try {
            const body = {
                checkIn: reservation.check_in,
                checkOut: reservation.check_out,
                guestCount: (reservation.adults || 0) + (reservation.children || 0),
                // We could pass rvLength if we had it parsed from camping_unit or separate field
            };

            const res = await fetch('/api/availability/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Failed to fetch availability');
            
            const data = await res.json();
            setCampsites(data); // Assuming API returns Campsite[]
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (campsiteId: string) => {
        if (!reservation) return;
        setAssigningId(campsiteId);
        try {
            if (!reservation.id) throw new Error("Reservation ID missing");
            await onAssign(reservation.id, campsiteId);
            onClose();
        } catch (err) {
            alert('Failed to assign');
        } finally {
            setAssigningId(null);
        }
    };

    if (!isOpen || !reservation) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">Assign Campsite</h3>
                        <p className="text-sm text-gray-500">
                            For {reservation.first_name} {reservation.last_name} ({new Date(reservation.check_in).toLocaleDateString()} - {new Date(reservation.check_out).toLocaleDateString()})
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    ) : campsites.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Tent className="mx-auto mb-3 opacity-20" size={48} />
                            <p>No available campsites found for these dates and criteria.</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {campsites.map(site => (
                                <button
                                    key={site.id}
                                    onClick={() => handleAssign(site.id)}
                                    disabled={!!assigningId}
                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-primary hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 transition-all group text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300">
                                            {site.code}
                                        </div>
                                        <div>
                                            <div className="font-medium">{site.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {site.type} • Max {site.max_guests} guests {site.max_rv_length ? `• ${site.max_rv_length}ft` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    {assigningId === site.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary" />
                                    ) : (
                                        <div className="opacity-0 group-hover:opacity-100 text-brand-primary font-medium text-sm flex items-center gap-1">
                                            Assign <Check size={14} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
