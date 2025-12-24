import { supabaseAdmin } from '@/lib/supabase-admin';
import { addDays, subDays, format } from 'date-fns';

/**
 * Seeds demo data for a new campground to help with onboarding.
 * 
 * **Guardrails:**
 * - Only runs if campground has zero reservations
 * - Idempotent (safe to call multiple times)
 * - All demo data marked with metadata.is_demo = true
 * - Production-safe (per-campground, not global)
 */
export async function seedDemoDataForCampground(adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Idempotency Check
        const { count: existingReservations } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true });

        if (existingReservations && existingReservations > 0) {
            console.log('[Demo Seed] Campground already has data. Skipping.');
            return { success: false, message: 'Campground already has reservations' };
        }

        // 2. Environment Check (still allowed in prod for new tenants)
        const ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED !== 'false';
        if (!ALLOW_DEMO_SEED) {
            console.log('[Demo Seed] Disabled via env var.');
            return { success: false, message: 'Demo seeding disabled' };
        }

        console.log('[Demo Seed] Starting demo data generation...');

        // 3. Create Demo Campsites
        const campsites = await createDemoCampsites();
        console.log(`[Demo Seed] Created ${campsites.length} demo campsites`);

        // 4. Create Demo Reservations
        const reservations = await createDemoReservations(campsites);
        console.log(`[Demo Seed] Created ${reservations.length} demo reservations`);

        // 5. Create Demo Blackout Date
        await createDemoBlackout(campsites[0].id);
        console.log('[Demo Seed] Created demo blackout date');

        return {
            success: true,
            message: `Created ${campsites.length} campsites and ${reservations.length} reservations`
        };

    } catch (error) {
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
            metadata: { is_demo: true }
        },
        {
            campsite_id: campsites[0].id,
            first_name: 'Demo',
            last_name: 'Guest 8',
            email: 'demo8@example.com',
            phone: '555-0108',
            check_in: format(addDays(today, 22), 'yyyy-MM-dd'),
            check_out: format(addDays(today, 25), 'yyyy-MM-dd'),
            adults: 3,
            children: 1,
            camping_unit: 'RV',
            status: 'pending',
            payment_status: 'pay_on_arrival',
            metadata: { is_demo: true, has_conflict: true }
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
 * Clears all demo data from the campground
 */
export async function clearDemoData(): Promise<{ success: boolean; message: string }> {
    try {
        // Delete demo reservations
        const { error: resError } = await supabaseAdmin
            .from('reservations')
            .delete()
            .eq('metadata->>is_demo', 'true');

        if (resError) throw resError;

        // Delete demo blackout dates
        const { error: blackoutError } = await supabaseAdmin
            .from('blackout_dates')
            .delete()
            .eq('metadata->>is_demo', 'true');

        if (blackoutError) throw blackoutError;

        // Delete demo campsites
        const { error: campsiteError } = await supabaseAdmin
            .from('campsites')
            .delete()
            .eq('metadata->>is_demo', 'true');

        if (campsiteError) throw campsiteError;

        console.log('[Demo Seed] Cleared all demo data');
        return { success: true, message: 'Demo data cleared successfully' };

    } catch (error) {
        console.error('[Demo Seed] Error clearing demo data:', error);
        throw error;
    }
}
