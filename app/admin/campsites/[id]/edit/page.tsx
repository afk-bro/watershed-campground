"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Container from "@/components/Container";
import CampsiteForm from "@/components/admin/CampsiteForm";
import type { CampsiteFormData } from "@/components/admin/CampsiteForm";
import type { Campsite } from "@/lib/supabase";

export default function EditCampsitePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [campsite, setCampsite] = useState<Campsite | null>(null);

    const fetchCampsite = useCallback(async () => {
        try {
            const response = await fetch(`/api/admin/campsites/${id}`);

            if (!response.ok) {
                throw new Error('Failed to fetch campsite');
            }

            const { data } = await response.json();
            setCampsite(data);
        } catch (err: unknown) {
            console.error('Error fetching campsite:', err);
            setError(err instanceof Error ? err.message : 'Failed to load campsite');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            void fetchCampsite();
        }
    }, [id, fetchCampsite]);

    async function handleSubmit(data: CampsiteFormData) {
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/campsites/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to update campsite');
            }

            // Success - redirect to campsites list
            router.push('/admin/campsites');
        } catch (err: unknown) {
            console.error('Error updating campsite:', err);
            setError(err instanceof Error ? err.message : 'Failed to update campsite');
            setSaving(false);
        }
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
        } catch (err: unknown) {
            console.error('Error deactivating campsite:', err);
            alert(err instanceof Error ? err.message : 'Failed to deactivate campsite');
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

    const initialFormData: Partial<CampsiteFormData> = campsite ? {
        name: campsite.name,
        code: campsite.code,
        type: campsite.type,
        maxGuests: campsite.max_guests,
        baseRate: campsite.base_rate,
        isActive: campsite.is_active,
        notes: campsite.notes || "",
        sortOrder: campsite.sort_order,
        imageUrl: campsite.image_url || "",
    } : {};

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

                    <CampsiteForm
                        initialData={initialFormData}
                        onSubmit={handleSubmit}
                        onCancel={() => router.push('/admin/campsites')}
                        submitLabel="Save Changes"
                        loading={saving}
                        secondaryAction={
                            <button
                                type="button"
                                onClick={handleDeactivate}
                                className="text-[var(--color-error)] hover:opacity-80 font-medium transition-opacity"
                            >
                                Deactivate Campsite
                            </button>
                        }
                    />
                </div>
            </Container>
        </div>
    );
}
