import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { logAudit } from "@/lib/audit/audit-service";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { id } = await params;
        const body = await request.json();
        const { campsiteId } = body;

        if (!campsiteId) {
            return NextResponse.json({ error: "campsiteId is required" }, { status: 400 });
        }

        // 1. Fetch Reservation Details
        const { data: reservation, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('id', id)
            .single();

        if (resError || !reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        // 2. Validate Campsite Exists and is Active
        const { data: campsite, error: siteError } = await supabaseAdmin
            .from('campsites')
            .select('id, is_active')
            .eq('id', campsiteId)
            .single();

        if (siteError || !campsite) {
            return NextResponse.json({ error: "Campsite not found" }, { status: 404 });
        }
        if (!campsite.is_active) {
            return NextResponse.json({ error: "Campsite is not active" }, { status: 409 });
        }

        // 3. Check for Conflicts (Overlap)
        // We exclude the current reservation ID from conflict check (in case we are re-assigning same dates)
        // Logic: (StartA <= EndB) and (EndA >= StartB)
        const { data: conflicts } = await supabaseAdmin
            .from('reservations')
            .select('id')
            .eq('campsite_id', campsiteId)
            .neq('id', id)
            .in('status', ['pending', 'confirmed', 'checked_in'])
            .or(`and(check_in.lt.${reservation.check_out},check_out.gt.${reservation.check_in})`);

        if (conflicts && conflicts.length > 0) {
            return NextResponse.json({ error: "Campsite is already booked for these dates" }, { status: 409 });
        }

        // 4. Check Blackouts
        const { data: blackouts } = await supabaseAdmin
            .from('blackout_dates')
            .select('id')
            .eq('campsite_id', campsiteId)
            .or(`and(start_date.lte.${reservation.check_out},end_date.gte.${reservation.check_in})`);

        if (blackouts && blackouts.length > 0) {
            return NextResponse.json({ error: "Campsite is blacked out for these dates" }, { status: 409 });
        }

        // 5. Perform Assignment
        const { error: updateError } = await supabaseAdmin
            .from('reservations')
            .update({ campsite_id: campsiteId })
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }

        // 6. Audit Logging
        await logAudit({
            action: 'RESERVATION_UPDATE',
            reservationId: id,
            oldData: { campsite_id: reservation.campsite_id },
            newData: { campsite_id: campsiteId },
            changedBy: user!.id
        });

        return NextResponse.json({ success: true, campsiteId });

    } catch (error) {
        console.error("Assignment Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
