import { useState } from "react";
import { BlackoutDate } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CalendarData } from "@/lib/calendar/calendar-types";

interface UseBlackoutManagerProps {
    onDataMutate?: (
        data?: CalendarData | Promise<CalendarData> | ((current: CalendarData | undefined) => CalendarData | Promise<CalendarData>),
        options?: { rollbackOnError?: boolean; revalidate?: boolean }
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
            try {
                const response = await fetch(`/api/admin/blackout-dates/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason }),
                });
                if (!response.ok) throw new Error('Update failed');
                showToast('Blackout updated', 'success');
                window.location.reload();
            } catch (e) {
                showToast('Failed to update blackout', 'error');
                throw e;
            }
            return;
        }

        // Optimistic Update
        try {
            await onDataMutate(async (current) => {
                if (!current) throw new Error('No data');

                const response = await fetch(`/api/admin/blackout-dates/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason }),
                });

                if (!response.ok) throw new Error('Update failed');
                const updated = await response.json();

                return {
                    ...current,
                    blackoutDates: current.blackoutDates.map(b => b.id === id ? updated : b)
                };
            }, { rollbackOnError: true });

            showToast('Blackout updated', 'success');
        } catch (e) {
            showToast('Failed to update blackout', 'error');
            throw e;
        }
    };

    const deleteBlackout = async (id: string) => {
        // Fallback
        if (!onDataMutate) {
            try {
                const response = await fetch(`/api/admin/blackout-dates/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Delete failed');
                showToast('Blackout deleted', 'success');
                window.location.reload();
            } catch (e) {
                showToast('Failed to delete', 'error');
                throw e;
            }
            return;
        }

        // Optimistic
        try {
            await onDataMutate(async (current) => {
                if (!current) throw new Error('No data');
                const response = await fetch(`/api/admin/blackout-dates/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Delete failed');

                return {
                    ...current,
                    blackoutDates: current.blackoutDates.filter(b => b.id !== id)
                };
            }, { rollbackOnError: true });
            showToast('Blackout deleted', 'success');
        } catch (e) {
            showToast('Failed to delete', 'error');
            throw e;
        }
    };

    return {
        selectedBlackout,
        isBlackoutDrawerOpen,
        openDrawer,
        closeDrawer,
        updateBlackout,
        deleteBlackout
    };
}
