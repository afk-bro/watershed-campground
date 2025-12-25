import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { blackoutFormSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit/audit-service';

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

        // 3. Database Operation
        const { data, error } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date,
                end_date,
                campsite_id: campsite_id === 'UNASSIGNED' ? null : campsite_id,
                reason
            })
            .select()
            .single();

        if (error) throw error;

        // 4. Audit Logging
        await logAudit({
            action: 'BLACKOUT_CREATE',
            newData: data,
            changedBy: user!.id
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
