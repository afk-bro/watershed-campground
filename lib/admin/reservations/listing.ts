import type { OverviewItem, ReservationStatus } from "@/lib/supabase";

type SortMode = "start_date" | "created_at";
type FilterType = ReservationStatus | 'all' | 'maintenance' | 'archived';

export type PaymentStatus = 'paid' | 'deposit_paid' | 'payment_due' | 'overdue' | 'failed' | 'refunded';

export interface PaymentTransaction {
    amount: number;
    status: string;
    type: string;
    created_at: string;
}

export { type SortMode, type FilterType };

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

export function getPaymentStatus(reservation: {
    check_in?: string;
    status: string | ReservationStatus;
    metadata?: { total_amount?: number; [key: string]: unknown };
    payment_transactions?: Array<{ status: string; type: string; amount?: number; [key: string]: unknown }>;
    [key: string]: unknown;
}): PaymentStatus {
    const transactions: PaymentTransaction[] = (reservation.payment_transactions || []) as unknown as PaymentTransaction[];
    const totalAmount = reservation.metadata?.total_amount || 0;

    // No transactions yet
    if (transactions.length === 0) {
        // Check if overdue (past check-in and not cancelled)
        if (reservation.check_in && reservation.status !== 'cancelled') {
            const checkInDate = new Date(reservation.check_in);
            const now = new Date();
            if (now > checkInDate) {
                return 'overdue';
            }
        }
        return 'payment_due';
    }

    // Find succeeded transactions
    const succeededTransactions = transactions.filter(t => t.status === 'succeeded');
    const totalPaid = succeededTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Check for refunded
    const hasRefund = transactions.some(t => t.type === 'refund');
    if (hasRefund) {
        return 'refunded';
    }

    // Check for failed (most recent transaction)
    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (sortedTransactions[0]?.status === 'failed') {
        return 'failed';
    }

    // Determine if paid in full or deposit
    if (totalPaid > 0 && totalAmount > 0) {
        // Allow 1 cent tolerance for rounding
        if (Math.abs(totalPaid - totalAmount) < 0.02) {
            return 'paid';
        } else if (totalPaid < totalAmount) {
            return 'deposit_paid';
        }
        return 'paid'; // Overpaid or exact
    }

    // Has payments but can't determine status
    if (totalPaid > 0) {
        return 'deposit_paid';
    }

    return 'payment_due';
}
