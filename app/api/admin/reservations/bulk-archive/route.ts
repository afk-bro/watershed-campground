
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
    try {
        const { reservationIds, action } = await request.json();

        if (!reservationIds || !Array.isArray(reservationIds) || reservationIds.length === 0) {
            return NextResponse.json({ error: "reservationIds array is required" }, { status: 400 });
        }
        if (action !== 'archive' && action !== 'restore') {
            return NextResponse.json({ error: "action must be 'archive' or 'restore'" }, { status: 400 });
        }

        const updates = {
            archived_at: action === 'archive' ? new Date().toISOString() : null
            // We could set archived_by here if we extracted user ID from session
        };

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update(updates)
            .in('id', reservationIds)
            .select('id, archived_at');

        if (error) {
            throw error;
        }

        return NextResponse.json({ updated: data });

    } catch (error) {
        console.error("Bulk Archive Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
