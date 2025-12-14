"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Container from "@/components/Container";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/ui/Toast";

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

function ReservationForm() {
    const router = useRouter();
    const supabase = createClient();
    const { toast } = useToast();
    
    // State
    const [step, setStep] = useState(1);
    const [campsites, setCampsites] = useState<Campsite[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        checkIn: "",
        checkOut: "",
        adults: 1,
        children: 0,
        campsiteId: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address1: "",
        city: "",
        postalCode: "",
        contactMethod: "Email",
        campingUnit: "Other",
        rvLength: "0",
        comments: "Manual Booking",
        isOffline: true
    });

    const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

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

            toast("Reservation created successfully!", "success");
            router.push("/admin");
        } catch (err: any) {
            console.error(err);
            toast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12">
            <Container>
                 <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-heading font-bold text-brand-forest">New Manual Reservation</h1>
                    <Link href="/admin"><button className="text-slate-600 hover:underline">Cancel</button></Link>
                 </div>

                 <form onSubmit={handleSubmit} className="max-w-2xl bg-white p-8 rounded-lg shadow space-y-6">
                    {/* Dates & Site */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Check In</label>
                            <input type="date" required className="w-full border p-2 rounded" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Check Out</label>
                            <input type="date" required className="w-full border p-2 rounded" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Campsite</label>
                        <select required className="w-full border p-2 rounded" value={formData.campsiteId} onChange={e => setFormData({...formData, campsiteId: e.target.value})}>
                            <option value="">Select a Site...</option>
                            {campsites.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Note: Does not auto-check availability. Using "Force" logic in API if ID provided? No, API still checks. Please check calendar first.</p>
                    </div>

                    {/* Guests */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Adults</label>
                            <input type="number" min="1" required className="w-full border p-2 rounded" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Children</label>
                             <input type="number" min="0" className="w-full border p-2 rounded" value={formData.children} onChange={e => setFormData({...formData, children: parseInt(e.target.value)})} />
                        </div>
                    </div>

                    {/* Contact */}
                     <div className="space-y-4 border-t pt-4">
                        <h3 className="font-bold text-slate-700">Guest Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="First Name" required className="w-full border p-2 rounded" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                             <input type="text" placeholder="Last Name" required className="w-full border p-2 rounded" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                        <input type="email" placeholder="Email" required className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input type="tel" placeholder="Phone" required className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        <input type="text" placeholder="Address" required className="w-full border p-2 rounded" value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="City" required className="w-full border p-2 rounded" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                             <input type="text" placeholder="Postal Code" required className="w-full border p-2 rounded" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                        </div>
                     </div>

                     {/* Payment Override */}
                     <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                         <label className="flex items-center gap-2">
                             <input type="checkbox" checked={formData.isOffline} onChange={e => setFormData({...formData, isOffline: e.target.checked})} />
                             <span className="font-bold text-slate-800">Mark as Paid (Offline / Cash / E-Transfer)</span>
                         </label>
                         <p className="text-sm text-slate-600 ml-6">By checking this, you bypass Stripe payment. The reservation will be confirmed immediately.</p>
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
            <ReservationForm />
        </ToastProvider>
    );
}
