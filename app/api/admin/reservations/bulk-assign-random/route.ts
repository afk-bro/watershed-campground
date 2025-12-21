
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { searchCampsites } from "@/lib/availability/engine";

export async function POST(request: Request) {
    try {
        const { reservationIds } = await request.json();

        if (!reservationIds || !Array.isArray(reservationIds)) {
            return NextResponse.json({ error: "reservationIds array required" }, { status: 400 });
        }

        const results: { id: string; success: boolean; campsiteId?: string; reason?: string }[] = [];

        // Process sequentially to safely handle race conditions between items in the same batch
        // (If we process in parallel, two items could claim the same spot)
        for (const id of reservationIds) {
            // 1. Fetch Reservation
            const { data: reservation } = await supabaseAdmin
                .from('reservations')
                .select('*')
                .eq('id', id)
                .single();

            if (!reservation) {
                results.push({ id, success: false, reason: "Reservation not found" });
                continue;
            }

            if (reservation.campsite_id) {
                results.push({ id, success: false, reason: "Already assigned" });
                continue;
            }

            // 2. Find Available Sites
            // Note: searchCampsites internally checks db availability. 
            // Since we are iterating, subsequent calls will see the previous assignments 
            // IF we were confirming them instantly. But searchCampsites reads from DB. 
            // We must write to DB immediately for the next iteration to 'see' the conflict.
            const availableSites = await searchCampsites({
                checkIn: reservation.check_in,
                checkOut: reservation.check_out,
                guestCount: (reservation.adults || 0) + (reservation.children || 0),
                rvLength: reservation.rv_length ? parseInt(reservation.rv_length) : undefined, // parsing assumed safe or 0
                unitType: reservation.camping_unit
            });

            if (availableSites.length === 0) {
                results.push({ id, success: false, reason: "No available campsites" });
                continue;
            }

            // 3. Pick First Match
            const targetSite = availableSites[0];

            // 4. Assign
            const { error: assignError } = await supabaseAdmin
                .from('reservations')
                .update({ campsite_id: targetSite.id })
                .eq('id', id);

            if (assignError) {
                results.push({ id, success: false, reason: "Database update failed" });
            } else {
                results.push({ id, success: true, campsiteId: targetSite.id });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Bulk Assign Random Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
