import { supabaseAdmin } from '@/lib/supabase-admin';
import { addDays, subDays, format } from 'date-fns';

/**
 * Seeds demo data for a new campground to help with onboarding.
 * 
 * **Production Safety Guarantees:**
 * - Tenant-scoped: All queries filtered by organization_id
 * - Only runs if NO non-demo reservations exist for this organization
 * - Atomic locking via demo_seed_locks table (prevents race conditions)
 * - All demo data marked with metadata.is_demo = true and demo_source = 'calendar_seed_v1'
 * - Surgical deletion with audit logging
 * - RLS-safe: Uses supabaseAdmin
 */
export async function seedDemoDataForCampground(
    organizationId: string,
    adminUserId: string
): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Check for non-demo reservations (tenant-scoped, safer filter)
        const { count: realReservations } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .neq('metadata->>is_demo', 'true');

        if (realReservations && realReservations > 0) {
            console.log('[Demo Seed] Real reservations exist. Skipping demo seed.');
            return { success: false, message: 'Organization has real reservations' };
        }

        // 2. Atomic lock acquisition via demo_seed_locks table
        const { error: lockError } = await supabaseAdmin
            .from('demo_seed_locks')
            .insert({
                organization_id: organizationId,
                locked_by: adminUserId,
                status: 'processing'
            });

        if (lockError) {
            // Lock already exists, check if stale
            const { data: existingLock } = await supabaseAdmin
                .from('demo_seed_locks')
                .select('locked_at, status')
                .eq('organization_id', organizationId)
                .single();

            if (existingLock) {
                // If already completed, don't re-seed
                if (existingLock.status === 'completed') {
                    return { success: false, message: 'Demo data already seeded' };
                }

                // Check if processing lock is stale (>5 min)
                const lockAge = Date.now() - new Date(existingLock.locked_at).getTime();
                if (lockAge < 5 * 60 * 1000) {
                    return { success: false, message: 'Seed operation already in progress' };
                }

                // Stale lock, delete and retry
                await supabaseAdmin
                    .from('demo_seed_locks')
                    .delete()
                    .eq('organization_id', organizationId);

                // Retry lock acquisition
                const { error: retryError } = await supabaseAdmin
                    .from('demo_seed_locks')
                    .insert({
                        organization_id: organizationId,
                        locked_by: adminUserId,
                        status: 'processing'
                    });

                if (retryError) {
                    return { success: false, message: 'Failed to acquire lock' };
                }
            }
        }

        // 3. Environment Check
        const ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED !== 'false';
        if (!ALLOW_DEMO_SEED) {
            await supabaseAdmin
                .from('demo_seed_locks')
                .delete()
                .eq('organization_id', organizationId);
            console.log('[Demo Seed] Disabled via env var.');
            return { success: false, message: 'Demo seeding disabled' };
        }

        console.log(`[Demo Seed] Starting demo data generation for org ${organizationId}...`);

        // 4. Create Demo Campsites
        const campsites = await createDemoCampsites(organizationId);
        console.log(`[Demo Seed] Created ${campsites.length} demo campsites`);

        // 5. Create Demo Reservations
        const reservations = await createDemoReservations(organizationId, campsites);
        console.log(`[Demo Seed] Created ${reservations.length} demo reservations`);

        // 6. Create Demo Blackout Date
        await createDemoBlackout(organizationId, campsites[0].id);
        console.log('[Demo Seed] Created demo blackout date');

        // 7. Mark as completed
        await supabaseAdmin
            .from('demo_seed_locks')
            .update({
                status: 'completed',
                metadata: {
                    campsites_count: campsites.length,
                    reservations_count: reservations.length,
                    completed_at: new Date().toISOString(),
                    completed_by: adminUserId
                }
            })
            .eq('organization_id', organizationId);

        // 8. Audit log
        await supabaseAdmin.from('audit_logs').insert({
            action: 'DEMO_SEED_COMPLETED',
            organization_id: organizationId,
            reservation_id: '00000000-0000-0000-0000-000000000000',
            changed_by: adminUserId,
            new_data: {
                campsites_count: campsites.length,
                reservations_count: reservations.length,
                completed_at: new Date().toISOString()
            }
        });

        return {
            success: true,
            message: `Created ${campsites.length} campsites and ${reservations.length} reservations`
        };

    } catch (error) {
        // Cleanup lock on error
        await supabaseAdmin
            .from('demo_seed_locks')
            .delete()
            .eq('organization_id', organizationId);
        console.error('[Demo Seed] Error:', error);
        throw error;
    }
}

