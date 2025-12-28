"use client";

import Link from "next/link";
import Container from "@/components/Container";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import CampsitesToolbar from "@/components/admin/campsites/CampsitesToolbar";
import CampsitesTable from "@/components/admin/campsites/CampsitesTable";
import { useCampsitesPageState } from "@/hooks/admin/useCampsitesPageState";

export default function CampsitesPage() {
    const {
        campsites,
        loading,
        error,
        filter,
        setFilter,
        isDeleting,
        selectedIds,
        setSelectedIds,
        confirmConfig,
        setConfirmConfig,
        fileInputRef,
        filteredCampsites,
        typeCounts,
        activeCampsites,
        inactiveCampsites,
        requestToggleActive,
        requestDelete,
        toggleSelection,
        toggleAllSelection,
        handleImageUpload,
        requestRemoveImage,
        setUploadingId,
    } = useCampsitesPageState();

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

                <CampsitesToolbar
                    filter={filter}
                    onFilterChange={setFilter}
                    totalCount={campsites.length}
                    activeCampsites={activeCampsites}
                    inactiveCampsites={inactiveCampsites}
                    typeCounts={typeCounts}
                />

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

                <CampsitesTable
                    campsites={filteredCampsites}
                    selectedIds={selectedIds}
                    isDeleting={isDeleting}
                    showBulkSelect={campsites.length > 10}
                    onToggleSelection={toggleSelection}
                    onToggleAllSelection={toggleAllSelection}
                    onToggleActive={requestToggleActive}
                    onDelete={requestDelete}
                    onUploadImage={(id) => {
                        setUploadingId(id);
                        fileInputRef.current?.click();
                    }}
                    onRemoveImage={requestRemoveImage}
                />

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
