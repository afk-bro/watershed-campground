import { supabaseAdmin } from "@/lib/supabase-admin";
import { type Json } from "@/lib/database.types";
import { logger } from "@/lib/logger";

export type AuditAction =
    | 'RESERVATION_UPDATE'
    | 'RESERVATION_ARCHIVE'
    | 'RESERVATION_RESTORE'
    | 'RESERVATION_ASSIGN'
    | 'RESERVATION_BULK_UPDATE'
    | 'BLACKOUT_CREATE'
    | 'BLACKOUT_UPDATE'
    | 'BLACKOUT_DELETE'
    | 'CAMPSITE_CREATE'
    | 'CAMPSITE_UPDATE'
    | 'CAMPSITE_ACTIVATE'
    | 'CAMPSITE_DEACTIVATE';

interface LogAuditParams {
    action: AuditAction;
    reservationId?: string; // Optional because some actions (like campsite update) are not reservation-specific
    oldData?: Json;
    newData?: Json;
    changedBy: string; // User ID
    organizationId: string; // Required for multi-tenancy
}

/**
 * Logs an administrative action to the audit_logs table.
 *
 * **Failure Behavior**: Best-effort logging. If the audit log write fails,
 * the error is logged to the console but the primary operation is NOT blocked.
 * This ensures that critical user-facing operations (e.g., reservation updates)
 * can proceed even if audit logging temporarily fails.
 */
export async function logAudit({
    action,
    reservationId,
    oldData,
    newData,
    changedBy,
    organizationId
}: LogAuditParams) {
    try {
        const { error } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                action,
                reservation_id: reservationId || null, // Nullable for non-reservation actions
                old_data: oldData,
                new_data: newData,
                changed_by: changedBy,
                organization_id: organizationId
            });

        if (error) {
            logger.error('Failed to write audit log:', error);
        }
    } catch (err) {
        logger.error('Audit logging error:', err);
    }
}

/**
 * Action-specific audit logging helpers
 */

interface ReservationUpdateAuditParams {
    reservationId: string;
    oldData: Json;
    newData: Json;
    userId: string;
    organizationId: string;
}

/**
 * Log a reservation update action
 */
export async function logReservationUpdate({
    reservationId,
    oldData,
    newData,
    userId,
    organizationId
}: ReservationUpdateAuditParams) {
    return logAudit({
        action: 'RESERVATION_UPDATE',
        reservationId,
        oldData,
        newData,
        changedBy: userId,
        organizationId
    });
}

interface BulkReservationAuditParams {
    action: 'RESERVATION_BULK_UPDATE' | 'RESERVATION_ARCHIVE' | 'RESERVATION_RESTORE';
    reservationIds: string[];
    changes: Record<string, unknown>;
    userId: string;
    organizationId: string;
}

/**
 * Log a bulk reservation operation
 */
export async function logBulkReservationOperation({
    action,
    reservationIds,
    changes,
    userId,
    organizationId
}: BulkReservationAuditParams) {
    return logAudit({
        action,
        newData: { reservationIds, ...changes } as Json,
        changedBy: userId,
        organizationId
    });
}

interface CampsiteAuditParams {
    action: 'CAMPSITE_CREATE' | 'CAMPSITE_UPDATE' | 'CAMPSITE_DEACTIVATE';
    oldData?: Json;
    newData: Json;
    userId: string;
    organizationId: string;
}

/**
 * Log a campsite change action
 */
export async function logCampsiteChange({
    action,
    oldData,
    newData,
    userId,
    organizationId
}: CampsiteAuditParams) {
    return logAudit({
        action,
        oldData,
        newData,
        changedBy: userId,
        organizationId
    });
}

interface BlackoutDateAuditParams {
    action: 'BLACKOUT_CREATE' | 'BLACKOUT_UPDATE' | 'BLACKOUT_DELETE';
    oldData?: Json;
    newData?: Json;
    userId: string;
    organizationId: string;
}

/**
 * Log a blackout date change action
 */
export async function logBlackoutDateChange({
    action,
    oldData,
    newData,
    userId,
    organizationId
}: BlackoutDateAuditParams) {
    return logAudit({
        action,
        oldData,
        newData,
        changedBy: userId,
        organizationId
    });
}