/**
 * Creates 6 demo campsites with varied types
 */
async function createDemoCampsites(organizationId: string) {
    const demoCampsites = [
        {
            organization_id: organizationId,
            name: 'Demo Site A',
            type: 'RV',
            capacity: 6,
            price_per_night: 45,
            is_active: true,
            amenities: ['Electric Hookup', 'Water Hookup'],
            description: 'Demo RV site with full hookups',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            name: 'Demo Site B',
            type: 'RV',
            capacity: 4,
            price_per_night: 40,
            is_active: true,
            amenities: ['Electric Hookup'],
            description: 'Demo RV site with electric only',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            name: 'Demo Tent 1',
            type: 'Tent',
            capacity: 4,
            price_per_night: 25,
            is_active: true,
            amenities: ['Fire Pit', 'Picnic Table'],
            description: 'Demo tent site',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            name: 'Demo Tent 2',
            type: 'Tent',
            capacity: 4,
            price_per_night: 25,
            is_active: true,
            amenities: ['Fire Pit', 'Picnic Table'],
            description: 'Demo tent site',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            name: 'Demo Cabin 1',
            type: 'Cabin',
            capacity: 6,
            price_per_night: 85,
            is_active: true,
            amenities: ['Electricity', 'Heating', 'Beds'],
            description: 'Demo cabin with amenities',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            name: 'Demo Cabin 2',
            type: 'Cabin',
            capacity: 4,
            price_per_night: 75,
            is_active: true,
            amenities: ['Electricity', 'Heating'],
            description: 'Demo cabin',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        }
    ];

    const { data, error } = await supabaseAdmin
        .from('campsites')
        .insert(demoCampsites)
        .select();

    if (error) throw error;
    return data;
}

/**
 * Creates 10 demo reservations with varied statuses and dates
 * Includes 2 overlapping reservations marked with has_conflict for demo purposes
 */
