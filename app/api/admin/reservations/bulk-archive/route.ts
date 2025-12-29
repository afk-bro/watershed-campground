import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit/audit-service";
import { z } from "zod";
import { withAdminAuth } from '@/lib/admin/api-wrapper';

const bulkActionSchema = z.object({
    reservationIds: z.array(z.string()).min(1),
    action: z.enum(['archive', 'restore'])
});

export const POST = withAdminAuth(async ({ request, user, organizationId }) => {
    // Validation
    const body = await request.json();
    const validation = bulkActionSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    const { reservationIds, action } = validation.data;

    const updates = {
        archived_at: action === 'archive' ? new Date().toISOString() : null,
        archived_by: action === 'archive' ? user.id : null
    };

    const { data, error } = await supabaseAdmin
        .from('reservations')
        .update(updates)
        .eq('organization_id', organizationId)
        .in('id', reservationIds)
        .select('id, archived_at');

    if (error) throw error;

    // Audit Logging
    await logAudit({
        action: action === 'archive' ? 'RESERVATION_ARCHIVE' : 'RESERVATION_RESTORE',
        newData: { reservationIds, action },
        changedBy: user.id,
        organizationId
    });

    return NextResponse.json({ updated: data });
});
