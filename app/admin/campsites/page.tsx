"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Edit2, Power, PowerOff, Trash2, Camera, X } from "lucide-react";
import type { Campsite, CampsiteType } from "@/lib/supabase";
import Container from "@/components/Container";
import { useToast } from "@/components/ui/Toast";

export default function CampsitesPage() {
    const [campsites, setCampsites] = useState<Campsite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<CampsiteType | 'all' | 'active' | 'inactive'>('active');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const fetchCampsites = useCallback(async () => {
        try {
            setLoading(true);
            // Default to showing all for admin list management
            const response = await fetch('/api/admin/campsites?showInactive=true');

            if (!response.ok) {
                throw new Error('Failed to fetch campsites');
            }

            const { data } = await response.json();
            setCampsites(data || []);
        } catch (err) {
            console.error('Error fetching campsites:', err);
            setError('Failed to load campsites');
            showToast('Failed to load campsites', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        void fetchCampsites();
    }, [fetchCampsites]);

    async function toggleActive(id: string, currentStatus: boolean) {
        const action = currentStatus ? 'deactivate' : 'activate';
        
        try {
            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${action} campsite`);
            }

            // Optimistically update the UI
            setCampsites(prev =>
                prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c)
            );
            
            showToast(`Campsite ${action}d successfully`, 'success');
        } catch (err) {
            console.error(`Error ${action}ing campsite:`, err);
            showToast(err instanceof Error ? err.message : `Failed to ${action} campsite`, 'error');
        }
    }

    async function handleDelete(id: string, code: string) {
        if (!confirm(`Are you sure you want to PERMANENTLY delete campsite ${code}? This cannot be undone.`)) {
            return;
        }

        try {
            setIsDeleting(id);
            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete campsite');
            }

            setCampsites(prev => prev.filter(c => c.id !== id));
            showToast('Campsite deleted permanently', 'success');
        } catch (err) {
            console.error('Error deleting campsite:', err);
            showToast(err instanceof Error ? err.message : 'Failed to delete campsite', 'error');
        } finally {
            setIsDeleting(null);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !uploadingId) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);

            const uploadRes = await fetch('/api/admin/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image');
            
            const { url } = await uploadRes.json();

            // Update campsite in DB
            const patchRes = await fetch(`/api/admin/campsites/${uploadingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });

            if (!patchRes.ok) throw new Error('Failed to update campsite image');

            // Update local state
            setCampsites(prev => prev.map(c => c.id === uploadingId ? { ...c, image_url: url } : c));
            showToast('Image uploaded successfully', 'success');
        } catch (err) {
            console.error('Image upload error:', err);
            showToast('Failed to upload image', 'error');
        } finally {
            setLoading(false);
            setUploadingId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleRemoveImage(id: string) {
        if (!confirm('Remove this image?')) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: null }),
            });

            if (!response.ok) throw new Error('Failed to remove image');

            setCampsites(prev => prev.map(c => c.id === id ? { ...c, image_url: null } : c));
            showToast('Image removed', 'success');
        } catch (err) {
            console.error('Error removing image:', err);
            showToast('Failed to remove image', 'error');
        } finally {
            setLoading(false);
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
                            Campsites
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
                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] opacity-60">
                        <span className="font-medium">Admin View:</span> All status visible
                    </label>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                />

                {/* Campsites Table */}
                <div className="admin-table">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                                        Image
                                    </th>
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
                                        Controls
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {filteredCampsites.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                                            No campsites found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCampsites.map((campsite) => (
                                        <tr 
                                            key={campsite.id} 
                                            className="hover:bg-[var(--color-surface-elevated)] hover:shadow-sm transition-all duration-150 group cursor-pointer border-l-2 border-transparent hover:border-l-[var(--color-accent-gold)]"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="relative w-12 h-12 group/thumb">
                                                    {campsite.image_url ? (
                                                        <>
                                                            <img
                                                                src={campsite.image_url}
                                                                alt={campsite.name}
                                                                className="w-full h-full object-cover rounded-lg ring-2 ring-transparent group-hover/thumb:ring-[var(--color-accent-gold)]/40 transition-all cursor-pointer"
                                                                onClick={() => {
                                                                    setUploadingId(campsite.id);
                                                                    fileInputRef.current?.click();
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveImage(campsite.id);
                                                                }}
                                                                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                                                                title="Remove image"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div 
                                                            className="w-full h-full bg-[var(--color-surface-elevated)] rounded-lg flex items-center justify-center ring-2 ring-transparent group-hover/thumb:ring-[var(--color-accent-gold)]/40 transition-all cursor-pointer hover:bg-[var(--color-surface-hover)]"
                                                            onClick={() => {
                                                                setUploadingId(campsite.id);
                                                                fileInputRef.current?.click();
                                                            }}
                                                            title="Upload image"
                                                        >
                                                            <Camera className="w-5 h-5 text-[var(--color-text-muted)]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
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
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-600 border border-slate-500/20">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/campsites/${campsite.id}/edit`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-card)] hover:bg-[var(--color-accent-gold)] hover:text-[var(--color-brand-forest)] border border-[var(--color-border-default)] hover:border-[var(--color-accent-gold)] rounded-lg transition-all duration-150"
                                                        title="Edit campsite"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleActive(campsite.id, campsite.is_active)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-all duration-150 ${
                                                            campsite.is_active
                                                                ? 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                                                                : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                                        }`}
                                                        title={campsite.is_active ? 'Deactivate campsite' : 'Activate campsite'}
                                                    >
                                                        {campsite.is_active ? (
                                                            <>
                                                                <PowerOff className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Deactivate</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Power className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Activate</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(campsite.id, campsite.code)}
                                                        disabled={isDeleting === campsite.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg transition-all duration-150 disabled:opacity-50"
                                                        title="Delete campsite permanently"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Delete</span>
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
