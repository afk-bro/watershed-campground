import { useState } from "react";
import { BlackoutDate } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CalendarData } from "@/lib/calendar/calendar-types";

interface UseBlackoutManagerProps {
    onDataMutate?: (
        data?: CalendarData | Promise<CalendarData> | ((current: CalendarData | undefined) => CalendarData | Promise<CalendarData>),
        options?: { optimisticData?: CalendarData; rollbackOnError?: boolean; populateCache?: boolean; revalidate?: boolean }
    ) => Promise<CalendarData | undefined>;
}

export function useBlackoutManager({ onDataMutate }: UseBlackoutManagerProps) {
    const { showToast } = useToast();
    const [selectedBlackout, setSelectedBlackout] = useState<BlackoutDate | null>(null);
    const [isBlackoutDrawerOpen, setIsBlackoutDrawerOpen] = useState(false);

    // Handlers
    const openDrawer = (blackout: BlackoutDate) => {
        setSelectedBlackout(blackout);
        setIsBlackoutDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsBlackoutDrawerOpen(false);
        setSelectedBlackout(null);
    };

    const updateBlackout = async (id: string, reason: string) => {
        // Fallback if no onDataMutate (Standard Fetch)
        if (!onDataMutate) {
            console.warn('[UPDATE BLACKOUT] No mutate function provided, falling back to reload');
            try {
                const response = await fetch(`/api/admin/blackout-dates/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Update failed');
                }

                showToast('Blackout updated', 'success');
                setTimeout(() => window.location.reload(), 500);
            } catch (e) {
                console.error('[UPDATE BLACKOUT ERROR]', e);
                showToast(e instanceof Error ? e.message : 'Failed to update blackout', 'error');
                throw e;
            }
            return;
        }

        // Optimistic Update
        try {
            console.log('[UPDATE BLACKOUT] Optimistic update', { id, reason });

            await onDataMutate(async (current) => {
                if (!current) throw new Error('No current data');

                const response = await fetch(`/api/admin/blackout-dates/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update blackout');
                }

                const updated = await response.json();
                console.log('[UPDATE BLACKOUT] Server confirmed:', updated);

                return {
                    ...current,
                    blackoutDates: current.blackoutDates.map(b => b.id === id ? updated : b)
                };
            }, { rollbackOnError: true, revalidate: false });

            showToast('Blackout updated', 'success');
        } catch (e) {
            console.error('[UPDATE BLACKOUT ERROR]', e);
            showToast(e instanceof Error ? e.message : 'Failed to update blackout', 'error');
            throw e;
        }
    };

    const createBlackout = async (startDate: string, endDate: string, campsiteId: string, reason: string) => {
        // Ensure start is before end
        let start = startDate;
        let end = endDate;
        if (start > end) {
            [start, end] = [end, start];
        }

        // Fallback if no mutate function provided
        if (!onDataMutate) {
            console.warn('[CREATE BLACKOUT] No mutate function provided, falling back to reload');
            try {
                const response = await fetch('/api/admin/blackout-dates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        start_date: start,
                        end_date: end,
                        campsite_id: campsiteId,
                        reason
                    }),
                });

                if (!response.ok) throw new Error('Failed to create blackout');

                showToast('Blackout dates added', 'success');
                setTimeout(() => window.location.reload(), 500);
            } catch (error) {
                console.error(error);
                showToast('Failed to create blackout', 'error');
                throw error;
            }
            return;
        }

        // Optimistic update
        try {
            console.log('[CREATE BLACKOUT] Optimistic update', {
                start,
                end,
                campsite_id: campsiteId,
                reason
            });

            // Create optimistic blackout with temporary ID
            const optimisticBlackout = {
                id: `temp_${crypto.randomUUID()}`, // Collision-proof temporary ID
                start_date: start,
                end_date: end,
                campsite_id: campsiteId,
                reason,
                created_at: new Date().toISOString(),
                _saving: true, // Visual feedback flag
            };

            // Get current data for optimistic update
            const currentData = await onDataMutate();
            if (!currentData) {
                console.error('[CREATE BLACKOUT] No current data available');
                throw new Error('No current data available');
            }

            const optimisticData: CalendarData = {
                ...currentData,
                blackoutDates: [...currentData.blackoutDates, optimisticBlackout] as BlackoutDate[],
            };

            // Optimistic update with SWR
            await onDataMutate(
                async (current) => {
                    if (!current) throw new Error('No current data');

                    // Make API call
                    const response = await fetch('/api/admin/blackout-dates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            start_date: start,
                            end_date: end,
                            campsite_id: campsiteId,
                            reason
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to create blackout');
                    }

                    const newBlackout = await response.json();
                    console.log('[CREATE BLACKOUT] Server confirmed:', newBlackout);

                    // Return updated data - replace temp with server response
                    return {
                        ...current,
                        blackoutDates: [
                            ...current.blackoutDates.filter(b => b.id !== optimisticBlackout.id),
                            newBlackout
                        ],
                    };
                },
                {
                    optimisticData,
                    rollbackOnError: true,
                    revalidate: false,
                }
            );

            showToast('Blackout dates added', 'success');
        } catch (error: unknown) {
            console.error('[CREATE BLACKOUT ERROR]', error);
            showToast(error instanceof Error ? error.message : 'Failed to create blackout', 'error');
            throw error;
        }
    };

    const deleteBlackout = async (id: string) => {
        // Fallback
        if (!onDataMutate) {
            console.warn('[DELETE BLACKOUT] No mutate function provided, falling back to reload');
            try {
                const response = await fetch(`/api/admin/blackout-dates/${id}`, { method: 'DELETE' });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Delete failed');
                }

                showToast('Blackout deleted', 'success');
                setTimeout(() => window.location.reload(), 500);
            } catch (e) {
                console.error('[DELETE BLACKOUT ERROR]', e);
                showToast(e instanceof Error ? e.message : 'Failed to delete blackout', 'error');
                throw e;
            }
            return;
        }

        // Optimistic
        try {
            console.log('[DELETE BLACKOUT] Optimistic update', { id });

            await onDataMutate(async (current) => {
                if (!current) throw new Error('No current data');

                const response = await fetch(`/api/admin/blackout-dates/${id}`, { method: 'DELETE' });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to delete blackout');
                }

                console.log('[DELETE BLACKOUT] Server confirmed deletion');

                return {
                    ...current,
                    blackoutDates: current.blackoutDates.filter(b => b.id !== id)
                };
            }, { rollbackOnError: true, revalidate: false });

            showToast('Blackout deleted', 'success');
        } catch (e) {
            console.error('[DELETE BLACKOUT ERROR]', e);
            showToast(e instanceof Error ? e.message : 'Failed to delete blackout', 'error');
            throw e;
        }
    };

    return {
        selectedBlackout,
        isBlackoutDrawerOpen,
        openDrawer,
        closeDrawer,
        createBlackout,
        updateBlackout,
        deleteBlackout
    };
}
