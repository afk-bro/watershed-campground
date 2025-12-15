"use client";

import { useEffect, useState } from "react";
import { Campsite } from "@/lib/supabase";
import { Check, Loader2, MapPin, Tent } from "lucide-react";

interface ResultsStepProps {
    searchParams: any;
    onSelectSite: (site: Campsite) => void;
}

export default function ResultsStep({ searchParams, onSelectSite }: ResultsStepProps) {
    const [sites, setSites] = useState<Campsite[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const search = async () => {
             setLoading(true);
             try {
                 const res = await fetch('/api/availability/search', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         checkIn: searchParams.checkIn,
                         checkOut: searchParams.checkOut,
                         guestCount: searchParams.guests,
                         rvLength: searchParams.rvLength
                     })
                 });
                 if (res.ok) {
                     setSites(await res.json());
                 }
             } catch (e) {
                 console.error(e);
             } finally {
                 setLoading(false);
             }
        };
        search();
    }, [searchParams]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-accent-gold)]">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Searching for the perfect spot...</p>
            </div>
        );
    }

    if (sites.length === 0) {
        return (
            <div className="text-center py-12">
                 <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">No sites found</h3>
                 <p className="text-[var(--color-text-muted)]">Try adjusting your dates or filters.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
             <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[var(--color-accent-gold)]">Available Campsites</h2>
                <p className="text-[var(--color-text-beige)]/70">Found {sites.length} sites for your stay.</p>
            </div>

            <div className="grid gap-4">
                {sites.map(site => (
                    <div key={site.id} className="bg-[var(--color-surface-elevated)] p-6 rounded-xl border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] transition-all flex flex-col sm:flex-row items-center gap-6 group">
                         <div className="w-16 h-16 rounded-full bg-[var(--color-brand-forest-light)]/20 flex items-center justify-center text-[var(--color-accent-gold)] text-xl font-bold flex-shrink-0">
                             {site.code}
                         </div>
                         <div className="flex-1 text-center sm:text-left">
                             <h3 className="font-bold text-lg text-[var(--color-text-primary)]">{site.name}</h3>
                             <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-[var(--color-text-muted)] mt-1">
                                 <span className="flex items-center gap-1"><Tent className="w-3 h-3" /> {site.type}</span>
                                 <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Max {site.max_guests}</span>
                             </div>
                         </div>
                         <div className="text-right">
                             <div className="text-xl font-bold text-[var(--color-accent-gold)] mb-2">
                                 ${site.base_rate} <span className="text-xs text-[var(--color-text-muted)] font-normal">/ night</span>
                             </div>
                             <button
                                onClick={() => onSelectSite(site)}
                                className="bg-[var(--color-surface-primary)] hover:bg-[var(--color-accent-gold)] hover:text-[var(--color-brand-forest)] border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] px-6 py-2 rounded-lg font-medium transition-all"
                             >
                                 Book Now
                             </button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { Users } from 'lucide-react';
