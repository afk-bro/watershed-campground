'use client';

import { useState, FormEvent } from 'react';
import type { CampsiteType } from '@/lib/supabase';
import { FormField } from './shared/forms/FormField';
import { ImageUploadField } from './shared/forms/ImageUploadField';

export interface CampsiteFormData {
    name: string;
    code: string;
    type: CampsiteType;
    maxGuests: number;
    baseRate: number;
    isActive: boolean;
    notes: string;
    sortOrder: number;
    imageUrl: string;
}

interface CampsiteFormProps {
    initialData?: Partial<CampsiteFormData>;
    onSubmit: (data: CampsiteFormData) => Promise<void>;
    onCancel: () => void;
    submitLabel?: string;
    loading?: boolean;
    secondaryAction?: React.ReactNode;
}

export default function CampsiteForm({
    initialData,
    onSubmit,
    onCancel,
    submitLabel = 'Save',
    loading = false,
    secondaryAction,
}: CampsiteFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CampsiteFormData>({
        name: initialData?.name || '',
        code: initialData?.code || '',
        type: initialData?.type || 'rv',
        maxGuests: initialData?.maxGuests || 4,
        baseRate: initialData?.baseRate || 0,
        isActive: initialData?.isActive ?? true,
        notes: initialData?.notes || '',
        sortOrder: initialData?.sortOrder || 0,
        imageUrl: initialData?.imageUrl || '',
    });

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        try {
            await onSubmit(formData);
        } catch (err: unknown) {
            console.error('Error in CampsiteForm submission:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    }

    return (
        <div className="max-w-2xl">
            {error && (
                <div className="mb-6 error-message">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 admin-card p-6 md:p-8">
                {/* Name */}
                <FormField
                    label="Name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(value) => setFormData({ ...formData, name: value as string })}
                    placeholder="e.g., Riverfront Site 1"
                />

                {/* Code */}
                <FormField
                    label="Code"
                    name="code"
                    type="text"
                    required
                    value={formData.code}
                    onChange={(value) => setFormData({ ...formData, code: (value as string).toUpperCase() })}
                    placeholder="e.g., S1"
                    hint="Short code for internal use (letters and numbers only)"
                    maxLength={10}
                    inputClassName="uppercase"
                />

                {/* Image Upload */}
                <ImageUploadField
                    label="Campsite Image"
                    hint="This image will be displayed as a thumbnail in the campsites table"
                    initialImageUrl={initialData?.imageUrl}
                    onImageUrlChange={(url) => setFormData({ ...formData, imageUrl: url })}
                />

                {/* Type */}
                <FormField
                    label="Type"
                    name="type"
                    type="select"
                    required
                    value={formData.type}
                    onChange={(value) => setFormData({ ...formData, type: value as CampsiteType })}
                    options={[
                        { value: 'rv', label: 'RV' },
                        { value: 'tent', label: 'Tent' },
                        { value: 'cabin', label: 'Cabin' },
                    ]}
                />

                {/* Max Guests */}
                <FormField
                    label="Maximum Guests"
                    name="maxGuests"
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={formData.maxGuests}
                    onChange={(value) => setFormData({ ...formData, maxGuests: Number(value) })}
                />

                {/* Base Rate */}
                <FormField
                    label="Base Nightly Rate"
                    name="baseRate"
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    prefix="$"
                    value={formData.baseRate}
                    onChange={(value) => setFormData({ ...formData, baseRate: Number(value) })}
                />

                {/* Active Status */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer py-2">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-5 h-5 rounded touch-manipulation"
                        />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            Active (available for reservations)
                        </span>
                    </label>
                </div>

                {/* Notes */}
                <FormField
                    label="Notes (optional)"
                    name="notes"
                    type="textarea"
                    rows={3}
                    value={formData.notes}
                    onChange={(value) => setFormData({ ...formData, notes: value as string })}
                    placeholder="Internal notes about this campsite..."
                />

                {/* Sort Order */}
                <FormField
                    label="Sort Order"
                    name="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(value) => setFormData({ ...formData, sortOrder: Number(value) })}
                    hint="Lower numbers appear first in lists"
                />

                {/* Actions */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-6 border-t border-[var(--color-border-default)]">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full md:w-auto">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-accent-gold text-brand-forest px-6 py-4 md:py-3 rounded-lg font-medium text-base hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px]"
                        >
                            {loading ? 'Saving...' : submitLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium transition-colors py-3 px-4 touch-manipulation min-h-[44px]"
                        >
                            Cancel
                        </button>
                    </div>

                    {secondaryAction}
                </div>
            </form>
        </div>
    );
}
