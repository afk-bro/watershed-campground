"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import type { CampsiteType } from "@/lib/supabase";

export default function NewCampsitePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        type: "rv" as CampsiteType,
        maxGuests: 4,
        baseRate: 45.00,
        isActive: true,
        notes: "",
        sortOrder: 0,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/campsites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create campsite');
            }

            // Success - redirect to campsites list
            router.push('/admin/campsites');
        } catch (err: any) {
            console.error('Error creating campsite:', err);
            setError(err.message || 'Failed to create campsite');
            setLoading(false);
        }
    }

    return (
        <div className="py-12">
            <Container>
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-heading font-bold text-brand-forest mb-2">
                        Add New Campsite
                    </h1>
                    <p className="text-[var(--color-text-muted)] mb-8">
                        Create a new campsite for reservations
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
                        <div className="flex items-center gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-accent-gold text-brand-forest px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Campsite'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/admin/campsites')}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </Container>
        </div>
    );
}
