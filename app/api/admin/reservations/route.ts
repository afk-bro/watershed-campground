import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { OverviewItem, ReservationOverviewItem, BlockingEventOverviewItem } from "@/lib/supabase";

import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
    try {
        const { authorized, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        // Fetch reservations with payment data
        const { data: reservations, error: reservationsError } = await supabaseAdmin
            .from('reservations')
            .select(`
                *,
                campsite:campsites(code, name, type),
                payment_transactions(amount, status, type, created_at)
            `)
            .is('archived_at', null);

        if (reservationsError) {
            console.error("Error fetching reservations:", reservationsError);
            return NextResponse.json(
                { error: "Failed to fetch reservations" },
                { status: 500 }
            );
        }

        // Fetch blackout dates
        const { data: blackoutDates, error: blackoutError } = await supabaseAdmin
            .from('blackout_dates')
            .select(`
                *,
                campsite:campsites(code, name, type)
            `);

        if (blackoutError) {
            console.error("Error fetching blackout dates:", blackoutError);
            return NextResponse.json(
                { error: "Failed to fetch blackout dates" },
                { status: 500 }
            );
        }

        // Add type discriminator to reservations (keep all fields intact)
        const reservationItems = (reservations || []).map(res => ({
            ...res,
            type: 'reservation' as const,
            campsites: res.campsite ? {
                code: res.campsite.code,
                name: res.campsite.name,
                type: res.campsite.type
            } : undefined
        }));

        // Add type discriminator to blackout dates (keep all fields intact)
        const blockingItems = (blackoutDates || []).map(bd => ({
            ...bd,
            type: 'maintenance' as const, // We'll use 'maintenance' as the default type
            campsite_code: bd.campsite?.code,
            campsite_name: bd.campsite?.name,
            campsite_type: bd.campsite?.type
        }));

        // Combine and sort by start date (check_in for reservations, start_date for blocking)
        const items = [...reservationItems, ...blockingItems].sort((a: unknown, b: unknown) => {
            const aItem = a as { type: 'reservation' | 'blocking', check_in?: string, start_date?: string };
            const bItem = b as { type: 'reservation' | 'blocking', check_in?: string, start_date?: string };
            const dateA = aItem.type === 'reservation' ? aItem.check_in : aItem.start_date;
            const dateB = bItem.type === 'reservation' ? bItem.check_in : bItem.start_date;

            // Sort by date descending (newest first)
            const dateComparison = new Date(dateB!).getTime() - new Date(dateA!).getTime();

            // If dates are equal, sort by type (reservations before blocking events)
            if (dateComparison === 0) {
                return aItem.type === 'reservation' ? -1 : 1;
            }

            return dateComparison;
        });

        return NextResponse.json({ data: items });
    } catch (error) {
        console.error("Error in GET /api/admin/reservations:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
