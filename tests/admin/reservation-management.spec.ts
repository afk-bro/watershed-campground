import { test, expect } from '@playwright/test';

import { createTestReservation, deleteTestReservation, createTestCampsite, deleteTestCampsite, DEFAULT_ORG_ID, supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

/**
 * Admin Happy Path: Reservation Management
 * Tests the critical admin workflows: assign campsite, check-in, and cancel reservations.
 * Verifies both UI state and database state match throughout the lifecycle.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Admin Reservation Management - Happy Path', () => {
    let testReservationId: string;
    let testReservationEmail: string;
    let testCampsiteId: string;
    let testCampsiteCode: string;

    // Create a test reservation and campsite before tests
    test.beforeAll(async ({ browser }) => {
        // ==========================================
        // 1. Create a dedicated test reservation
        // ==========================================
        const tomorrow = addDays(new Date(), 3);
        const checkOut = addDays(tomorrow, 2);

        const reservation = await createTestReservation({
            first_name: 'E2E',
            last_name: 'TestUser',
            email: `e2e.admin.test.${Math.random().toString(36).slice(2, 6)}@example.com`, // Unique email
            phone: '555-0199',
            address1: '123 Test St',
            city: 'Test City',
            postal_code: '12345',
            check_in: format(tomorrow, 'yyyy-MM-dd'),
            check_out: format(checkOut, 'yyyy-MM-dd'),
            adults: 2,
            children: 0,
            rv_length: '25',
            camping_unit: 'RV / Trailer',
            contact_method: 'Email',
            status: 'pending',
            total_amount: 200,
            amount_paid: 0,
            balance_due: 200,
            organization_id: DEFAULT_ORG_ID,
            campsite_id: null // Ensure it starts unassigned
        });
        testReservationId = reservation.id;
        testReservationEmail = reservation.email;

        // ==========================================
        // 2. Create a dedicated test campsite
        // ==========================================
        // This ensures we always have a free site for the test
        const campsite = await createTestCampsite({
            name: 'Assignment Test Site',
            code: `ASG${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            is_active: true,
            organization_id: DEFAULT_ORG_ID
        });
        testCampsiteId = campsite.id;
        testCampsiteCode = campsite.code;

        console.log('Created test reservation:', testReservationId, '(', testReservationEmail, ')');
        console.log('Created test campsite:', testCampsiteId, '(', testCampsiteCode, ')');

        // ==========================================
        // 🔍 DIAGNOSTIC 1: Verify DB row correctness
        // ==========================================
        const { data: dbRow } = await supabaseAdmin
            .from('reservations')
            .select('id, organization_id, archived_at, status')
            .eq('id', testReservationId)
            .single();

        console.log('📊 DB row verification:', {
            id: dbRow?.id,
            organization_id: dbRow?.organization_id,
            archived_at: dbRow?.archived_at,
            status: dbRow?.status,
            expected_org: DEFAULT_ORG_ID
        });

        if (dbRow?.organization_id !== DEFAULT_ORG_ID) {
            throw new Error(`❌ DB org mismatch! Expected: ${DEFAULT_ORG_ID}, Got: ${dbRow?.organization_id}`);
        }

        if (dbRow?.archived_at !== null) {
            throw new Error(`❌ Reservation is archived! archived_at: ${dbRow?.archived_at}`);
        }

        // ==========================================
        // 🔍 DIAGNOSTIC 2: Verify API returns reservation
        // ==========================================
        // Create an authenticated request context using the same auth as admin tests
        const context = await browser.newContext({
            storageState: 'tests/.auth/admin.json',
        });
        const page = await context.newPage();

        // Use the new server-side ID filter to get exactly this reservation
        const apiRes = await page.request.get(`http://localhost:3000/api/admin/reservations?id=${testReservationId}`);
        expect(apiRes.ok()).toBeTruthy();
        const apiJson = await apiRes.json();

        const foundInAPI = apiJson.data.some((item: { id: string }) => item.id === testReservationId);

        console.log('🌐 API verification (filtered by ID):', {
            meta_org: apiJson.meta?.organizationId,
            filtered: apiJson.meta?.filtered,
            filter_id: apiJson.meta?.filter?.id,
            total_items: apiJson.data.length,
            reservation_count: apiJson.meta?.reservations,
            found_test_reservation: foundInAPI
        });

        if (!foundInAPI) {
            console.error('❌ API filter failed: Reservation exists in DB but NOT returned by API even with ID filter');
            console.log('Returned items:', apiJson.data.map((x: { id: string; organization_id: string }) => ({ id: x.id, org: x.organization_id })));
            throw new Error(
                `API did not return test reservation even with id=${testReservationId} filter!\n` +
                `Expected org: ${DEFAULT_ORG_ID}\n` +
                `API meta org: ${apiJson.meta?.organizationId}\n` +
                `This indicates an org scoping or filter implementation issue.`
            );
        }

        console.log('✅ Reservation verified: DB row correct AND API returns it (with ID filter)');
        await context.close();
    });

    // Clean up test reservation and campsite after tests
    test.afterAll(async () => {
        await deleteTestReservation(testReservationId);
        await deleteTestCampsite(testCampsiteId);
        console.log('Cleaned up test data:', { testReservationId, testCampsiteId });
    });

    test('should assign campsite to pending reservation', async ({ browser }) => {
        // ==========================================
        // NOTE: This test uses API verification due to virtualization limits
        // ==========================================
        // The admin UI virtualizes the table and only renders ~1000 rows.
        // With 534+ seed reservations, new test reservations may not be in the rendered set.
        // Server-side search (?q=) is implemented but not yet wired to the UI search input.
        // For now, this test verifies the business logic via API calls.

        const context = await browser.newContext({ storageState: 'tests/.auth/admin.json' });
        const apiPage = await context.newPage();

        // ==========================================
        // STEP 1: Verify initial state
        // ==========================================
        const apiRes = await apiPage.request.get(`http://localhost:3000/api/admin/reservations?id=${testReservationId}`);
        expect(apiRes.ok()).toBeTruthy();
        const apiJson = await apiRes.json();
        const reservation = apiJson.data.find((item: { id: string }) => item.id === testReservationId);

        console.log('Initial API state:', { status: reservation?.status, campsite_id: reservation?.campsite_id });
        expect(reservation?.status).toBe('pending');
        expect(reservation?.campsite_id).toBeNull();

        // ==========================================
        // STEP 2: Assign dedicated campsite via API
        // ==========================================
        // We use our dedicated test campsite which is guaranteed to be available
        const assignRes = await apiPage.request.post(
            `http://localhost:3000/api/admin/reservations/${testReservationId}/assign`,
            { data: { campsiteId: testCampsiteId } }
        );

        if (!assignRes.ok()) {
            const errorBody = await assignRes.json();
            console.log('Assignment failed:', { status: assignRes.status(), error: errorBody });
            throw new Error(`Assignment failed (${assignRes.status()}): ${JSON.stringify(errorBody)}`);
        }

        console.log('Assigned dedicated campsite:', testCampsiteCode);

        // ==========================================
        // STEP 3: Verify state change via API (Hardened with poll)
        // ==========================================
        await expect.poll(async () => {
            const res = await apiPage.request.get(`http://localhost:3000/api/admin/reservations?id=${testReservationId}`);
            const json = await res.json();
            const resData = json.data.find((item: { id: string; status?: string }) => item.id === testReservationId);
            return resData?.status;
        }, {
            message: `Reservation ${testReservationId} should be confirmed after assignment`,
            timeout: 5000,
        }).toBe('confirmed');

        // Check campsite assignment in final poll result if needed, or just refresh
        const finalApiRes = await apiPage.request.get(`http://localhost:3000/api/admin/reservations?id=${testReservationId}`);
        const finalJson = await finalApiRes.json();
        const finalReservation = finalJson.data.find((item: { id: string }) => item.id === testReservationId);
        expect(finalReservation?.campsite_id).toBe(testCampsiteId);

        // ==========================================
        // STEP 4: Verify Database State
        // ==========================================
        const { data: dbReservation } = await supabaseAdmin
            .from('reservations')
            .select('status, campsite_id')
            .eq('id', testReservationId)
            .single();

        expect(dbReservation?.status).toBe('confirmed');
        expect(dbReservation?.campsite_id).toBe(testCampsiteId);

        await context.close();
    });

    test('should check-in a confirmed reservation', async ({ page }) => {
        // First ensure reservation has a campsite assigned
        const { data: existingReservation } = await supabaseAdmin
            .from('reservations')
            .select('status, campsite_id')
            .eq('id', testReservationId)
            .single();

        // If not assigned, assign a campsite first
        if (!existingReservation?.campsite_id) {
            const { data: campsites } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('is_active', true)
                .limit(1);

            if (campsites && campsites.length > 0) {
                await supabaseAdmin
                    .from('reservations')
                    .update({
                        campsite_id: campsites[0].id,
                        status: 'confirmed'
                    })
                    .eq('id', testReservationId);
            }
        }

        // ==========================================
        // STEP 1: Navigate to Admin Dashboard
        // ==========================================
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        // ==========================================
        // STEP 2: Find Test Reservation
        // ==========================================
        // (Default filter is 'all', so it won't be filtered out after check-in)


        // Search for the specific test reservation ID
        await page.getByPlaceholder('Search name, email, phone, ref...').fill(testReservationEmail);
        // Wait for search debounce and API response
        await page.waitForResponse(r => r.url().includes('/api/admin/reservations') && r.status() === 200, { timeout: 5000 });

        // Wait for table to filter
        // await expect(page.locator('tbody tr')).toHaveCount(1, { timeout: 10000 });

        // Find reservation by stable ID
        const reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 3: Check In Reservation
        // ==========================================
        await reservationRow.getByRole('button', { name: 'Check In' }).click();

        // Wait for refetch after status update
        await page.waitForResponse(r => r.url().includes('/api/admin/reservations') && r.status() === 200);

        // ==========================================
        // STEP 4: Verify UI Update
        // ==========================================
        // Re-query row and check status (Hardened with poll)
        const updatedRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect.poll(async () => {
            return await updatedRow.getByTestId('reservation-status').textContent();
        }, {
            message: 'UI status should update to checked-in',
            timeout: 5000,
        }).toMatch(/checked.in/i);

        // ==========================================
        // STEP 5: Verify Database State
        // ==========================================
        const { data: dbReservation } = await supabaseAdmin
            .from('reservations')
            .select('status')
            .eq('id', testReservationId)
            .single();

        expect(dbReservation?.status).toBe('checked_in');
    });

    test('should cancel a reservation', async ({ page }) => {
        // Ensure reservation is in a cancellable state
        await supabaseAdmin
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', testReservationId);

        // ==========================================
        // STEP 1: Navigate to Admin Dashboard
        // ==========================================
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        // Search for the specific test reservation to ensure it's visible
        await page.getByPlaceholder('Search name, email, phone, ref...').fill(testReservationEmail);
        // Wait for search debounce and API response
        await page.waitForResponse(r => r.url().includes('/api/admin/reservations') && r.status() === 200, { timeout: 5000 });

        // ==========================================
        // STEP 2: Find Test Reservation
        // ==========================================
        // Find reservation by stable ID
        const reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 3: Cancel Reservation
        // ==========================================
        await reservationRow.getByRole('button', { name: 'Cancel' }).click();

        // Confirm cancellation dialog
        const confirmButton = page.getByRole('button', { name: "Cancel Reservation" });
        await expect(confirmButton).toBeVisible({ timeout: 2000 });

        await Promise.all([
            page.waitForResponse(r => r.url().includes('/api/admin/reservations') && r.status() === 200),
            confirmButton.click()
        ]);

        // ==========================================
        // STEP 4: Verify UI Update
        // ==========================================
        const updatedRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect(updatedRow.getByTestId('reservation-status')).toHaveText(/cancelled/i);

        // ==========================================
        // STEP 5: Verify Database State
        // ==========================================
        const { data: dbReservation } = await supabaseAdmin
            .from('reservations')
            .select('status')
            .eq('id', testReservationId)
            .single();

        expect(dbReservation?.status).toBe('cancelled');
    });

    test('should complete full lifecycle: assign → check-in → check-out', async ({ page }) => {
        // Reset reservation to pending state
        await supabaseAdmin
            .from('reservations')
            .update({
                status: 'pending',
                campsite_id: null
            })
            .eq('id', testReservationId);

        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        // Search for the specific test reservation
        await page.getByPlaceholder('Search name, email, phone, ref...').fill(testReservationEmail);
        // Wait for search debounce and API response
        await page.waitForResponse(r => r.url().includes('/api/admin/reservations') && r.status() === 200, { timeout: 5000 });

        // Find reservation by stable ID
        let reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect(reservationRow).toBeVisible();

        // Assign campsite
        await reservationRow.getByRole('button', { name: /Unassigned|Assign/i }).click();
        await page.waitForSelector('h3:has-text("Assign Campsite")');

        const campsiteOptions = page.locator('[data-testid="campsite-option"]');
        await expect(campsiteOptions.first()).toBeVisible({ timeout: 5000 });

        // Select our dedicated test campsite (not .first() to avoid 409 conflicts)
        const dedicatedCampsiteOption = campsiteOptions.filter({ hasText: testCampsiteCode });
        await expect(dedicatedCampsiteOption).toBeVisible({ timeout: 5000 });

        // Wait for assignment mutation response
        await Promise.all([
            page.waitForResponse(r =>
                r.url().includes(`/api/admin/reservations/${testReservationId}/assign`) &&
                r.request().method() === 'POST' &&
                r.status() === 200
            ),
            dedicatedCampsiteOption.click(),
        ]);

        // Re-query and verify (Hardened with poll)
        reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect.poll(async () => {
            return await reservationRow.getByTestId('reservation-status').textContent();
        }, {
            message: 'UI status should update to confirmed after assignment',
            timeout: 5000,
        }).toMatch(/confirmed/i);

        // ==========================================
        // 2. CHECK IN
        // ==========================================
        reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);

        // Wait for check-in mutation response
        await Promise.all([
            page.waitForResponse(r =>
                r.url().includes(`/api/admin/reservations/${testReservationId}`) &&
                r.request().method() === 'PATCH' &&
                r.status() === 200
            ),
            reservationRow.getByRole('button', { name: 'Check In' }).click(),
        ]);

        reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect.poll(async () => {
            return await reservationRow.getByTestId('reservation-status').textContent();
        }, {
            message: 'UI status should update to checked-in',
            timeout: 5000,
        }).toMatch(/checked.in/i);

        // ==========================================
        // 3. CHECK OUT
        // ==========================================
        // Wait for mutation response (not list refetch)
        await Promise.all([
            page.waitForResponse(r =>
                r.url().includes(`/api/admin/reservations/${testReservationId}`) &&
                r.request().method() === 'PATCH' &&
                r.status() === 200
            ),
            reservationRow.getByRole('button', { name: 'Check Out' }).click(),
        ]);

        reservationRow = page.getByTestId(`reservation-row-${testReservationId}`);
        await expect.poll(async () => {
            return await reservationRow.getByTestId('reservation-status').textContent();
        }, {
            message: 'UI status should update to checked-out',
            timeout: 5000,
        }).toMatch(/checked.out/i);

        // ==========================================
        // VERIFY FINAL DATABASE STATE
        // ==========================================
        const { data: finalReservation } = await supabaseAdmin
            .from('reservations')
            .select('status, campsite_id')
            .eq('id', testReservationId)
            .single();

        expect(finalReservation?.status).toBe('checked_out');
        expect(finalReservation?.campsite_id).not.toBeNull();
    });
});
