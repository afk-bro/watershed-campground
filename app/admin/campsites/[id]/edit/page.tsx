"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Container from "@/components/Container";
import type { Campsite, CampsiteType } from "@/lib/supabase";

export default function EditCampsitePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [campsite, setCampsite] = useState<Campsite | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        type: "rv" as CampsiteType,
        maxGuests: 4,
        baseRate: 45.00,
        isActive: true,
        notes: "",
        sortOrder: 0,
        imageUrl: "",
    });

    useEffect(() => {
        if (id) {
            fetchCampsite();
        }
    }, [id]);

    async function fetchCampsite() {
        try {
            const response = await fetch(`/api/admin/campsites/${id}`);

            if (!response.ok) {
                throw new Error('Failed to fetch campsite');
            }

            const { data } = await response.json();
            setCampsite(data);

            // Populate form
            setFormData({
                name: data.name,
                code: data.code,
                type: data.type,
                maxGuests: data.max_guests,
                baseRate: parseFloat(data.base_rate),
                isActive: data.is_active,
                notes: data.notes || "",
                sortOrder: data.sort_order,
                imageUrl: data.image_url || "",
            });

            // Set image preview if exists
            if (data.image_url) {
                setImagePreview(data.image_url);
            }
        } catch (err: any) {
            console.error('Error fetching campsite:', err);
            setError(err.message || 'Failed to load campsite');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            let imageUrl = formData.imageUrl;

            // Upload image if selected
            if (imageFile) {
                setUploadingImage(true);
                imageUrl = await uploadImage(imageFile);
                setUploadingImage(false);
            }

            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, imageUrl }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update campsite');
            }

            // Success - redirect to campsites list
            router.push('/admin/campsites');
        } catch (err: any) {
            console.error('Error updating campsite:', err);
            setError(err.message || 'Failed to update campsite');
            setSaving(false);
        }
    }

    async function uploadImage(file: File): Promise<string> {
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        formDataObj.append('name', `campsite-${Date.now()}-${Math.random().toString(36).substring(7)}`);

        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formDataObj,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to upload image');
        }

        const { url } = await response.json();
        return url;
    }

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

        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    async function handleDeactivate() {
        if (!confirm('Are you sure you want to deactivate this campsite? It will no longer be available for new reservations.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to deactivate campsite');
            }

            // Success - redirect to campsites list
            router.push('/admin/campsites');
        } catch (err: any) {
            console.error('Error deactivating campsite:', err);
            alert(err.message || 'Failed to deactivate campsite');
        }
    }

    if (loading) {
        return (
            <div className="py-12">
                <Container>
                    <div className="text-center">Loading campsite...</div>
                </Container>
            </div>
        );
    }

    if (error && !campsite) {
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
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-heading font-bold text-accent-gold mb-2">
                        Edit Campsite
                    </h1>
                    <p className="text-[var(--color-text-muted)] mb-8">
                        Update campsite details
                    </p>

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
                                                setFormData({ ...formData, imageUrl: "" });
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
                                    disabled={saving}
                                    className="bg-accent-gold text-brand-forest px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/admin/campsites')}
                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleDeactivate}
                                className="text-[var(--color-error)] hover:opacity-80 font-medium transition-opacity"
                            >
                                Deactivate Campsite
                            </button>
                        </div>
                    </form>
                </div>
            </Container>
        </div>
    );
}
