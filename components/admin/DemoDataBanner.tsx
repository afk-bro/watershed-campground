'use client';

import { useState } from 'react';
import { Sparkles, Trash2, Loader2 } from 'lucide-react';

interface DemoDataBannerProps {
    hasReservations: boolean;
    onSeedComplete?: () => void;
}

export function DemoDataBanner({ hasReservations, onSeedComplete }: DemoDataBannerProps) {
    const [isSeeding, setIsSeeding] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSeedDemo = async () => {
        try {
            setIsSeeding(true);
            setError(null);

            const response = await fetch('/api/admin/seed-demo', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to seed demo data');
            }

            // Refresh the page to show new data
            window.location.reload();
            onSeedComplete?.();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to seed demo data');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleClearDemo = async () => {
        if (!confirm('Are you sure you want to clear all demo data? This cannot be undone.')) {
            return;
        }

        try {
            setIsClearing(true);
            setError(null);

            const response = await fetch('/api/admin/clear-demo', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to clear demo data');
            }

            // Refresh the page
            window.location.reload();
            onSeedComplete?.();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear demo data');
        } finally {
            setIsClearing(false);
        }
    };

    // Show empty state banner if no reservations
    if (!hasReservations) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <Sparkles className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Welcome to Your Calendar!
                        </h3>
                        <p className="text-gray-700 mb-4">
                            Your calendar is empty. Add demo data to explore features like drag-and-drop scheduling, 
                            conflict detection, and reservation management.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSeedDemo}
                                disabled={isSeeding}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSeeding ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating Demo Data...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Add Demo Data
                                    </>
                                )}
                            </button>
                        </div>
                        {error && (
                            <p className="mt-3 text-sm text-red-600">{error}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Show clear demo button if there are reservations
    return (
        <div className="flex justify-end mb-4">
            <button
                onClick={handleClearDemo}
                disabled={isClearing}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isClearing ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Clearing...
                    </>
                ) : (
                    <>
                        <Trash2 className="h-4 w-4" />
                        Clear Demo Data
                    </>
                )}
            </button>
            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
