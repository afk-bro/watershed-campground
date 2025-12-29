import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { searchCampsites } from "@/lib/availability/engine";
import { logAudit } from "@/lib/audit/audit-service";
import { withAdminAuth } from '@/lib/admin/api-wrapper';

export const POST = withAdminAuth(async ({ request, user, organizationId }) => {
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
            .eq('organization_id', organizationId)
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
            unitType: reservation.camping_unit,
            organizationId
        });

        if (availableSites.length === 0) {
            results.push({ id, success: false, reason: "No available campsites" });
            continue;
        }

        const targetSite = availableSites[0];

        const { error: assignError } = await supabaseAdmin
            .from('reservations')
            .update({ campsite_id: targetSite.id })
            .eq('id', id)
            .eq('organization_id', organizationId);

        if (assignError) {
            results.push({ id, success: false, reason: "Database update failed" });
        } else {
            results.push({ id, success: true, campsiteId: targetSite.id });
        }
    }

    // Audit Logging
    await logAudit({
        action: 'RESERVATION_UPDATE',
        newData: { reservationIds, results },
        changedBy: user.id,
        organizationId
    });

    return NextResponse.json({ results });
});
