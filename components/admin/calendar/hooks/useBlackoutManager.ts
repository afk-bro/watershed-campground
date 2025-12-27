import { useState, useCallback, useRef, useEffect } from "react";
import { BlackoutDate } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CalendarData } from "@/lib/calendar/calendar-types";
import { calendarService } from "@/lib/calendar/calendar-service";

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
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    // Handlers
    const openDrawer = (blackout: BlackoutDate) => {
        setSelectedBlackout(blackout);
        setIsBlackoutDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsBlackoutDrawerOpen(false);
        setSelectedBlackout(null);
    };

    const updateBlackout = useCallback(async (id: string, reason: string, extraParams: Partial<{ start_date: string, end_date: string, campsite_id: string | null }> = {}) => {
        // Fallback if no onDataMutate (Standard Fetch)
        if (!onDataMutate) {
            console.warn('[UPDATE BLACKOUT] No mutate function provided, falling back to reload');
            try {
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                await calendarService.updateBlackoutDate(id, { reason, ...extraParams }, abortControllerRef.current.signal);
                showToast('Blackout updated', 'success');
                setTimeout(() => window.location.reload(), 500);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                console.error('[UPDATE BLACKOUT ERROR]', e);
                showToast(e.message || 'Failed to update blackout', 'error');
                throw e;
            }
            return;
        }

        // Optimistic Update
        try {
            console.log('[UPDATE BLACKOUT] Optimistic update', { id, reason, ...extraParams });

            await onDataMutate(async (current) => {
                if (!current) throw new Error('No current data');

                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                const updated = await calendarService.updateBlackoutDate(id, { reason, ...extraParams }, abortControllerRef.current.signal);
                console.log('[UPDATE BLACKOUT] Server confirmed:', updated);

                return {
                    ...current,
                    blackoutDates: current.blackoutDates.map(b => b.id === id ? updated : b)
                };
            }, { rollbackOnError: true, revalidate: false });

            showToast('Blackout updated successfully', 'success');
        } catch (e: any) {
            if (e.name === 'AbortError') return;
            console.error('[UPDATE BLACKOUT ERROR]', e);
            showToast(e.message || 'Failed to update blackout', 'error');
            throw e;
        }
    }, [onDataMutate, showToast]);

    const createBlackout = useCallback(async (startDate: string, endDate: string, campsiteId: string, reason: string) => {
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
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                await calendarService.createBlackoutDate({
                    start_date: start,
                    end_date: end,
                    campsite_id: campsiteId,
                    reason
                }, abortControllerRef.current.signal);

                showToast('Blackout dates added', 'success');
                setTimeout(() => window.location.reload(), 500);
            } catch (error: any) {
                if (error.name === 'AbortError') return;
                console.error(error);
                showToast('Failed to create blackout', 'error');
                throw error;
            }
            return;
        }

        // Optimistic update
        try {
            console.log('[CREATE BLACKOUT] Optimistic update', { start, end, campsite_id: campsiteId, reason });

            // Create optimistic blackout with temporary ID
            const optimisticBlackout = {
                id: `temp_${crypto.randomUUID()}`,
                start_date: start,
                end_date: end,
                campsite_id: campsiteId,
                reason,
                created_at: new Date().toISOString(),
                _saving: true,
            };

            const currentData = await onDataMutate();
            if (!currentData) throw new Error('No current data available');

            const optimisticData: CalendarData = {
                ...currentData,
                blackoutDates: [...currentData.blackoutDates, optimisticBlackout] as BlackoutDate[],
            };

            await onDataMutate(
                async (current) => {
                    if (!current) throw new Error('No current data');

                    abortControllerRef.current?.abort();
                    abortControllerRef.current = new AbortController();

                    const newBlackout = await calendarService.createBlackoutDate({
                        start_date: start,
                        end_date: end,
                        campsite_id: campsiteId,
                        reason
                    }, abortControllerRef.current.signal);

                    console.log('[CREATE BLACKOUT] Server confirmed:', newBlackout);

                    return {
                        ...current,
                        blackoutDates: [
                            ...current.blackoutDates.filter(b => b.id !== optimisticBlackout.id),
                            newBlackout
                        ],
                    };
                },
                { optimisticData, rollbackOnError: true, revalidate: false }
            );

            showToast('Blackout dates added', 'success');
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('[CREATE BLACKOUT ERROR]', error);
            showToast(error.message || 'Failed to create blackout', 'error');
            throw error;
        }
    }, [onDataMutate, showToast]);

    const deleteBlackout = useCallback(async (id: string) => {
        // Fallback
        if (!onDataMutate) {
            console.warn('[DELETE BLACKOUT] No mutate function provided, falling back to reload');
            try {
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                await calendarService.deleteBlackoutDate(id, abortControllerRef.current.signal);

                showToast('Blackout deleted', 'success');
                setTimeout(() => window.location.reload(), 500);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                console.error('[DELETE BLACKOUT ERROR]', e);
                showToast(e.message || 'Failed to delete blackout', 'error');
                throw e;
            }
            return;
        }

        // Optimistic
        try {
            console.log('[DELETE BLACKOUT] Optimistic update', { id });

            await onDataMutate(async (current) => {
                if (!current) throw new Error('No current data');

                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                await calendarService.deleteBlackoutDate(id, abortControllerRef.current.signal);
                console.log('[DELETE BLACKOUT] Server confirmed deletion');

                return {
                    ...current,
                    blackoutDates: current.blackoutDates.filter(b => b.id !== id)
                };
            }, { rollbackOnError: true, revalidate: false });

            showToast('Blackout deleted', 'success');
        } catch (e: any) {
            if (e.name === 'AbortError') return;
            console.error('[DELETE BLACKOUT ERROR]', e);
            showToast(e.message || 'Failed to delete blackout', 'error');
            throw e;
        }
    }, [onDataMutate, showToast]);

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
