"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import CampsiteForm from "@/components/admin/CampsiteForm";
import type { CampsiteFormData } from "@/components/admin/CampsiteForm";

export default function NewCampsitePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(data: CampsiteFormData) {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/campsites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to create campsite');
            }

            // Success - redirect to campsites list
            router.push('/admin/campsites');
        } catch (err: unknown) {
            console.error('Error creating campsite:', err);
            setError(err instanceof Error ? err.message : 'Failed to create campsite');
            setLoading(false);
        }
    }

    return (
        <div className="py-12">
            <Container>
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-heading font-bold text-accent-gold mb-2">
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

                    <CampsiteForm
                        onSubmit={handleSubmit}
                        onCancel={() => router.push('/admin/campsites')}
                        submitLabel="Create Campsite"
                        loading={loading}
                    />
                </div>
            </Container>
        </div>
    );
}
