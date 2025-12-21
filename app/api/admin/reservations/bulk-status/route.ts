
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ReservationStatus } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const { reservationIds, status } = await request.json();

        if (!reservationIds || !Array.isArray(reservationIds) || reservationIds.length === 0) {
            return NextResponse.json({ error: "reservationIds array is required" }, { status: 400 });
        }
        if (!status) {
            return NextResponse.json({ error: "status is required" }, { status: 400 });
        }

        // Validate Status Transition (Basic)
        // We could be stricter here, e.g. preventing 'check_in' if status is 'cancelled'
        // For MVP, we'll allow admin override power but could filter valid IDs if needed.

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({ status: status as ReservationStatus })
            .in('id', reservationIds)
            .select('id, status');

        if (error) {
            throw error;
        }

        // Return the updated records so UI can reconcile
        return NextResponse.json({ updated: data });

    } catch (error) {
        console.error("Bulk Status Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
