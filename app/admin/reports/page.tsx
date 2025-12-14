"use client";

import { useEffect, useState } from "react";
import Container from "@/components/Container";
import Link from "next/link";
import { format } from "date-fns";

type ReportData = {
    revenue: number;
    occupancy: number;
    totalReservations: number;
    bookedNights: number;
    totalPossibleNights: number;
};

export default function ReportsPage() {
    const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchReport();
    }, [month]);

    const fetchReport = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/reports?month=${month}`);
            if (!res.ok) throw new Error("Failed to fetch report");
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
            setError("Error loading report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12 bg-[var(--color-surface-elevated)] min-h-screen">
            <Container>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-brand-forest mb-2">
                            Campground Reports
                        </h1>
                        <p className="text-[var(--color-text-muted)]">
                            Key performance metrics at a glance.
                        </p>
                    </div>
                    <Link href="/admin">
                        <button className="text-brand-forest hover:underline">
                            ← Back to Dashboard
                        </button>
                    </Link>
                </div>

                <div className="admin-card p-6 mb-8">
                    <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-2">Select Month</label>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="border border-[var(--color-border-default)] rounded px-4 py-2 bg-[var(--color-surface-card)] text-[var(--color-text-primary)]"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">Loading data...</div>
                ) : error ? (
                    <div className="text-center py-12 text-[var(--color-error)]">{error}</div>
                ) : data ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="admin-card p-6">
                            <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Total Revenue</h3>
                            <div className="text-3xl font-bold text-brand-forest mt-2">
                                ${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">For check-ins in {month}</p>
                        </div>

                        <div className="admin-card p-6">
                            <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Occupancy Rate</h3>
                            <div className="text-3xl font-bold text-brand-forest mt-2">
                                {data.occupancy}%
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                {data.bookedNights} / {data.totalPossibleNights} nights
                            </p>
                        </div>

                        <div className="admin-card p-6">
                            <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Total Reservations</h3>
                            <div className="text-3xl font-bold text-brand-forest mt-2">
                                {data.totalReservations}
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">Active bookings ({month})</p>
                        </div>
                    </div>
                ) : null}
            </Container>
        </div>
    );
}
