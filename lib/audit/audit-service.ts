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
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Audit logging error:', err);
    }
}
