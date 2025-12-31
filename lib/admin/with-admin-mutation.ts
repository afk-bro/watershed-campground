/**
 * Admin Mutation Wrapper
 *
 * Higher-order function that wraps admin mutation handlers (POST/PATCH/DELETE) with:
 * - Authentication and authorization (via withAdminAuth)
 * - Automatic audit logging (via auditLog)
 * - Request ID correlation
 * - Consistent error handling and response shape
 *
 * This ensures every admin mutation is automatically tracked in the audit log.
 */

import { NextResponse } from "next/server";
import { withAdminAuth, type AdminContext } from "@/lib/admin/api-wrapper";
import { auditLog, auditLogFailure, type AdminAuthContext } from "@/lib/audit/audit-logger";
import { errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

/**
 * Configuration for audit logging within a mutation
 */
export interface MutationAuditConfig {
  /** Action in format: "resource.verb" (e.g. "reservation.assign") */
  action: string;

  /** Resource type (e.g. "reservation", "blackout", "campsite") */
  resourceType: string;

  /**
   * Function to extract resource ID from handler result or context
   * Called after handler succeeds to get the resource ID for audit logging
   */
  resourceIdExtractor: (context: AdminContext, result: unknown) => string;

  /**
   * Optional function to extract metadata from handler result or context
   * Called after handler succeeds to get additional audit metadata
   */
  metadataExtractor?: (context: AdminContext, result: unknown) => Record<string, unknown>;
}

/**
 * Admin mutation handler function type
 * Returns the response data (not NextResponse) - wrapper handles NextResponse creation
 */
export type AdminMutationHandler<T = unknown> = (
  context: AdminContext
) => Promise<T>;

/**
 * Wrap an admin mutation handler with automatic audit logging
 *
 * @example
 * ```typescript
 * // Before (manual audit logging):
 * export const POST = withAdminAuth(async (ctx) => {
 *   const body = await ctx.request.json();
 *   const { data, error } = await supabaseAdmin
 *     .from('reservations')
 *     .update({ campsite_id: body.campsiteId })
 *     .eq('id', ctx.params.id)
 *     .eq('organization_id', ctx.organizationId)
 *     .select()
 *     .single();
 *
 *   if (error) throw error;
 *
 *   // Manual audit log
 *   await auditLog(ctx, {
 *     action: 'reservation.assign',
 *     resourceType: 'reservation',
 *     resourceId: ctx.params.id,
 *     metadata: { campsite_id: body.campsiteId }
 *   });
 *
 *   return NextResponse.json({ data });
 * });
 *
 * // After (automatic audit logging):
 * export const POST = withAdminMutation(
 *   {
 *     action: 'reservation.assign',
 *     resourceType: 'reservation',
 *     resourceIdExtractor: (ctx) => ctx.params.id,
 *     metadataExtractor: (ctx, result: any) => ({
 *       campsite_id: result.data.campsite_id
 *     })
 *   },
 *   async (ctx) => {
 *     const body = await ctx.request.json();
 *     const { data, error } = await supabaseAdmin
 *       .from('reservations')
 *       .update({ campsite_id: body.campsiteId })
 *       .eq('id', ctx.params.id)
 *       .eq('organization_id', ctx.organizationId)
 *       .select()
 *       .single();
 *
 *     if (error) throw error;
 *     return { data };
 *   }
 * );
 * ```
 *
 * @param auditConfig - Configuration for audit logging
 * @param handler - The admin mutation handler function
 * @returns Wrapped route handler with auth, audit, and error handling
 */
export function withAdminMutation<T = unknown>(
  auditConfig: MutationAuditConfig,
  handler: AdminMutationHandler<T>
) {
  return withAdminAuth(async (context: AdminContext): Promise<NextResponse> => {
    // Generate or extract request ID for correlation
    const requestId = context.request.headers.get('x-request-id') ||
      crypto.randomUUID();

    try {
      // Execute the mutation handler
      const result = await handler(context);

      // Extract resource ID from result
      const resourceId = auditConfig.resourceIdExtractor(context, result);

      // Extract optional metadata
      const metadata = auditConfig.metadataExtractor?.(context, result);

      // Log successful audit (non-blocking)
      await auditLog(
        {
          user: context.user,
          organizationId: context.organizationId,
          request: context.request,
        } as AdminAuthContext,
        {
          action: auditConfig.action,
          resourceType: auditConfig.resourceType,
          resourceId,
          requestId,
          metadata,
          status: 'success',
        }
      );

      // Return successful response
      return NextResponse.json(result);
    } catch (error) {
      // Determine error code and message
      const errorCode = (error as { code?: string }).code || 'MUTATION_FAILED';
      const errorMessage = error instanceof Error
        ? error.message
        : 'An unexpected error occurred';

      // Log failure audit (non-blocking)
      // We may not have a resource ID if the mutation failed early
      // Use a placeholder or extract from context if possible
      let resourceId: string;
      try {
        resourceId = auditConfig.resourceIdExtractor(context, null);
      } catch {
        // If we can't extract resource ID, use a placeholder
        resourceId = 'unknown';
      }

      await auditLogFailure(
        {
          user: context.user,
          organizationId: context.organizationId,
          request: context.request,
        } as AdminAuthContext,
        {
          action: auditConfig.action,
          resourceType: auditConfig.resourceType,
          resourceId,
          requestId,
          errorCode,
          errorMessage,
        }
      );

      // Log error for debugging
      logger.error(`[Mutation] ${auditConfig.action} failed:`, {
        error,
        requestId,
        organizationId: context.organizationId,
        userId: context.user.id,
      });

      // Return consistent error response
      return errorResponse(
        errorMessage,
        500,
        { requestId, code: errorCode }
      );
    }
  });
}
