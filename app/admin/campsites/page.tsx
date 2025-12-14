"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Campsite, CampsiteType } from "@/lib/supabase";
import Container from "@/components/Container";

export default function CampsitesPage() {
    const [campsites, setCampsites] = useState<Campsite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<CampsiteType | 'all' | 'active' | 'inactive'>('active');
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        fetchCampsites();
    }, [showInactive]);

    async function fetchCampsites() {
        try {
            setLoading(true);
            const url = `/api/admin/campsites${showInactive ? '?showInactive=true' : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch campsites');
            }

            const { data } = await response.json();
            setCampsites(data || []);
        } catch (err) {
            console.error('Error fetching campsites:', err);
            setError('Failed to load campsites');
        } finally {
            setLoading(false);
        }
    }

    async function toggleActive(id: string, currentStatus: boolean) {
        try {
            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update campsite');
            }

            // Optimistically update the UI
            setCampsites(prev =>
                prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c)
            );
        } catch (err) {
            console.error('Error updating campsite:', err);
            alert('Failed to update campsite status');
        }
    }

    const filteredCampsites = filter === 'all'
        ? campsites
        : filter === 'active'
            ? campsites.filter(c => c.is_active)
            : filter === 'inactive'
                ? campsites.filter(c => !c.is_active)
                : campsites.filter(c => c.type === filter);

    const typeCounts = campsites.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
    }, {} as Record<CampsiteType, number>);

    const activeCampsites = campsites.filter(c => c.is_active).length;
    const inactiveCampsites = campsites.filter(c => !c.is_active).length;

    if (loading) {
        return (
            <div className="py-12">
                <Container>
                    <div className="text-center">Loading campsites...</div>
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
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-accent-gold mb-2">
                            Campsite Management
                        </h1>
                        <p className="text-[var(--color-text-muted)]">
                            Manage campground sites and availability
                        </p>
                    </div>
                    <Link
                        href="/admin/campsites/new"
                        className="bg-accent-gold text-brand-forest px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                    >
                        Add Campsite
                    </Link>
                </div>

                {/* Filter Buttons */}
                <div className="mb-6 flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-surface ${
                            filter === 'all'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                        }`}
                    >
                        All ({campsites.length})
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-surface ${
                            filter === 'active'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                        }`}
                    >
                        Active ({activeCampsites})
                    </button>
                    <button
                        onClick={() => setFilter('inactive')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-surface ${
                            filter === 'inactive'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                        }`}
                    >
                        Inactive ({inactiveCampsites})
                    </button>
                    <div className="h-6 w-px bg-[var(--color-border-strong)] mx-2"></div>
                    {(['rv', 'tent', 'cabin'] as CampsiteType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-surface capitalize ${
                                filter === type
                                    ? 'bg-brand-forest text-accent-beige'
                                    : 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                            }`}
                        >
                            {type} ({typeCounts[type] || 0})
                        </button>
                    ))}
                    <div className="h-6 w-px bg-[var(--color-border-strong)] mx-2"></div>
                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="rounded"
                        />
                        Show Inactive
                    </label>
                </div>

                {/* Campsites Table */}
                <div className="admin-table">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Code
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Max Guests
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Base Rate
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
                                {filteredCampsites.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                                            No campsites found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCampsites.map((campsite) => (
                                        <tr key={campsite.id} className="hover:bg-[var(--color-surface-elevated)] transition-surface">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-[var(--color-text-primary)]">
                                                    {campsite.code}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                {campsite.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]">
                                                    {campsite.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                {campsite.max_guests}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                ${campsite.base_rate.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {campsite.is_active ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-status-confirmed-bg)] text-[var(--color-status-confirmed)]">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-status-neutral)]/20 text-[var(--color-status-neutral)]">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/campsites/${campsite.id}/edit`}
                                                        className="text-sm text-[var(--color-status-active)] hover:opacity-80 font-medium transition-opacity"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleActive(campsite.id, campsite.is_active)}
                                                        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
                                                    >
                                                        {campsite.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
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
