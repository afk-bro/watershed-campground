import { NextResponse } from 'next/server';
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/admin/demo-status
 * 
 * Returns the current demo data status for the organization.
 * This provides server-authoritative truth for the demo banner UI.
 */
export async function GET(request: Request) {
    try {
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        // Check if demo seed is in progress
        const { data: processingLock } = await supabaseAdmin
            .from('demo_seed_locks')
            .select('status')
            .eq('organization_id', organizationId!)
            .eq('status', 'processing')
            .single();

        // Check if demo has been seeded
        const { data: completedLock } = await supabaseAdmin
            .from('demo_seed_locks')
            .select('status')
            .eq('organization_id', organizationId!)
            .eq('status', 'completed')
            .single();

        // Check for non-demo reservations
        const { count: realReservations } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId!)
            .neq('metadata->>is_demo', 'true');

        // Check for demo data
        const { count: demoReservations } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId!)
            .eq('metadata->>demo_source', 'calendar_seed_v1');

        return NextResponse.json({
            organization_id: organizationId,
            demo_processing: !!processingLock,
            demo_seeded: !!completedLock,
            has_non_demo_reservations: (realReservations || 0) > 0,
            has_demo_data: (demoReservations || 0) > 0
        });

    } catch (error) {
        console.error('[API] Demo status error:', error);
        return NextResponse.json(
            { error: 'Failed to get demo status' },
            { status: 500 }
        );
    }
}