async function createDemoReservations(organizationId: string, campsites: any[]) {
    const today = new Date();

    const demoReservations = [
        // Past confirmed reservation
        {
            organization_id: organizationId,
            campsite_id: campsites[0].id,
            first_name: 'Demo',
            last_name: 'Guest 1',
            email: 'demo1@example.com',
            phone: '555-0101',
            check_in: format(subDays(today, 10), 'yyyy-MM-dd'),
            check_out: format(subDays(today, 7), 'yyyy-MM-dd'),
            adults: 2,
            children: 1,
            camping_unit: 'RV',
            status: 'confirmed',
            payment_status: 'paid',
            amount_paid: 135,
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        // Past cancelled reservation
        {
            organization_id: organizationId,
            campsite_id: campsites[1].id,
            first_name: 'Demo',
            last_name: 'Guest 2',
            email: 'demo2@example.com',
            phone: '555-0102',
            check_in: format(subDays(today, 5), 'yyyy-MM-dd'),
            check_out: format(subDays(today, 2), 'yyyy-MM-dd'),
            adults: 2,
            children: 0,
            camping_unit: 'RV',
            status: 'cancelled',
            payment_status: 'pay_on_arrival',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        // Current reservation (checked in)
        {
            organization_id: organizationId,
            campsite_id: campsites[2].id,
            first_name: 'Demo',
            last_name: 'Guest 3',
            email: 'demo3@example.com',
            phone: '555-0103',
            check_in: format(subDays(today, 1), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 2), 'yyyy-MM-dd'),
            adults: 3,
            children: 2,
            camping_unit: 'Tent',
            status: 'confirmed',
            payment_status: 'paid',
            amount_paid: 75,
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        // Future confirmed reservations
        {
            organization_id: organizationId,
            campsite_id: campsites[3].id,
            first_name: 'Demo',
            last_name: 'Guest 4',
            email: 'demo4@example.com',
            phone: '555-0104',
            check_in: format(addDays(today, 5), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 8), 'yyyy-MM-dd'),
            adults: 2,
            children: 0,
            camping_unit: 'Tent',
            status: 'confirmed',
            payment_status: 'deposit_paid',
            amount_paid: 25,
            balance_due: 50,
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            campsite_id: campsites[4].id,
            first_name: 'Demo',
            last_name: 'Guest 5',
            email: 'demo5@example.com',
            phone: '555-0105',
            check_in: format(addDays(today, 10), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 13), 'yyyy-MM-dd'),
            adults: 4,
            children: 2,
            camping_unit: 'Cabin',
            status: 'confirmed',
            payment_status: 'paid',
            amount_paid: 255,
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        // Future pending (unassigned)
        {
            organization_id: organizationId,
            campsite_id: null,
            first_name: 'Demo',
            last_name: 'Guest 6',
            email: 'demo6@example.com',
            phone: '555-0106',
            check_in: format(addDays(today, 15), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 18), 'yyyy-MM-dd'),
            adults: 2,
            children: 1,
            camping_unit: 'RV',
            status: 'pending',
            payment_status: 'pay_on_arrival',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        // Overlapping reservations (to demonstrate conflict handling)
        // First reservation: confirmed
        {
            organization_id: organizationId,
            campsite_id: campsites[0].id,
            first_name: 'Demo',
            last_name: 'Guest 7',
            email: 'demo7@example.com',
            phone: '555-0107',
            check_in: format(addDays(today, 20), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 23), 'yyyy-MM-dd'),
            adults: 2,
            children: 0,
            camping_unit: 'RV',
            status: 'confirmed',
            payment_status: 'paid',
            amount_paid: 135,
            metadata: {
                is_demo: true,
                demo_source: 'calendar_seed_v1',
                demo_note: 'Part of intentional overlap demo'
            }
        },
        // Second reservation: pending with conflict (intentional for demo)
        {
            organization_id: organizationId,
            campsite_id: campsites[0].id,
            first_name: 'Demo',
            last_name: 'Guest 8 (Conflict)',
            email: 'demo8@example.com',
            phone: '555-0108',
            check_in: format(addDays(today, 22), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 25), 'yyyy-MM-dd'),
            adults: 3,
            children: 1,
            camping_unit: 'RV',
            status: 'pending',
            payment_status: 'pay_on_arrival',
            metadata: {
                is_demo: true,
                demo_source: 'calendar_seed_v1',
                has_conflict: true,
                demo_note: 'Intentional overlap to demonstrate conflict detection'
            }
        },
        // More future reservations
        {
            organization_id: organizationId,
            campsite_id: campsites[5].id,
            first_name: 'Demo',
            last_name: 'Guest 9',
            email: 'demo9@example.com',
            phone: '555-0109',
            check_in: format(addDays(today, 25), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 28), 'yyyy-MM-dd'),
            adults: 2,
            children: 2,
            camping_unit: 'Cabin',
            status: 'confirmed',
            payment_status: 'paid',
            amount_paid: 225,
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        },
        {
            organization_id: organizationId,
            campsite_id: campsites[1].id,
            first_name: 'Demo',
            last_name: 'Guest 10',
            email: 'demo10@example.com',
            phone: '555-0110',
            check_in: format(addDays(today, 30), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 33), 'yyyy-MM-dd'),
            adults: 2,
            children: 0,
            camping_unit: 'RV',
            status: 'confirmed',
            payment_status: 'deposit_paid',
            amount_paid: 40,
            balance_due: 80,
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        }
    ];

    const { data, error } = await supabaseAdmin
        .from('reservations')
        .insert(demoReservations)
        .select();

    if (error) throw error;
    return data;
}

