/**
 * Unit tests for audit service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    logAudit,
    logReservationUpdate,
    logBulkReservationOperation,
    logCampsiteChange,
    logBlackoutDateChange
} from '@/lib/audit/audit-service';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn()
    }
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn()
    }
}));

describe('Audit Service', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-456';
    const mockReservationId = 'res-789';

    let mockInsert: ReturnType<typeof vi.fn>;
    let mockFrom: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock chain
        mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom = vi.fn().mockReturnValue({
            insert: mockInsert
        });

        (supabaseAdmin.from as ReturnType<typeof vi.fn>) = mockFrom;
    });

    describe('logAudit', () => {
        it('should successfully log an audit entry', async () => {
            const oldData = { status: 'pending' };
            const newData = { status: 'confirmed' };

            await logAudit({
                action: 'RESERVATION_UPDATE',
                reservationId: mockReservationId,
                oldData,
                newData,
                changedBy: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockFrom).toHaveBeenCalledWith('audit_logs');
            expect(mockInsert).toHaveBeenCalledWith({
                action: 'RESERVATION_UPDATE',
                reservation_id: mockReservationId,
                old_data: oldData,
                new_data: newData,
                changed_by: mockUserId,
                organization_id: mockOrgId
            });
        });

        it('should handle null reservationId for non-reservation actions', async () => {
            await logAudit({
                action: 'CAMPSITE_UPDATE',
                newData: { name: 'Site A' },
                changedBy: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    reservation_id: null
                })
            );
        });

        it('should log error but not throw when audit log insert fails', async () => {
            const insertError = new Error('Database error');
            mockInsert.mockResolvedValue({ error: insertError });

            await expect(
                logAudit({
                    action: 'RESERVATION_UPDATE',
                    changedBy: mockUserId,
                    organizationId: mockOrgId
                })
            ).resolves.not.toThrow();

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to write audit log:',
                insertError
            );
        });

        it('should handle exceptions gracefully', async () => {
            const exception = new Error('Unexpected error');
            mockFrom.mockImplementation(() => {
                throw exception;
            });

            await expect(
                logAudit({
                    action: 'RESERVATION_UPDATE',
                    changedBy: mockUserId,
                    organizationId: mockOrgId
                })
            ).resolves.not.toThrow();

            expect(logger.error).toHaveBeenCalledWith(
                'Audit logging error:',
                exception
            );
        });
    });

    describe('logReservationUpdate', () => {
        it('should log a reservation update with correct action type', async () => {
            const oldData = { status: 'pending', campsite_id: null };
            const newData = { status: 'confirmed', campsite_id: 'site-1' };

            await logReservationUpdate({
                reservationId: mockReservationId,
                oldData,
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith({
                action: 'RESERVATION_UPDATE',
                reservation_id: mockReservationId,
                old_data: oldData,
                new_data: newData,
                changed_by: mockUserId,
                organization_id: mockOrgId
            });
        });

        it('should handle empty old data (new reservation)', async () => {
            const newData = { status: 'confirmed' };

            await logReservationUpdate({
                reservationId: mockReservationId,
                oldData: undefined as never,
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'RESERVATION_UPDATE',
                    old_data: undefined
                })
            );
        });
    });

    describe('logBulkReservationOperation', () => {
        it('should log bulk archive operation', async () => {
            const reservationIds = ['res-1', 'res-2', 'res-3'];

            await logBulkReservationOperation({
                action: 'RESERVATION_ARCHIVE',
                reservationIds,
                changes: { action: 'archive' },
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith({
                action: 'RESERVATION_ARCHIVE',
                reservation_id: null,
                old_data: undefined,
                new_data: { reservationIds, action: 'archive' },
                changed_by: mockUserId,
                organization_id: mockOrgId
            });
        });

        it('should log bulk status update operation', async () => {
            const reservationIds = ['res-1', 'res-2'];
            const changes = { status: 'confirmed' };

            await logBulkReservationOperation({
                action: 'RESERVATION_BULK_UPDATE',
                reservationIds,
                changes,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'RESERVATION_BULK_UPDATE',
                    new_data: { reservationIds, status: 'confirmed' }
                })
            );
        });

        it('should log bulk restore operation', async () => {
            const reservationIds = ['res-1'];

            await logBulkReservationOperation({
                action: 'RESERVATION_RESTORE',
                reservationIds,
                changes: { action: 'restore' },
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'RESERVATION_RESTORE'
                })
            );
        });
    });

    describe('logCampsiteChange', () => {
        it('should log campsite creation', async () => {
            const newData = { name: 'Site A', code: 'A1', type: 'RV' };

            await logCampsiteChange({
                action: 'CAMPSITE_CREATE',
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith({
                action: 'CAMPSITE_CREATE',
                reservation_id: null,
                old_data: undefined,
                new_data: newData,
                changed_by: mockUserId,
                organization_id: mockOrgId
            });
        });

        it('should log campsite update with old and new data', async () => {
            const oldData = { name: 'Site A', is_active: true };
            const newData = { name: 'Site A Updated', is_active: true };

            await logCampsiteChange({
                action: 'CAMPSITE_UPDATE',
                oldData,
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'CAMPSITE_UPDATE',
                    old_data: oldData,
                    new_data: newData
                })
            );
        });

        it('should log campsite deactivation', async () => {
            const oldData = { is_active: true };
            const newData = { is_active: false };

            await logCampsiteChange({
                action: 'CAMPSITE_DEACTIVATE',
                oldData,
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'CAMPSITE_DEACTIVATE'
                })
            );
        });
    });

    describe('logBlackoutDateChange', () => {
        it('should log blackout date creation', async () => {
            const newData = {
                start_date: '2025-07-01',
                end_date: '2025-07-07',
                reason: 'Maintenance'
            };

            await logBlackoutDateChange({
                action: 'BLACKOUT_CREATE',
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith({
                action: 'BLACKOUT_CREATE',
                reservation_id: null,
                old_data: undefined,
                new_data: newData,
                changed_by: mockUserId,
                organization_id: mockOrgId
            });
        });

        it('should log blackout date update', async () => {
            const oldData = {
                start_date: '2025-07-01',
                end_date: '2025-07-07'
            };
            const newData = {
                start_date: '2025-07-01',
                end_date: '2025-07-10'
            };

            await logBlackoutDateChange({
                action: 'BLACKOUT_UPDATE',
                oldData,
                newData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'BLACKOUT_UPDATE',
                    old_data: oldData,
                    new_data: newData
                })
            );
        });

        it('should log blackout date deletion', async () => {
            const oldData = {
                start_date: '2025-07-01',
                end_date: '2025-07-07',
                reason: 'Cancelled event'
            };

            await logBlackoutDateChange({
                action: 'BLACKOUT_DELETE',
                oldData,
                userId: mockUserId,
                organizationId: mockOrgId
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'BLACKOUT_DELETE',
                    old_data: oldData,
                    new_data: undefined
                })
            );
        });
    });
});
