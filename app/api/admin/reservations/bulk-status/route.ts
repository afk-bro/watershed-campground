import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ReservationStatus } from "@/lib/supabase";
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { logAudit } from "@/lib/audit/audit-service";
import { z } from "zod";

const bulkStatusSchema = z.object({
    reservationIds: z.array(z.string()).min(1),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show'])
});

export async function POST(request: Request) {
    try {
        // 1. Authorization
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const body = await request.json();
        const validation = bulkStatusSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }
        const { reservationIds, status } = validation.data;

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({ status: status as ReservationStatus })
            .eq('organization_id', organizationId!)
            .in('id', reservationIds)
            .select('id, status');

        if (error) throw error;

        // 2. Audit Logging
        await logAudit({
            action: 'RESERVATION_UPDATE',
            newData: { reservationIds, status },
            changedBy: user!.id
        });

        return NextResponse.json({ updated: data });

    } catch (error) {
        console.error("Bulk Status Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
