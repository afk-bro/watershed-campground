"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Container from "@/components/Container";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { toLocalMidnight, getLocalToday } from "@/lib/date";

type Addon = {
    id: string;
    name: string;
    price: number;
};

type Campsite = {
    id: string;
    name: string;
    type: string;
    base_rate: number;
    max_guests: number;
};

type ReservationFormData = {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    postalCode: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    rvLength: string;
    adults: number;
    children: number;
    campingUnit: string;
    contactMethod: string;
    campsiteId: string;
    comments: string;
    isOffline: boolean;
    forceConflict: boolean;
    overrideBlackout: boolean;
    sendGuestEmail: boolean;
    overrideReason: string;
};

const initialFormData: ReservationFormData = {
    firstName: "",
    lastName: "",
    address1: "",
    city: "",
    postalCode: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    rvLength: "0",
    adults: 1,
    children: 0,
    campingUnit: "RV",
    contactMethod: "Email",
    campsiteId: "",
    comments: "Manual Booking",
    isOffline: true,
    forceConflict: false,
    overrideBlackout: false,
    sendGuestEmail: false,
    overrideReason: ""
};

function ReservationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { showToast } = useToast();
    
    // State
    const [step, setStep] = useState(1);
    const [campsites, setCampsites] = useState<Campsite[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState<ReservationFormData>(initialFormData);
    const [validationResult, setValidationResult] = useState<{
        available: boolean;
        message?: string;
        conflicts?: Array<{ id: string; type: 'reservation' | 'blackout'; details?: string }>;
    } | null>(null);

    const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

    useEffect(() => {
        const checkAvailability = async () => {
            if (!formData.checkIn || !formData.checkOut || !formData.campsiteId || !formData.adults) {
                setValidationResult(null);
                return;
            }

            try {
                const res = await fetch('/api/availability/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        checkIn: formData.checkIn,
                        checkOut: formData.checkOut,
                        campsiteId: formData.campsiteId,
                        guestCount: formData.adults + formData.children,
                        ignorePastCheck: true // Admin can backdate, so we check purely for conflicts
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setValidationResult(data);
                }
            } catch (error) {
                console.error("Availability check failed", error);
            }
        };

        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }, [formData.checkIn, formData.checkOut, formData.campsiteId, formData.adults, formData.children]);

    useEffect(() => {
        // Auto-populate from URL
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const campsite = searchParams.get('campsite'); // Note: ID or Code? Usually ID passed from calendar

        if (start || end || campsite) {
            setFormData(prev => ({
                ...prev,
                checkIn: start || prev.checkIn,
                checkOut: end || prev.checkOut,
                campsiteId: campsite || prev.campsiteId
            }));
        }
    }, [searchParams]);

    useEffect(() => {
        // Fetch Metadata
        const fetchData = async () => {
             const { data: add } = await supabase.from('addons').select('*').eq('is_active', true);
             if (add) setAddons(add);

             const { data: camps } = await supabase.from('campsites').select('*').eq('is_active', true).order('name');
             if (camps) setCampsites(camps);
        };
        fetchData();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Client-side validation for dates
            const checkInDate = toLocalMidnight(formData.checkIn);
            const today = getLocalToday();
            
            // Allow 1 day tolerance (same as server)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            console.log('[DEBUG] Date Validation:', {
                checkInStr: formData.checkIn,
                checkInDate: checkInDate.toString(),
                today: today.toString(),
                yesterday: yesterday.toString(),
                isPast: checkInDate < yesterday
            });

            if (checkInDate < yesterday && !formData.isOffline) {
                throw new Error("Check-in date cannot be in the past");
            }

            // Get Session Token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const addonsPayload = Object.entries(selectedAddons)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => {
                    const add = addons.find(a => a.id === id);
                    return { id, quantity: qty, price: add?.price || 0 };
                });

            const res = await fetch("/api/reservation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    ...formData,
                    addons: addonsPayload
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create reservation");
            }

            showToast("Reservation created successfully!", "success");
            router.push("/admin");
        } catch (err: unknown) {
            console.error(err);
            showToast(err instanceof Error ? err.message : "Unknown error", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12">
            <Container>
                 <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-heading font-bold text-accent-gold">New Manual Reservation</h1>
                    <Link href="/admin"><button className="text-[var(--color-text-muted)] hover:underline">Cancel</button></Link>
                 </div>

                 <form onSubmit={handleSubmit} className="max-w-2xl admin-card p-8 space-y-6">
                    {/* Dates & Site */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-primary)]">Check In</label>
                            <input type="date" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-[var(--color-text-primary)]">Check Out</label>
                            <input type="date" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)]">Campsite</label>
                        <select required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.campsiteId} onChange={e => setFormData({...formData, campsiteId: e.target.value})}>
                            <option value="">Select a Site...</option>
                            {campsites.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">Note: Does not auto-check availability. Using &quot;Force&quot; logic in API if ID provided? No, API still checks. Please check calendar first.</p>
                    </div>

                    {/* Guests */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-[var(--color-text-primary)]">Adults</label>
                            <input type="number" min="1" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-[var(--color-text-primary)]">Children</label>
                             <input type="number" min="0" className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.children} onChange={e => setFormData({...formData, children: parseInt(e.target.value)})} />
                        </div>
                    </div>

                    {/* Contact */}
                     <div className="space-y-4 border-t border-[var(--color-border-default)] pt-4">
                        <h3 className="font-bold text-[var(--color-text-primary)]">Guest Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="First Name" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                             <input type="text" placeholder="Last Name" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                        <input type="email" placeholder="Email" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input type="tel" placeholder="Phone" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        <input type="text" placeholder="Address" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} />

                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="City" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                             <input type="text" placeholder="Postal Code" required className="w-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] p-2 rounded" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                        </div>
                     </div>

                     {/* Payment Override */}
                     <div className="bg-[var(--color-warning)]/10 p-4 rounded border border-[var(--color-warning)]/30">
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox"
                                    id="isOffline" 
                                    checked={formData.isOffline}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isOffline: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <label htmlFor="isOffline" className="text-sm font-medium text-gray-700">Mark as Paid (Offline / Admin Booking)</label>
                            </div>

                            {/* Admin Overrides Section */}
                            {formData.isOffline && (
                                <div className="ml-6 mt-2 p-3 bg-gray-50 border rounded-md space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700">Admin Overrides</h4>

                                    {/* Warning Summary */}
                                    {validationResult && !validationResult.available && (
                                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                                            <div className="flex">
                                                <div className="ml-3">
                                                    <p className="text-sm text-amber-700 font-bold">
                                                        ⚠️ Conflict Detected
                                                    </p>
                                                    <p className="text-sm text-amber-700">
                                                        {validationResult.message}
                                                    </p>
                                                    {validationResult.conflicts && validationResult.conflicts.length > 0 && (
                                                        <ul className="mt-1 text-xs text-amber-800 list-disc list-inside">
                                                            {validationResult.conflicts.map((c, i) => (
                                                                <li key={i}>{c.details}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox"
                                            id="forceConflict" 
                                            checked={formData.forceConflict}
                                            onChange={(e) => setFormData(prev => ({ ...prev, forceConflict: e.target.checked }))}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <label htmlFor="forceConflict" className="text-sm text-gray-700">Force Overlap (Ignore Conflicts)</label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox"
                                            id="overrideBlackout" 
                                            checked={formData.overrideBlackout}
                                            onChange={(e) => setFormData(prev => ({ ...prev, overrideBlackout: e.target.checked }))}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <label htmlFor="overrideBlackout" className="text-sm text-gray-700">Ignore Blackout Dates</label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox"
                                            id="sendGuestEmail" 
                                            checked={formData.sendGuestEmail}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sendGuestEmail: e.target.checked }))}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <label htmlFor="sendGuestEmail" className="text-sm text-gray-700">Send Confirmation Email</label>
                                    </div>

                                    {(formData.forceConflict || formData.overrideBlackout) && (
                                        <div>
                                            <label htmlFor="overrideReason" className="text-xs font-medium text-gray-700 block mb-1">Override Reason (Required)</label>
                                            <input 
                                                type="text"
                                                id="overrideReason"
                                                className="w-full h-8 px-2 text-sm border border-[var(--color-border-default)] bg-[var(--color-surface-card)] rounded"
                                                placeholder="e.g. Authorized by Manager"
                                                value={formData.overrideReason}
                                                onChange={(e) => setFormData(prev => ({ ...prev, overrideReason: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                         <p className="text-sm text-[var(--color-text-muted)] ml-6">By checking this, you bypass Stripe payment. The reservation will be confirmed immediately.</p>
                     </div>

                     <button disabled={loading} type="submit" className="w-full bg-brand-forest text-white py-3 rounded font-bold hover:bg-opacity-90 transition-all">
                         {loading ? "Creating..." : "Create Reservation"}
                     </button>
                 </form>
            </Container>
        </div>
    );
}

export default function NewReservationPage() {
    return (
        <ToastProvider>
            <Suspense fallback={<div className="p-12 text-center">Loading form...</div>}>
                <ReservationForm />
            </Suspense>
        </ToastProvider>
    );
}
