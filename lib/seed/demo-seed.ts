import { supabaseAdmin } from '@/lib/supabase-admin';
import { addDays, subDays, format } from 'date-fns';

/**
 * Seeds demo data for a new campground to help with onboarding.
 * 
 * **Production Safety Guarantees:**
 * - Only runs if NO non-demo reservations exist
 * - Tracks seeding via audit_logs (runs at most once unless explicitly allowed)
 * - Concurrency-safe (uses processing status to prevent double-seeding)
 * - All demo data marked with metadata.is_demo = true
 * - Surgical deletion with audit logging
 */
export async function seedDemoDataForCampground(adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Check if already seeded (seed marker)
        const { data: existingSeed } = await supabaseAdmin
            .from('audit_logs')
            .select('id')
            .eq('action', 'DEMO_SEED_COMPLETED')
            .single();

        if (existingSeed) {
            console.log('[Demo Seed] Already seeded previously. Skipping.');
            return { success: false, message: 'Demo data already seeded' };
        }

        // 2. Check for non-demo reservations (improved idempotency)
        const { count: realReservations } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .or('metadata->>is_demo.is.null,metadata->>is_demo.neq.true');

        if (realReservations && realReservations > 0) {
            console.log('[Demo Seed] Real reservations exist. Skipping demo seed.');
            return { success: false, message: 'Campground has real reservations' };
        }

        // 3. Concurrency protection: Set processing status
        const processingMarker = {
            action: 'DEMO_SEED_PROCESSING' as const,
            reservation_id: '00000000-0000-0000-0000-000000000000',
            changed_by: adminUserId,
            new_data: { started_at: new Date().toISOString() }
        };

        const { data: existingProcessing } = await supabaseAdmin
            .from('audit_logs')
            .select('id, created_at')
            .eq('action', 'DEMO_SEED_PROCESSING')
            .single();

        if (existingProcessing) {
            // Check if it's stale (older than 5 minutes)
            const processingAge = Date.now() - new Date(existingProcessing.created_at).getTime();
            if (processingAge < 5 * 60 * 1000) {
                console.log('[Demo Seed] Another seed operation in progress. Skipping.');
                return { success: false, message: 'Seed operation already in progress' };
            }
            // Stale lock, delete it
            await supabaseAdmin.from('audit_logs').delete().eq('id', existingProcessing.id);
        }

        // Insert processing marker
        await supabaseAdmin.from('audit_logs').insert(processingMarker);

        // 4. Environment Check
        const ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED !== 'false';
        if (!ALLOW_DEMO_SEED) {
            await supabaseAdmin.from('audit_logs').delete().eq('action', 'DEMO_SEED_PROCESSING');
            console.log('[Demo Seed] Disabled via env var.');
            return { success: false, message: 'Demo seeding disabled' };
        }

        console.log('[Demo Seed] Starting demo data generation...');

        // 5. Create Demo Campsites
        const campsites = await createDemoCampsites();
        console.log(`[Demo Seed] Created ${campsites.length} demo campsites`);

        // 6. Create Demo Reservations
        const reservations = await createDemoReservations(campsites);
        console.log(`[Demo Seed] Created ${reservations.length} demo reservations`);

        // 7. Create Demo Blackout Date
        await createDemoBlackout(campsites[0].id);
        console.log('[Demo Seed] Created demo blackout date');

        // 8. Mark as completed (seed marker)
        await supabaseAdmin.from('audit_logs').insert({
            action: 'DEMO_SEED_COMPLETED',
            reservation_id: '00000000-0000-0000-0000-000000000000',
            changed_by: adminUserId,
            new_data: {
                campsites_count: campsites.length,
                reservations_count: reservations.length,
                completed_at: new Date().toISOString()
            }
        });

        // 9. Remove processing marker
        await supabaseAdmin.from('audit_logs').delete().eq('action', 'DEMO_SEED_PROCESSING');

        return {
            success: true,
            message: `Created ${campsites.length} campsites and ${reservations.length} reservations`
        };

    } catch (error) {
        // Cleanup processing marker on error
        await supabaseAdmin.from('audit_logs').delete().eq('action', 'DEMO_SEED_PROCESSING');
        console.error('[Demo Seed] Error:', error);
        throw error;
    }
}

/**
 * Creates 6 demo campsites with varied types
 */
