/**
 * Admin API Wrapper
 *
 * Higher-order function that wraps admin route handlers with:
 * - Authentication and authorization
 * - Error handling
 * - Parameter extraction
 *
 * Reduces boilerplate in admin routes from ~15 lines to ~3 lines per handler.
 */

import { NextResponse } from "next/server";
import { requireAdminWithOrg } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

/**
 * Context provided to admin route handlers
 */
export interface AdminContext {
  /** The incoming request */
  request: Request;
  /** Authenticated user */
  user: User;
  /** User's organization ID */
  organizationId: string;
  /** Route parameters (e.g., { id: "123" }) */
  params: Record<string, string>;
}

/**
 * Admin route handler function type
 */
export type AdminHandler<T = unknown> = (
  context: AdminContext
) => Promise<NextResponse<T>>;

/**
 * Wrap an admin route handler with authentication and error handling
 *
 * @example
 * ```typescript
 * // Before (15+ lines):
 * export async function GET(request: Request) {
 *   try {
 *     const { authorized, organizationId, response } = await requireAdminWithOrg();
 *     if (!authorized) return response!;
 *
 *     const { data } = await supabaseAdmin
 *       .from('campsites')
 *       .select('*')
 *       .eq('organization_id', organizationId);
 *
 *     return NextResponse.json({ data });
 *   } catch (error) {
 *     logger.error("Error:", error);
 *     return errorResponse("Internal server error", 500);
 *   }
 * }
 *
 * // After (5 lines):
 * export const GET = withAdminAuth(async ({ organizationId }) => {
 *   const { data } = await supabaseAdmin
 *     .from('campsites')
 *     .select('*')
 *     .eq('organization_id', organizationId);
 *
 *   return NextResponse.json({ data });
 * });
 * ```
 *
 * @param handler - The admin route handler function
 * @returns Wrapped route handler with auth and error handling
 */
export function withAdminAuth<T extends Record<string, string>>(
  handler: AdminHandler
) {
  return async (
    request: Request,
    routeParams?: { params: Promise<T> }
  ): Promise<NextResponse> => {
    try {
      // 1. Authenticate and authorize
      const { authorized, user, organizationId, response } = await requireAdminWithOrg();
      if (!authorized) {
        return response!;
      }

      // 2. Extract route parameters
      const params = routeParams?.params
        ? await routeParams.params
        : ({} as T);

      // 3. Call handler with context
      return await handler({
        request,
        user: user!,
        organizationId: organizationId!,
        params
      });
    } catch (error) {
      // 4. Handle errors
      logger.error("Admin API error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}