/**
 * Creates a demo blackout date
 */
async function createDemoBlackout(organizationId: string, campsiteId: string) {
    const today = new Date();

    const { data, error } = await supabaseAdmin
        .from('blackout_dates')
        .insert({
            organization_id: organizationId,
            campsite_id: campsiteId,
            start_date: format(addDays(today, 35), 'yyyy-MM-dd'),
            end_date: format(addDays(today, 37), 'yyyy-MM-dd'),
            reason: 'Demo: Maintenance Period',
            metadata: { is_demo: true, demo_source: 'calendar_seed_v1' }
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Clears all demo data from the organization with surgical precision.
 * 
 * **Safety Guarantees:**
 * - Tenant-scoped: Only deletes from specified organization
 * - Source-scoped: Only deletes demo_source = 'calendar_seed_v1'
 * - Counts deleted items for audit logging
 * - Logs the deletion action with admin user ID
 * - Deletes in correct order (reservations → blackouts → campsites)
 * - Removes seed lock to allow re-seeding
 */
export async function clearDemoData(
    organizationId: string,
    adminUserId: string
): Promise<{ success: boolean; message: string }> {
    try {
        // Environment safety check
        const ALLOW_DEMO_CLEAR = process.env.ALLOW_DEMO_CLEAR !== 'false';
        if (!ALLOW_DEMO_CLEAR) {
            return { success: false, message: 'Demo data clearing is disabled' };
        }

        let deletedCounts = {
            reservations: 0,
            blackouts: 0,
            campsites: 0
        };

        // 1. Delete demo reservations (first, due to FK constraints)
        const { data: deletedReservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('metadata->>demo_source', 'calendar_seed_v1')
            .select('id');

        if (resError) throw resError;
        deletedCounts.reservations = deletedReservations?.length || 0;

        // 2. Delete demo blackout dates
        const { data: deletedBlackouts, error: blackoutError } = await supabaseAdmin
            .from('blackout_dates')
            .delete()
            .eq('organization_id', organizationId)
            .eq('metadata->>demo_source', 'calendar_seed_v1')
            .select('id');

        if (blackoutError) throw blackoutError;
        deletedCounts.blackouts = deletedBlackouts?.length || 0;

        // 3. Delete demo campsites (last, after reservations are gone)
        const { data: deletedCampsites, error: campsiteError } = await supabaseAdmin
            .from('campsites')
            .delete()
            .eq('organization_id', organizationId)
            .eq('metadata->>demo_source', 'calendar_seed_v1')
            .select('id');

        if (campsiteError) throw campsiteError;
        deletedCounts.campsites = deletedCampsites?.length || 0;

        // 4. Audit log the deletion
        await supabaseAdmin.from('audit_logs').insert({
            action: 'DEMO_DATA_CLEARED',
            organization_id: organizationId,
            reservation_id: '00000000-0000-0000-0000-000000000000',
            changed_by: adminUserId,
            old_data: deletedCounts,
            new_data: { cleared_at: new Date().toISOString() }
        });

        // 5. Remove the seed lock (allow re-seeding)
        await supabaseAdmin
            .from('demo_seed_locks')
            .delete()
            .eq('organization_id', organizationId);

        console.log(`[Demo Seed] Cleared demo data for org ${organizationId}:`, deletedCounts);
        return {
            success: true,
            message: `Cleared ${deletedCounts.reservations} reservations, ${deletedCounts.blackouts} blackouts, ${deletedCounts.campsites} campsites`
        };

    } catch (error) {
        console.error('[Demo Seed] Error clearing demo data:', error);
        throw error;
    }
}
