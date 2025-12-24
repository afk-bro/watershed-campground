import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { searchCampsites } from "@/lib/availability/engine";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit/audit-service";

export async function POST(request: Request) {
    try {
        // 1. Authorization
        const { authorized, user, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        const { reservationIds } = await request.json();

        if (!reservationIds || !Array.isArray(reservationIds)) {
            return NextResponse.json({ error: "reservationIds array required" }, { status: 400 });
        }

        const results: { id: string; success: boolean; campsiteId?: string; reason?: string }[] = [];

        // Process sequentially to safely handle race conditions
        for (const id of reservationIds) {
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

            const availableSites = await searchCampsites({
                checkIn: reservation.check_in,
                checkOut: reservation.check_out,
                guestCount: (reservation.adults || 0) + (reservation.children || 0),
                rvLength: reservation.rv_length ? parseInt(reservation.rv_length) : undefined,
                unitType: reservation.camping_unit
            });

            if (availableSites.length === 0) {
                results.push({ id, success: false, reason: "No available campsites" });
                continue;
            }

            const targetSite = availableSites[0];

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

        // 2. Audit Logging
        await logAudit({
            action: 'RESERVATION_UPDATE', // Batch assign is effectively multiple updates
            newData: { reservationIds, results },
            changedBy: user!.id
        });

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Bulk Assign Random Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
