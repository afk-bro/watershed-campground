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
                        <h1 className="text-3xl font-heading font-bold text-brand-forest mb-2">
                            Campsite Management
                        </h1>
                        <p className="text-slate-600">
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === 'all'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        All ({campsites.length})
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === 'active'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Active ({activeCampsites})
                    </button>
                    <button
                        onClick={() => setFilter('inactive')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === 'inactive'
                                ? 'bg-brand-forest text-accent-beige'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Inactive ({inactiveCampsites})
                    </button>
                    <div className="h-6 w-px bg-slate-300 mx-2"></div>
                    {(['rv', 'tent', 'cabin'] as CampsiteType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                filter === type
                                    ? 'bg-brand-forest text-accent-beige'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {type} ({typeCounts[type] || 0})
                        </button>
                    ))}
                    <div className="h-6 w-px bg-slate-300 mx-2"></div>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
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
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-100 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Code
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Max Guests
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                        Base Rate
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
                                {filteredCampsites.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                            No campsites found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCampsites.map((campsite) => (
                                        <tr key={campsite.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">
                                                    {campsite.code}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {campsite.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-800">
                                                    {campsite.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {campsite.max_guests}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                ${campsite.base_rate.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {campsite.is_active ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/campsites/${campsite.id}/edit`}
                                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleActive(campsite.id, campsite.is_active)}
                                                        className="text-sm text-slate-600 hover:text-slate-800 font-medium"
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
