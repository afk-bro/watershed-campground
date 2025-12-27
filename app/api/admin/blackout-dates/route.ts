import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { blackoutFormSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit/audit-service';
import { verifyOrgResource } from '@/lib/db-helpers';

export async function POST(request: Request) {
    try {
        // 1. Authorization
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        // 2. Validation
        const body = await request.json();
        const validation = blackoutFormSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { start_date, end_date, campsite_id, reason } = validation.data;

        // 2.5. Verify Campsite Ownership (if campsite_id provided)
        const finalCampsiteId = campsite_id === 'UNASSIGNED' ? null : campsite_id;
        if (finalCampsiteId) {
            // Verify campsite belongs to this org (404 if not found)
            await verifyOrgResource('campsites', finalCampsiteId, organizationId!);
        }

        // 3. Database Operation (org-scoped)
        const { data, error } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date,
                end_date,
                campsite_id: finalCampsiteId,
                reason,
                organization_id: organizationId!,
            })
            .select()
            .single();

        if (error) throw error;

        // 4. Audit Logging
        await logAudit({
            action: 'BLACKOUT_CREATE',
            newData: data,
            changedBy: user!.id,
            organizationId: organizationId!
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating blackout date:', error);
        return NextResponse.json(
            { error: 'Failed to create blackout date' },
            { status: 500 }
        );
    }
}
