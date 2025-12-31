import { createClient } from '@supabase/supabase-js';
import { format, addDays } from 'date-fns';

/**
 * INTERNAL: Test Supabase admin client
 * This client is NOT exported to prevent direct inserts in tests.
 * Use factory functions for creating records and cleanup functions for deleting them.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV !== 'test') {
        console.warn("Warning: Test Supabase admin environment variables are missing.");
    }
}

/**
 * Export for test queries (select/update/delete) ONLY.
 * Do NOT use .insert() - use factory functions instead!
 */
export const supabaseAdminInternal = createClient(
    supabaseUrl || 'http://localhost:54321',
    supabaseServiceKey || 'dummy-key-for-listing',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Standard Multi-tenancy Support
 */
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface BaseInsert {
    organization_id: string;
}

/**
 * Enforce organization_id on all test inserts
 */
function assertOrg(data: BaseInsert) {
    if (!data.organization_id) {
        throw new Error('MULTITENANCY_ERROR: organization_id is REQUIRED for all test database inserts.');
    }
}

/**
 * CAMPSITES
 */
export async function createTestCampsite(overrides: Partial<{
    name: string;
    code: string;
    type: 'rv' | 'tent' | 'cabin';
    max_guests: number;
    base_rate: number;
    is_active: boolean;
    organization_id: string;
}> = {}) {
    const data = {
        name: 'Test Site',
        code: `FACT${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        type: 'tent' as const,
        max_guests: 4,
        base_rate: 50.00,
        is_active: true,
        organization_id: DEFAULT_ORG_ID,
        ...overrides
    };

    assertOrg(data);

    const { data: campsite, error } = await supabaseAdminInternal
        .from('campsites')
        .insert(data)
        .select()
        .single();

    if (error) throw new Error(`Factory failed to create campsite: ${error.message} \nPayload: ${JSON.stringify(data, null, 2)}`);
    if (!campsite) throw new Error('Factory failed to create campsite: No data returned from insert');
    return campsite;
}

export async function deleteTestCampsite(id: string) {
    return supabaseAdminInternal.from('campsites').delete().eq('id', id);
}

/**
 * DEDICATED CAMPSITES (Avoid 409 conflicts)
 *
 * Creates a campsite guaranteed to be available for assignment during the test.
 * Use this instead of `.first()` or selecting from seed data to prevent 409 conflicts.
 *
 * Pattern enforces:
 * - Unique code per test (prevents collision with other workers)
 * - Explicit cleanup requirement (returns cleanup function)
 * - Descriptive naming for debugging
 *
 * @example
 * const { id, code, cleanup } = await createDedicatedCampsite({ codePrefix: 'LIFECYCLE' });
 * try {
 *   // Use campsite.id in test
 *   const campsiteOption = page.locator('[data-testid="campsite-option"]').filter({ hasText: code });
 * } finally {
 *   await cleanup();
 * }
 */
export async function createDedicatedCampsite(options: {
    codePrefix: string;
    name?: string;
    organization_id?: string;
} = { codePrefix: 'TEST' }) {
    const uniqueSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${options.codePrefix}${uniqueSuffix}`;

    const campsite = await createTestCampsite({
        name: options.name || `${options.codePrefix} Test Site`,
        code,
        is_active: true,
        organization_id: options.organization_id || DEFAULT_ORG_ID
    });

    return {
        id: campsite.id,
        code: campsite.code,
        name: campsite.name,
        cleanup: () => deleteTestCampsite(campsite.id)
    };
}

/**
 * RESERVATIONS
 */
export async function createTestReservation(overrides: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address1?: string;
    city?: string;
    postal_code?: string;
    check_in: string;
    check_out: string;
    campsite_id?: string | null;
    status: string;
    adults?: number;
    children?: number;
    rv_length?: string;
    camping_unit?: string;
    contact_method?: string;
    total_amount: number;
    amount_paid?: number;
    balance_due?: number;
    organization_id: string;
    [key: string]: any;
}> = {}) {
    const tomorrow = addDays(new Date(), 1);
    const data = {
        first_name: 'Factory',
        last_name: 'User',
        email: `test-${Math.random().toString(36).slice(2, 6)}@example.com`,
        phone: '+15555550123',
        address1: '123 Test St',
        city: 'Test City',
        postal_code: '12345',
        camping_unit: 'Tent',
        contact_method: 'Email',
        check_in: format(tomorrow, 'yyyy-MM-dd'),
        check_out: format(addDays(tomorrow, 2), 'yyyy-MM-dd'),
        status: 'pending',
        total_amount: 100,
        organization_id: DEFAULT_ORG_ID,
        ...overrides
    };

    assertOrg(data);

    const { data: reservation, error } = await supabaseAdminInternal
        .from('reservations')
        .insert(data)
        .select()
        .single();

    if (error) throw new Error(`Factory failed to create reservation: ${error.message} \nPayload: ${JSON.stringify(data, null, 2)}`);
    if (!reservation) throw new Error('Factory failed to create reservation: No data returned from insert');
    return reservation;
}

export async function deleteTestReservation(id: string) {
    return supabaseAdminInternal.from('reservations').delete().eq('id', id);
}

/**
 * BLACKOUT DATES
 */
export async function createTestBlackout(overrides: Partial<{
    start_date: string;
    end_date: string;
    campsite_id: string | null;
    reason: string;
    organization_id: string;
}> = {}) {
    const today = new Date();
    const data = {
        start_date: format(addDays(today, 10), 'yyyy-MM-dd'),
        end_date: format(addDays(today, 12), 'yyyy-MM-dd'),
        reason: 'Factory Blackout',
        organization_id: DEFAULT_ORG_ID,
        ...overrides
    };

    assertOrg(data);

    const { data: blackout, error } = await supabaseAdminInternal
        .from('blackout_dates')
        .insert(data)
        .select()
        .single();

    if (error) throw new Error(`Factory failed to create blackout: ${error.message} \nPayload: ${JSON.stringify(data, null, 2)}`);
    if (!blackout) throw new Error('Factory failed to create blackout: No data returned from insert');
    return blackout;
}

export async function deleteTestBlackout(id: string) {
    return supabaseAdminInternal.from('blackout_dates').delete().eq('id', id);
}

/**
 * Helper for tests that need to query data (e.g. check status change)
 * Only exposes select() to remain "hardened" against direct inserts.
 */
export function dbQuery(table: 'campsites' | 'reservations' | 'blackout_dates') {
    return supabaseAdminInternal.from(table).select('*');
}

/**
 * Helper for direct updates if factories don't cover it (e.g. updating status)
 */
export function dbUpdate(table: 'campsites' | 'reservations' | 'blackout_dates') {
    return supabaseAdminInternal.from(table).update;
}

/**
 * Cleanup helper - executes async function with automatic cleanup
 *
 * Reduces boilerplate for try/finally cleanup patterns.
 * If both the callback and cleanup fail, logs cleanup error and throws original error.
 *
 * @example
 * await withCleanup(
 *   createDedicatedCampsite({ codePrefix: 'LIFECYCLE' }),
 *   async ({ id, code }) => {
 *     const option = page.locator('[data-testid="campsite-option"]')
 *       .filter({ hasText: code });
 *     await option.click();
 *   }
 * );
 */
export async function withCleanup<T extends { cleanup: () => Promise<any> }>(
    resource: Promise<T>,
    fn: (resource: Omit<T, 'cleanup'>) => Promise<void>
): Promise<void> {
    const res = await resource;
    let testError: Error | undefined;

    try {
        await fn(res as Omit<T, 'cleanup'>);
    } catch (err) {
        testError = err as Error;
    } finally {
        try {
            await res.cleanup();
        } catch (cleanupErr) {
            console.error('[withCleanup] Cleanup failed:', cleanupErr);

            // If test also failed, throw test error (more important)
            // If only cleanup failed, throw cleanup error
            if (testError) {
                console.error('[withCleanup] Test also failed (throwing test error):', testError);
                throw testError;
            }
            throw cleanupErr;
        }

        // If test failed but cleanup succeeded, throw test error
        if (testError) {
            throw testError;
        }
    }
}
