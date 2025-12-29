import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ReservationStatus } from "@/lib/supabase";
import { logBulkReservationOperation } from "@/lib/audit/audit-service";
import { z } from "zod";
import { withAdminAuth } from '@/lib/admin/api-wrapper';

const bulkStatusSchema = z.object({
    reservationIds: z.array(z.string()).min(1),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show'])
});

export const POST = withAdminAuth(async ({ request, user, organizationId }) => {
    const body = await request.json();
    const validation = bulkStatusSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    const { reservationIds, status } = validation.data;

    const { data, error } = await supabaseAdmin
        .from('reservations')
        .update({ status: status as ReservationStatus })
        .eq('organization_id', organizationId)
        .in('id', reservationIds)
        .select('id, status');

    if (error) throw error;

    // Audit Logging
    await logBulkReservationOperation({
        action: 'RESERVATION_BULK_UPDATE',
        reservationIds,
        changes: { status },
        userId: user.id,
        organizationId
    });

    return NextResponse.json({ updated: data });
});
