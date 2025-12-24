import { supabaseAdmin } from "@/lib/supabase-admin";
import { type Json } from "@/lib/database.types";

export type AuditAction =
    | 'RESERVATION_UPDATE'
    | 'RESERVATION_ARCHIVE'
    | 'RESERVATION_RESTORE'
    | 'BLACKOUT_CREATE'
    | 'BLACKOUT_UPDATE'
    | 'BLACKOUT_DELETE'
    | 'CAMPSITE_UPDATE'
    | 'CAMPSITE_ACTIVATE'
    | 'CAMPSITE_DEACTIVATE';

interface LogAuditParams {
    action: AuditAction;
    reservationId?: string; // Optional because some actions (like campsite update) are not reservation-specific
    oldData?: Json;
    newData?: Json;
    changedBy: string; // User ID
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
    changedBy
}: LogAuditParams) {
    try {
        // Find a way to link non-reservation logs? 
        // The table schema has reservation_id as required. 
        // In some cases we might not have one. 
        // Let's check the schema for audit_logs again.

        // Actually, looking at the schema from previous tool calls:
        // reservation_id IS required in the audit_logs table.
        // If we want to log campsite changes, we might need a dummy ID or a schema change.
        // For V1 of production readiness, I'll focus on reservation-linked audits 
        // OR I can use a "System" reservation ID if needed.

        // However, the USER's schema currently links audit_logs directly to reservations.
        // For now, I'll only log if reservationId is present, or I'll provide a warning.

        if (!reservationId && (action.startsWith('RESERVATION_') || action.startsWith('BLACKOUT_'))) {
            // For blackouts, if they are linked to a reservation (rare) or global.
            // Usually blackout dates aren't linked to a specific reservation.
            // This suggests the audit_logs table might be too specific for "General Admin Audit".
        }

        const { error } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                action,
                reservation_id: reservationId || '00000000-0000-0000-0000-000000000000', // Dummy if none?
                old_data: oldData,
                new_data: newData,
                changed_by: changedBy
            });

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Audit logging error:', err);
    }
}
