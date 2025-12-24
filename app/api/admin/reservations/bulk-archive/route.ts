import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit/audit-service";
import { z } from "zod";

const bulkActionSchema = z.object({
    reservationIds: z.array(z.string()).min(1),
    action: z.enum(['archive', 'restore'])
});

export async function POST(request: Request) {
    try {
        // 1. Authorization
        const { authorized, user, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        // 2. Validation
        const body = await request.json();
        const validation = bulkActionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }
        const { reservationIds, action } = validation.data;

        const updates = {
            archived_at: action === 'archive' ? new Date().toISOString() : null,
            archived_by: action === 'archive' ? user!.id : null
        };

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update(updates)
            .in('id', reservationIds)
            .select('id, archived_at');

        if (error) throw error;

        // 3. Audit Logging (simplified for bulk)
        await logAudit({
            action: action === 'archive' ? 'RESERVATION_ARCHIVE' : 'RESERVATION_RESTORE',
            newData: { reservationIds, action },
            changedBy: user!.id
        });

        return NextResponse.json({ updated: data });

    } catch (error) {
        console.error("Bulk Archive Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
