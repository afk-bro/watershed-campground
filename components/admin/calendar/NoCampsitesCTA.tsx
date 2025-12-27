"use client";

import { PlusCircle, Tent } from "lucide-react";
import Link from "next/link";

export default function NoCampsitesCTA() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-[var(--color-surface-elevated)]/30 rounded-xl border-2 border-dashed border-[var(--color-border-subtle)] my-8 mx-4">
      <div className="w-16 h-16 bg-brand-forest/10 rounded-full flex items-center justify-center mb-6">
        <Tent className="text-brand-forest" size={32} />
      </div>
      <h3 className="text-xl font-heading font-bold text-[var(--color-text-primary)] mb-2">
        No Campsites Found
      </h3>
      <p className="text-[var(--color-text-muted)] max-w-md mb-8">
        Your calendar is empty because you haven&apos;t added any campsites yet.
        Start by creating your first campsite to begin managing bookings.
      </p>
      <Link
        href="/admin/campsites"
        className="flex items-center gap-2 bg-brand-forest text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-forest/90 transition-all shadow-md active:scale-95"
      >
        <PlusCircle size={20} />
        Manage Campsites
      </Link>
    </div>
  );
}
