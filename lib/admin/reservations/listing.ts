import type { OverviewItem, ReservationStatus } from "@/lib/supabase";

type SortMode = "start_date" | "created_at";

export { type SortMode };

export function getNights(checkIn: string, checkOut: string): number {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
}

export function sortItems(items: OverviewItem[], sortMode: SortMode): OverviewItem[] {
    const getDateValue = (item: OverviewItem) => {
        if (sortMode === "created_at" && item.type === "reservation" && item.created_at) {
            return item.created_at;
        }
        return item.type === "reservation" ? item.check_in : item.start_date;
    };

    return [...items].sort((a, b) => {
        const aDate = new Date(getDateValue(a) ?? 0).getTime();
        const bDate = new Date(getDateValue(b) ?? 0).getTime();

        if (bDate !== aDate) return bDate - aDate; // Descending
        if (a.type !== b.type) return a.type === "reservation" ? -1 : 1;
        return 0;
    });
}

export function computeCounts(items: OverviewItem[]): { statusCounts: Record<ReservationStatus, number>; maintenanceCount: number } {
    const statusCounts = items.reduce((acc, item) => {
        if (item.type === "reservation") {
            acc[item.status] = (acc[item.status] || 0) + 1;
        }
        return acc;
    }, {} as Record<ReservationStatus, number>);

    const maintenanceCount = items.filter(item => item.type === "maintenance" || item.type === "blackout").length;

    return { statusCounts, maintenanceCount };
}
