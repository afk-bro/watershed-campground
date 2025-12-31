/**
 * Admin Audit Logging
 *
 * Dead-simple, fail-open audit logging for admin mutations.
 *
 * Usage:
 *   await auditLog(ctx, {
 *     action: 'reservation.assign',
 *     resourceType: 'reservation',
 *     resourceId: reservationId,
 *     metadata: { from_campsite_id, to_campsite_id }
 *   });
 *
 * Key principles:
 * - NEVER throws - fails silently to avoid breaking main operations
 * - Auto-extracts org + actor from withAdminAuth context
 * - Supports request_id correlation
 * - Stores flexible metadata as JSON
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Context from withAdminAuth middleware
 */
export interface AdminAuthContext {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
  organizationId: string;
  request: Request;
}

/**
 * Audit log entry data
 */
export interface AuditLogData {
  /** Action in format: "resource.verb" (e.g. "reservation.assign") */
  action: string;

  /** Resource type (e.g. "reservation", "blackout", "campsite") */
  resourceType: string;

  /** Resource ID (UUID or string) */
  resourceId: string;

  /** Optional request correlation ID */
  requestId?: string;

  /** Optional action-specific metadata */
  metadata?: Record<string, unknown>;

  /** Status (defaults to 'success') */
  status?: 'success' | 'failure';

  /** Error code if status=failure */
  errorCode?: string;

  /** Error message if status=failure */
  errorMessage?: string;
}

/**
 * Full audit log record (internal)
 */
interface AuditLogRecord {
  organization_id: string;
  actor_user_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'success' | 'failure';
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract client IP from request
 */
function getClientIp(request: Request): string | null {
  // Check common headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection info (not available in Edge runtime)
  return null;
}

/**
 * Extract user agent from request
 */
function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}

/**
 * Extract or generate request ID
 */
function getRequestId(request: Request, data: AuditLogData): string | null {
  // Prefer explicitly provided request ID
  if (data.requestId) {
    return data.requestId;
  }

  // Check for x-request-id header (set by middleware or proxy)
  const headerRequestId = request.headers.get('x-request-id');
  if (headerRequestId) {
    return headerRequestId;
  }

  // Don't generate - let database default or leave null
  return null;
}

// ============================================================================
// Main Audit Function
// ============================================================================

/**
 * Log an admin action to the audit trail.
 *
 * **IMPORTANT:** This function NEVER throws. It fails silently to avoid
 * breaking the main operation. All errors are logged but not propagated.
 *
 * @param ctx - Admin auth context from withAdminAuth
 * @param data - Audit log data
 *
 * @example
 * ```typescript
 * await auditLog(ctx, {
 *   action: 'reservation.assign',
 *   resourceType: 'reservation',
 *   resourceId: reservationId,
 *   metadata: {
 *     from_campsite_id: null,
 *     to_campsite_id: 'site-123',
 *     check_in: '2025-06-01',
 *     check_out: '2025-06-07'
 *   }
 * });
 * ```
 */
export async function auditLog(
  ctx: AdminAuthContext,
  data: AuditLogData
): Promise<void> {
  try {
    // Build audit log record
    const record: AuditLogRecord = {
      // Context (from withAdminAuth)
      organization_id: ctx.organizationId,
      actor_user_id: ctx.user.id,
      actor_email: ctx.user.email || 'unknown@example.com',
      actor_role: ctx.user.role || 'admin',

      // Action
      action: data.action,

      // Resource
      resource_type: data.resourceType,
      resource_id: data.resourceId,

      // Request
      request_id: getRequestId(ctx.request, data),
      ip_address: getClientIp(ctx.request),
      user_agent: getUserAgent(ctx.request),

      // Outcome
      status: data.status || 'success',
      error_code: data.errorCode || null,
      error_message: data.errorMessage || null,

      // Metadata
      metadata: data.metadata || null,
    };

    // Insert into database (using service role - bypasses RLS)
    const { error } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert(record);

    if (error) {
      // Log error but DON'T throw - fail silently
      logger.error('[Audit] Failed to write audit log (non-blocking):', {
        error,
        action: data.action,
        resourceId: data.resourceId,
      });
    }
  } catch (error) {
    // Catch ALL errors - NEVER let audit logging break main operation
    logger.error('[Audit] Unexpected error in auditLog (non-blocking):', {
      error,
      action: data.action,
      resourceId: data.resourceId,
    });
  }
}

// ============================================================================
// Convenience Helpers for Common Actions
// ============================================================================

/**
 * Log a failed operation
 */
export async function auditLogFailure(
  ctx: AdminAuthContext,
  data: Omit<AuditLogData, 'status'> & { errorCode: string; errorMessage: string }
): Promise<void> {
  await auditLog(ctx, {
    ...data,
    status: 'failure',
  });
}

/**
 * Log a reservation assignment
 */
export async function auditReservationAssign(
  ctx: AdminAuthContext,
  params: {
    reservationId: string;
    fromCampsiteId: string | null;
    toCampsiteId: string;
    checkIn: string;
    checkOut: string;
    statusTransition?: string;
  }
): Promise<void> {
  await auditLog(ctx, {
    action: 'reservation.assign',
    resourceType: 'reservation',
    resourceId: params.reservationId,
    metadata: {
      from_campsite_id: params.fromCampsiteId,
      to_campsite_id: params.toCampsiteId,
      check_in: params.checkIn,
      check_out: params.checkOut,
      status_transition: params.statusTransition,
    },
  });
}

/**
 * Log a blackout date creation
 */
export async function auditBlackoutCreate(
  ctx: AdminAuthContext,
  params: {
    blackoutId: string;
    campsiteId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }
): Promise<void> {
  await auditLog(ctx, {
    action: 'blackout.create',
    resourceType: 'blackout',
    resourceId: params.blackoutId,
    metadata: {
      campsite_id: params.campsiteId,
      start_date: params.startDate,
      end_date: params.endDate,
      reason: params.reason,
    },
  });
}

/**
 * Log a blackout date update
 */
export async function auditBlackoutUpdate(
  ctx: AdminAuthContext,
  params: {
    blackoutId: string;
    before: { startDate: string; endDate: string; campsiteId?: string };
    after: { startDate: string; endDate: string; campsiteId?: string };
  }
): Promise<void> {
  await auditLog(ctx, {
    action: 'blackout.update',
    resourceType: 'blackout',
    resourceId: params.blackoutId,
    metadata: {
      campsite_id: params.after.campsiteId || params.before.campsiteId,
      before: {
        start_date: params.before.startDate,
        end_date: params.before.endDate,
      },
      after: {
        start_date: params.after.startDate,
        end_date: params.after.endDate,
      },
    },
  });
}

/**
 * Log a blackout date deletion
 */
export async function auditBlackoutDelete(
  ctx: AdminAuthContext,
  params: {
    blackoutId: string;
    campsiteId: string;
    startDate: string;
    endDate: string;
  }
): Promise<void> {
  await auditLog(ctx, {
    action: 'blackout.delete',
    resourceType: 'blackout',
    resourceId: params.blackoutId,
    metadata: {
      campsite_id: params.campsiteId,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  });
}
