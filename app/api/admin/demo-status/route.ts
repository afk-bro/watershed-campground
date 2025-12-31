import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withAdminAuth } from '@/lib/admin/api-wrapper';

/**
 * GET /api/admin/demo-status
 *
 * Returns the current demo data status for the organization.
 * This provides server-authoritative truth for the demo banner UI.
 */
export const GET = withAdminAuth(async ({ organizationId }) => {
    // Check if demo seed is in progress
    const { data: processingLock } = await supabaseAdmin
        .from('demo_seed_locks')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('status', 'processing')
        .single();

    // Check if demo has been seeded
    const { data: completedLock } = await supabaseAdmin
        .from('demo_seed_locks')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .single();

    // Check for non-demo reservations
    const { count: realReservations } = await supabaseAdmin
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .neq('metadata->>is_demo', 'true');

    // Check for demo data
    const { count: demoReservations } = await supabaseAdmin
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('metadata->>demo_source', 'calendar_seed_v1');

    return NextResponse.json({
        organization_id: organizationId,
        demo_processing: !!processingLock,
        demo_seeded: !!completedLock,
        has_non_demo_reservations: (realReservations || 0) > 0,
        has_demo_data: (demoReservations || 0) > 0
    });
});
