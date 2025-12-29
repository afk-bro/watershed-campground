import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { blackoutFormSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit/audit-service';
import { verifyOrgResource } from '@/lib/db-helpers';
import { validationError } from "@/lib/api-helpers";
import { withAdminAuth } from '@/lib/admin/api-wrapper';

export const POST = withAdminAuth(async ({ request, user, organizationId }) => {
    // 1. Validation
    const body = await request.json();
    const validation = blackoutFormSchema.safeParse(body);

    if (!validation.success) {
        return validationError(validation.error);
    }

    const { start_date, end_date, campsite_id, reason } = validation.data;

    // 2. Verify Campsite Ownership (if campsite_id provided)
    const finalCampsiteId = campsite_id === 'UNASSIGNED' ? null : campsite_id;
    if (finalCampsiteId) {
        // Verify campsite belongs to this org (404 if not found)
        await verifyOrgResource('campsites', finalCampsiteId, organizationId);
    }

    // 3. Database Operation (org-scoped)
    const { data, error } = await supabaseAdmin
        .from('blackout_dates')
        .insert({
            start_date,
            end_date,
            campsite_id: finalCampsiteId,
            reason,
            organization_id: organizationId,
        })
        .select()
        .single();

    if (error) throw error;

    // 4. Audit Logging
    await logAudit({
        action: 'BLACKOUT_CREATE',
        newData: data,
        changedBy: user.id,
        organizationId
    });

    return NextResponse.json(data);
});
