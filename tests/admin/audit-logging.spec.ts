/**
 * E2E Test: Admin Audit Logging Guardrail
 *
 * Verifies that critical admin mutations are automatically logged to the
 * admin_audit_logs table with proper context (actor, organization, metadata).
 *
 * Prevents regression of audit logging implementation.
 *
 * Tests the following mutations:
 * 1. Reservation assignment (POST /api/admin/reservations/[id]/assign)
 * 2. Blackout date creation (POST /api/admin/blackout-dates)
 * 3. Blackout date update (PATCH /api/admin/blackout-dates/[id])
 * 4. Blackout date deletion (DELETE /api/admin/blackout-dates/[id])
 * 5. Reservation update (PATCH /api/admin/reservations/[id])
 */

import { test, expect } from '@playwright/test';
import {
    createTestReservation,
    deleteTestReservation,
    createTestCampsite,
    deleteTestCampsite,
    DEFAULT_ORG_ID,
    supabaseAdmin
} from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

test.describe('Admin Audit Logging', () => {
    let testReservationId: string;
    let testCampsiteId: string;
    let testBlackoutId: string;

    test.beforeAll(async () => {
        // Create test reservation (pending, unassigned)
        const tomorrow = addDays(new Date(), 1);
        const checkOut = addDays(tomorrow, 2);

        const reservation = await createTestReservation({
            first_name: 'Audit',
            last_name: 'TestUser',
            email: `audit.test.${Math.random().toString(36).slice(2, 6)}@example.com`,
            check_in: format(tomorrow, 'yyyy-MM-dd'),
            check_out: format(checkOut, 'yyyy-MM-dd'),
            status: 'pending',
            organization_id: DEFAULT_ORG_ID,
            campsite_id: null,
        });
        testReservationId = reservation.id;

        // Create test campsite
        const campsite = await createTestCampsite({
            name: 'Audit Test Site',
            code: `AUD${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
            is_active: true,
            organization_id: DEFAULT_ORG_ID,
        });
        testCampsiteId = campsite.id;

        console.log('✅ Test data created:', {
            reservationId: testReservationId,
            campsiteId: testCampsiteId,
        });
    });

    test.afterAll(async () => {
        // Clean up test data
        if (testReservationId) await deleteTestReservation(testReservationId);
        if (testCampsiteId) await deleteTestCampsite(testCampsiteId);
        if (testBlackoutId) {
            await supabaseAdmin
                .from('blackout_dates')
                .delete()
                .eq('id', testBlackoutId)
                .eq('organization_id', DEFAULT_ORG_ID);
        }
    });

    test('should log reservation assignment to admin_audit_logs', async ({ request }) => {
        // ==========================================
        // 1. Perform reservation assignment mutation
        // ==========================================
        const assignResponse = await request.post(
            `/api/admin/reservations/${testReservationId}/assign`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    campsiteId: testCampsiteId,
                },
            }
        );

        expect(assignResponse.ok()).toBeTruthy();
        const assignResult = await assignResponse.json();
        expect(assignResult.success).toBe(true);

        // ==========================================
        // 2. Query admin_audit_logs for this action
        // ==========================================
        // Wait a bit for async audit logging to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: auditLogs, error } = await supabaseAdmin
            .from('admin_audit_logs')
            .select('*')
            .eq('organization_id', DEFAULT_ORG_ID)
            .eq('action', 'reservation.assign')
            .eq('resource_type', 'reservation')
            .eq('resource_id', testReservationId)
            .order('created_at', { ascending: false })
            .limit(1);

        expect(error).toBeNull();
        expect(auditLogs).toBeTruthy();
        expect(auditLogs!.length).toBeGreaterThan(0);

        // ==========================================
        // 3. Validate audit log structure
        // ==========================================
        const auditLog = auditLogs![0];

        expect(auditLog.action).toBe('reservation.assign');
        expect(auditLog.resource_type).toBe('reservation');
        expect(auditLog.resource_id).toBe(testReservationId);
        expect(auditLog.organization_id).toBe(DEFAULT_ORG_ID);
        expect(auditLog.actor_user_id).toBeTruthy();
        expect(auditLog.actor_email).toBeTruthy();
        expect(auditLog.status).toBe('success');

        // Validate metadata contains assignment details
        expect(auditLog.metadata).toBeTruthy();
        expect(auditLog.metadata.to_campsite_id).toBe(testCampsiteId);
        expect(auditLog.metadata.from_campsite_id).toBeNull();

        console.log('✅ Reservation assignment audit log verified:', {
            action: auditLog.action,
            resourceId: auditLog.resource_id,
            metadata: auditLog.metadata,
        });
    });

    test('should log blackout date creation to admin_audit_logs', async ({ request }) => {
        // ==========================================
        // 1. Perform blackout creation mutation
        // ==========================================
        const tomorrow = addDays(new Date(), 10);
        const endDate = addDays(tomorrow, 3);

        const createResponse = await request.post('/api/admin/blackout-dates', {
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                start_date: format(tomorrow, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId,
                reason: 'E2E Audit Test',
            },
        });

        expect(createResponse.ok()).toBeTruthy();
        const createResult = await createResponse.json();
        expect(createResult.data).toBeTruthy();
        testBlackoutId = createResult.data.id;

        // ==========================================
        // 2. Query admin_audit_logs for this action
        // ==========================================
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: auditLogs, error } = await supabaseAdmin
            .from('admin_audit_logs')
            .select('*')
            .eq('organization_id', DEFAULT_ORG_ID)
            .eq('action', 'blackout.create')
            .eq('resource_type', 'blackout')
            .eq('resource_id', testBlackoutId)
            .order('created_at', { ascending: false })
            .limit(1);

        expect(error).toBeNull();
        expect(auditLogs).toBeTruthy();
        expect(auditLogs!.length).toBeGreaterThan(0);

        // ==========================================
        // 3. Validate audit log structure
        // ==========================================
        const auditLog = auditLogs![0];

        expect(auditLog.action).toBe('blackout.create');
        expect(auditLog.resource_type).toBe('blackout');
        expect(auditLog.resource_id).toBe(testBlackoutId);
        expect(auditLog.status).toBe('success');

        // Validate metadata
        expect(auditLog.metadata.campsite_id).toBe(testCampsiteId);
        expect(auditLog.metadata.start_date).toBe(format(tomorrow, 'yyyy-MM-dd'));
        expect(auditLog.metadata.end_date).toBe(format(endDate, 'yyyy-MM-dd'));

        console.log('✅ Blackout creation audit log verified:', {
            action: auditLog.action,
            resourceId: auditLog.resource_id,
        });
    });

    test('should log blackout date update to admin_audit_logs', async ({ request }) => {
        // ==========================================
        // 1. Perform blackout update mutation
        // ==========================================
        const newEndDate = addDays(new Date(), 15);

        const updateResponse = await request.patch(
            `/api/admin/blackout-dates/${testBlackoutId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    end_date: format(newEndDate, 'yyyy-MM-dd'),
                    reason: 'Updated via E2E test',
                },
            }
        );

        expect(updateResponse.ok()).toBeTruthy();

        // ==========================================
        // 2. Query admin_audit_logs for this action
        // ==========================================
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: auditLogs, error } = await supabaseAdmin
            .from('admin_audit_logs')
            .select('*')
            .eq('organization_id', DEFAULT_ORG_ID)
            .eq('action', 'blackout.update')
            .eq('resource_type', 'blackout')
            .eq('resource_id', testBlackoutId)
            .order('created_at', { ascending: false })
            .limit(1);

        expect(error).toBeNull();
        expect(auditLogs).toBeTruthy();
        expect(auditLogs!.length).toBeGreaterThan(0);

        // ==========================================
        // 3. Validate audit log structure
        // ==========================================
        const auditLog = auditLogs![0];

        expect(auditLog.action).toBe('blackout.update');
        expect(auditLog.resource_type).toBe('blackout');
        expect(auditLog.status).toBe('success');

        // Validate metadata has before/after
        expect(auditLog.metadata.before).toBeTruthy();
        expect(auditLog.metadata.after).toBeTruthy();
        expect(auditLog.metadata.after.end_date).toBe(format(newEndDate, 'yyyy-MM-dd'));

        console.log('✅ Blackout update audit log verified');
    });

    test('should log blackout date deletion to admin_audit_logs', async ({ request }) => {
        // ==========================================
        // 1. Perform blackout deletion mutation
        // ==========================================
        const deleteResponse = await request.delete(
            `/api/admin/blackout-dates/${testBlackoutId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        expect(deleteResponse.ok()).toBeTruthy();

        // ==========================================
        // 2. Query admin_audit_logs for this action
        // ==========================================
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: auditLogs, error } = await supabaseAdmin
            .from('admin_audit_logs')
            .select('*')
            .eq('organization_id', DEFAULT_ORG_ID)
            .eq('action', 'blackout.delete')
            .eq('resource_type', 'blackout')
            .eq('resource_id', testBlackoutId)
            .order('created_at', { ascending: false })
            .limit(1);

        expect(error).toBeNull();
        expect(auditLogs).toBeTruthy();
        expect(auditLogs!.length).toBeGreaterThan(0);

        // ==========================================
        // 3. Validate audit log structure
        // ==========================================
        const auditLog = auditLogs![0];

        expect(auditLog.action).toBe('blackout.delete');
        expect(auditLog.resource_type).toBe('blackout');
        expect(auditLog.status).toBe('success');

        // Validate metadata contains deleted blackout details
        expect(auditLog.metadata.campsite_id).toBe(testCampsiteId);
        expect(auditLog.metadata.start_date).toBeTruthy();
        expect(auditLog.metadata.end_date).toBeTruthy();

        console.log('✅ Blackout deletion audit log verified');

        // Clear testBlackoutId since it's now deleted
        testBlackoutId = '';
    });

    test('should log reservation update to admin_audit_logs', async ({ request }) => {
        // ==========================================
        // 1. Perform reservation update mutation
        // ==========================================
        const updateResponse = await request.patch(
            `/api/admin/reservations/${testReservationId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    status: 'confirmed',
                    notes: 'Updated via E2E audit test',
                },
            }
        );

        expect(updateResponse.ok()).toBeTruthy();
        const updateResult = await updateResponse.json();
        expect(updateResult.reservation).toBeTruthy();
        expect(updateResult.reservation.status).toBe('confirmed');

        // ==========================================
        // 2. Query admin_audit_logs for this action
        // ==========================================
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: auditLogs, error } = await supabaseAdmin
            .from('admin_audit_logs')
            .select('*')
            .eq('organization_id', DEFAULT_ORG_ID)
            .eq('action', 'reservation.update')
            .eq('resource_type', 'reservation')
            .eq('resource_id', testReservationId)
            .order('created_at', { ascending: false })
            .limit(1);

        expect(error).toBeNull();
        expect(auditLogs).toBeTruthy();
        expect(auditLogs!.length).toBeGreaterThan(0);

        // ==========================================
        // 3. Validate audit log structure
        // ==========================================
        const auditLog = auditLogs![0];

        expect(auditLog.action).toBe('reservation.update');
        expect(auditLog.resource_type).toBe('reservation');
        expect(auditLog.resource_id).toBe(testReservationId);
        expect(auditLog.status).toBe('success');

        // Validate metadata contains update details
        expect(auditLog.metadata).toBeTruthy();
        expect(auditLog.metadata.status).toBe('confirmed');
        expect(auditLog.metadata.campsite_id).toBe(testCampsiteId);

        console.log('✅ Reservation update audit log verified:', {
            action: auditLog.action,
            status: auditLog.metadata.status,
        });
    });
});
