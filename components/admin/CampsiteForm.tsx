"use client";

import { useState } from "react";
import type { CampsiteType } from "@/lib/supabase";

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
    submitLabel: string;
    loading: boolean;
    secondaryAction?: React.ReactNode;
}

export default function CampsiteForm({
    initialData,
    onSubmit,
    onCancel,
    submitLabel,
    loading,
    secondaryAction
}: CampsiteFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const [formData, setFormData] = useState<CampsiteFormData>({
        name: initialData?.name || "",
        code: initialData?.code || "",
        type: initialData?.type || "rv",
        maxGuests: initialData?.maxGuests || 4,
        baseRate: initialData?.baseRate || 45.00,
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
        notes: initialData?.notes || "",
        sortOrder: initialData?.sortOrder || 0,
        imageUrl: initialData?.imageUrl || "",
    });

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setError(null);
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    async function uploadImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', `campsite-${Date.now()}-${Math.random().toString(36).substring(7)}`);

        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to upload image');
        }

        const { url } = await response.json();
        return url;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        try {
            let finalImageUrl = formData.imageUrl;

            // Upload image if selected
            if (imageFile) {
                setUploadingImage(true);
                try {
                    finalImageUrl = await uploadImage(imageFile);
                } finally {
                    setUploadingImage(false);
                }
            }

            await onSubmit({ ...formData, imageUrl: finalImageUrl });
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

            <form onSubmit={handleSubmit} className="space-y-6 admin-card p-8">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Name <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20"
                        placeholder="e.g., Riverfront Site 1"
                    />
                </div>

                {/* Code */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Code <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20 uppercase"
                        placeholder="e.g., S1"
                        maxLength={10}
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Short code for internal use (letters and numbers only)
                    </p>
                </div>

                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Campsite Image
                    </label>
                    <div className="space-y-3">
                        {imagePreview ? (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-48 object-cover rounded-lg border border-[var(--color-border-default)]"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageFile(null);
                                        setImagePreview(null);
                                        setFormData(prev => ({ ...prev, imageUrl: "" }));
                                    }}
                                    className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--color-border-default)] rounded-lg cursor-pointer hover:border-[var(--color-accent-gold)] transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg
                                        className="w-8 h-8 text-[var(--color-text-muted)] mb-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        PNG, JPG, WebP (max 5MB)
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={uploadingImage}
                                />
                            </label>
                        )}
                        {uploadingImage && (
                            <p className="text-sm text-[var(--color-accent-gold)]">
                                Uploading image...
                            </p>
                        )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        This image will be displayed as a thumbnail in the campsites table
                    </p>
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Type <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as CampsiteType })}
                        className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20"
                    >
                        <option value="rv">RV</option>
                        <option value="tent">Tent</option>
                        <option value="cabin">Cabin</option>
                    </select>
                </div>

                {/* Max Guests */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Maximum Guests <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                        type="number"
                        required
                        min="1"
                        max="50"
                        value={formData.maxGuests}
                        onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20"
                    />
                </div>

                {/* Base Rate */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Base Nightly Rate <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-2 text-[var(--color-text-muted)]">$</span>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.baseRate}
                            onChange={(e) => setFormData({ ...formData, baseRate: parseFloat(e.target.value) })}
                            className="w-full pl-8 pr-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20"
                        />
                    </div>
                </div>

                {/* Active Status */}
                <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            Active (available for reservations)
                        </span>
                    </label>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Notes (optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20"
                        placeholder="Internal notes about this campsite..."
                    />
                </div>

                {/* Sort Order */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        Sort Order
                    </label>
                    <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20"
                    />
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Lower numbers appear first in lists
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-default)]">
                    <div className="flex items-center gap-4">
                        <button
                            type="submit"
                            disabled={loading || uploadingImage}
                            className="bg-accent-gold text-brand-forest px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : submitLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
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
