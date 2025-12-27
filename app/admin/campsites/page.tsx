"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Edit2, Power, PowerOff, Trash2, Camera, X, Plus, Info, CheckSquare, Square } from "lucide-react";
import type { Campsite, CampsiteType } from "@/lib/supabase";
import Container from "@/components/Container";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function CampsitesPage() {
    const [campsites, setCampsites] = useState<Campsite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<CampsiteType | 'all' | 'active' | 'inactive'>('active');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        variant: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: '',
        variant: 'info',
        onConfirm: () => {}
    });
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

    function requestToggleActive(id: string, code: string, currentStatus: boolean) {
        setConfirmConfig({
            isOpen: true,
            title: currentStatus ? 'Pause Campsite?' : 'Start Campsite?',
            message: currentStatus 
                ? `Temporarily stop taking reservations for ${code}? Existing bookings will remain valid, but no new ones can be made.`
                : `Make ${code} available for new bookings immediately?`,
            confirmLabel: currentStatus ? 'Pause Site' : 'Start Site',
            variant: 'warning',
            onConfirm: () => toggleActive(id, currentStatus)
        });
    }

    function requestDelete(id: string, code: string) {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Permanently?',
            message: `You are about to permanently delete campsite ${code}. This removes all associated history and cannot be recovered. Are you absolutely sure?`,
            confirmLabel: 'Delete Site',
            variant: 'danger',
            onConfirm: () => handleDelete(id, code)
        });
    }

    async function toggleActive(id: string, currentStatus: boolean) {
        const action = currentStatus ? 'deactivate' : 'activate';
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        
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
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAllSelection = () => {
        if (selectedIds.size === filteredCampsites.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCampsites.map(c => c.id)));
        }
    };

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

    function requestRemoveImage(id: string) {
        setConfirmConfig({
            isOpen: true,
            title: 'Remove Image?',
            message: 'Are you sure you want to remove this image from the campsite gallery?',
            confirmLabel: 'Remove Image',
            variant: 'danger',
            onConfirm: () => handleRemoveImage(id)
        });
    }

    async function handleRemoveImage(id: string) {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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

                {/* Bulk Actions Bar */}
                {campsites.length > 10 && selectedIds.size > 0 && (
                    <div className="mb-4 p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-accent-gold)]/30 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-[var(--color-accent-gold)] uppercase tracking-wider">
                                {selectedIds.size} Selected
                            </span>
                            <div className="h-4 w-px bg-[var(--color-border-strong)]"></div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded hover:bg-[var(--color-surface-hover)]">
                                    Pause Selected
                                </button>
                                <button className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20">
                                    Delete Selected
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                )}

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
                                    {campsites.length > 10 && (
                                        <th className="px-4 py-3 text-left w-10">
                                            <button onClick={toggleAllSelection} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)]">
                                                {selectedIds.size === filteredCampsites.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-16">
                                        Image
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-24">
                                        Code
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-28">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-28">
                                        Max Guests
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-28">
                                        Base Rate
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70 w-32">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider opacity-70">
                                        Controls
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {filteredCampsites.length === 0 ? (
                                    <tr>
                                        <td colSpan={campsites.length > 10 ? 9 : 8} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                                <div className="w-16 h-16 bg-[var(--color-surface-elevated)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--color-border-strong)]">
                                                    <Info className="text-[var(--color-text-muted)]" size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-heading font-bold text-[var(--color-text-primary)] mb-1">
                                                        No campsites yet
                                                    </h3>
                                                    <p className="text-sm text-[var(--color-text-muted)]">
                                                        Start by adding your first site to the system. You can always pause or edit details later.
                                                    </p>
                                                </div>
                                                <Link
                                                    href="/admin/campsites/new"
                                                    className="mt-2 flex items-center gap-2 bg-[var(--color-accent-gold)] text-[var(--color-brand-forest)] px-6 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-opacity-90 transition-all shadow-md group"
                                                >
                                                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                                    Add First Campsite
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCampsites.map((campsite) => (
                                        <tr 
                                            key={campsite.id} 
                                            className={`hover:bg-[var(--color-surface-elevated)] hover:shadow-sm transition-all duration-150 group cursor-pointer border-l-2 hover:border-l-[var(--color-accent-gold)] ${
                                                selectedIds.has(campsite.id) ? 'bg-[var(--color-surface-elevated)] border-l-[var(--color-accent-gold)]' : 'border-transparent'
                                            }`}
                                        >
                                            {campsites.length > 10 && (
                                                <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelection(campsite.id); }}>
                                                    <button className={`${selectedIds.has(campsite.id) ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100'} transition-all`}>
                                                        {selectedIds.has(campsite.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                    </button>
                                                </td>
                                            )}
                                            <td className="px-4 py-3" onClick={() => (window.location.href = `/admin/campsites/${campsite.id}/edit`)}>
                                                <div className="relative w-12 h-12 group/thumb">
                                                    {campsite.image_url ? (
                                                        <>
                                                            <img
                                                                src={campsite.image_url}
                                                                alt={campsite.name}
                                                                className="w-full h-full object-cover rounded-lg ring-2 ring-transparent group-hover/thumb:ring-[var(--color-accent-gold)] transition-all cursor-pointer shadow-sm shadow-black/20"
                                                                onClick={() => {
                                                                    setUploadingId(campsite.id);
                                                                    fileInputRef.current?.click();
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    requestRemoveImage(campsite.id);
                                                                }}
                                                                className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10"
                                                                title="Remove image"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div 
                                                            className="w-full h-full bg-[var(--color-surface-elevated)] rounded-lg flex items-center justify-center ring-2 ring-transparent group-hover/thumb:ring-[var(--color-accent-gold)] transition-all cursor-pointer hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]"
                                                            onClick={() => {
                                                                setUploadingId(campsite.id);
                                                                fileInputRef.current?.click();
                                                            }}
                                                            title="Upload image"
                                                        >
                                                            <div className="flex flex-col items-center gap-0.5 opacity-60 group-hover/thumb:opacity-100">
                                                                <Camera className="w-4 h-4 text-[var(--color-text-muted)]" />
                                                                <span className="text-[8px] font-bold uppercase tracking-tighter text-[var(--color-text-muted)]">Add</span>
                                                            </div>
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
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)] shadow-sm">
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
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm shadow-emerald-900/20">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[var(--color-border-strong)] text-[var(--color-text-muted)]">
                                                        <PowerOff className="w-3 h-3" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Link
                                                        href={`/admin/campsites/${campsite.id}/edit`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-brand-forest)] bg-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold-dark)] rounded-lg transition-all duration-150 shadow-sm"
                                                        title="Edit campsite"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            requestToggleActive(campsite.id, campsite.code, campsite.is_active);
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-lg transition-all duration-150 shadow-sm ${
                                                            campsite.is_active
                                                                ? 'text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100'
                                                                : 'text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100'
                                                        }`}
                                                        title={campsite.is_active ? 'Pause campsite' : 'Start campsite'}
                                                    >
                                                        {campsite.is_active ? (
                                                            <>
                                                                <PowerOff className="w-3.5 h-3.5" />
                                                                <span className="hidden lg:inline">Pause</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Power className="w-3.5 h-3.5" />
                                                                <span className="hidden lg:inline">Start</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            requestDelete(campsite.id, campsite.code);
                                                        }}
                                                        disabled={isDeleting === campsite.id}
                                                        className="group/delete p-2 text-red-500/60 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-150 disabled:opacity-50"
                                                        title="Delete campsite permanently"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

                <ConfirmDialog
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmConfig.onConfirm}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmLabel={confirmConfig.confirmLabel}
                    variant={confirmConfig.variant}
                    isSubmitting={isDeleting !== null}
                />
            </Container>
        </div>
    );
}