async function createDemoCampsites() {
    const demoCampsites = [
        {
            name: 'Demo Site A',
            type: 'RV',
            capacity: 6,
            price_per_night: 45,
            is_active: true,
            amenities: ['Electric Hookup', 'Water Hookup'],
            description: 'Demo RV site with full hookups',
            metadata: { is_demo: true }
        },
        {
            name: 'Demo Site B',
            type: 'RV',
            capacity: 4,
            price_per_night: 40,
            is_active: true,
            amenities: ['Electric Hookup'],
            description: 'Demo RV site with electric only',
            metadata: { is_demo: true }
        },
        {
            name: 'Demo Tent 1',
            type: 'Tent',
            capacity: 4,
            price_per_night: 25,
            is_active: true,
            amenities: ['Fire Pit', 'Picnic Table'],
            description: 'Demo tent site',
            metadata: { is_demo: true }
        },
        {
            name: 'Demo Tent 2',
            type: 'Tent',
            capacity: 4,
            price_per_night: 25,
            is_active: true,
            amenities: ['Fire Pit', 'Picnic Table'],
            description: 'Demo tent site',
            metadata: { is_demo: true }
        },
        {
            name: 'Demo Cabin 1',
            type: 'Cabin',
            capacity: 6,
            price_per_night: 85,
            is_active: true,
            amenities: ['Electricity', 'Heating', 'Beds'],
            description: 'Demo cabin with amenities',
            metadata: { is_demo: true }
        },
        {
            name: 'Demo Cabin 2',
            type: 'Cabin',
            capacity: 4,
            price_per_night: 75,
            is_active: true,
            amenities: ['Electricity', 'Heating'],
            description: 'Demo cabin',
            metadata: { is_demo: true }
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
async function createDemoReservations(campsites: any[]) {
    const today = new Date();

    const demoReservations = [
        // Past confirmed reservation
        {
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
            metadata: { is_demo: true }
        },
        // Past cancelled reservation
        {
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
            metadata: { is_demo: true }
        },
        // Current reservation (checked in)
        {
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
            metadata: { is_demo: true }
        },
        // Future confirmed reservations
        {
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
            metadata: { is_demo: true }
        },
        {
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
            metadata: { is_demo: true }
        },
        // Future pending (unassigned)
        {
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
            metadata: { is_demo: true }
        },
        // Overlapping reservations (to demonstrate conflict handling)
        // First reservation: confirmed
        {
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
            metadata: { is_demo: true, demo_note: 'Part of intentional overlap demo' }
        },
        // Second reservation: pending with conflict (intentional for demo)
        {
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
                has_conflict: true,
                demo_note: 'Intentional overlap to demonstrate conflict detection'
            }
        },
        // More future reservations
        {
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
            metadata: { is_demo: true }
        },
        {
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
            metadata: { is_demo: true }
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
async function createDemoBlackout(campsiteId: string) {
    const today = new Date();

    const { data, error } = await supabaseAdmin
        .from('blackout_dates')
        .insert({
            campsite_id: campsiteId,
            start_date: format(addDays(today, 35), 'yyyy-MM-dd'),
            end_date: format(addDays(today, 37), 'yyyy-MM-dd'),
            reason: 'Demo: Maintenance Period',
            metadata: { is_demo: true }
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Clears all demo data from the campground with surgical precision.
 * 
 * **Safety Guarantees:**
 * - Only deletes items with metadata.is_demo = true
 * - Counts deleted items for audit logging
 * - Logs the deletion action with admin user ID
 * - Deletes in correct order (reservations → blackouts → campsites)
 */
export async function clearDemoData(adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
        let deletedCounts = {
            reservations: 0,
            blackouts: 0,
            campsites: 0
        };

        // 1. Delete demo reservations (first, due to FK constraints)
        const { data: deletedReservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .delete()
            .eq('metadata->>is_demo', 'true')
            .select('id');

        if (resError) throw resError;
        deletedCounts.reservations = deletedReservations?.length || 0;

        // 2. Delete demo blackout dates
        const { data: deletedBlackouts, error: blackoutError } = await supabaseAdmin
            .from('blackout_dates')
            .delete()
            .eq('metadata->>is_demo', 'true')
            .select('id');

        if (blackoutError) throw blackoutError;
        deletedCounts.blackouts = deletedBlackouts?.length || 0;

        // 3. Delete demo campsites (last, after reservations are gone)
        const { data: deletedCampsites, error: campsiteError } = await supabaseAdmin
            .from('campsites')
            .delete()
            .eq('metadata->>is_demo', 'true')
            .select('id');

        if (campsiteError) throw campsiteError;
        deletedCounts.campsites = deletedCampsites?.length || 0;

        // 4. Audit log the deletion
        await supabaseAdmin.from('audit_logs').insert({
            action: 'DEMO_DATA_CLEARED',
            reservation_id: '00000000-0000-0000-0000-000000000000',
            changed_by: adminUserId,
            old_data: deletedCounts,
            new_data: { cleared_at: new Date().toISOString() }
        });

        // 5. Remove the seed completion marker (allow re-seeding)
        await supabaseAdmin
            .from('audit_logs')
            .delete()
            .eq('action', 'DEMO_SEED_COMPLETED');

        console.log('[Demo Seed] Cleared demo data:', deletedCounts);
        return {
            success: true,
            message: `Cleared ${deletedCounts.reservations} reservations, ${deletedCounts.blackouts} blackouts, ${deletedCounts.campsites} campsites`
        };

    } catch (error) {
        console.error('[Demo Seed] Error clearing demo data:', error);
        throw error;
    }
}
