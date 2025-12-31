/**
 * Admin Audit Logs Viewer
 *
 * GET /api/admin/audit-logs
 *
 * Query parameters:
 * - limit: Number of logs to return (default: 50, max: 200)
 * - offset: Number of logs to skip (default: 0)
 * - action: Filter by action type (e.g. "reservation.assign", "blackout.create")
 * - resource_type: Filter by resource type (e.g. "reservation", "blackout")
 * - resource_id: Filter by specific resource ID
 * - actor_user_id: Filter by specific actor user ID
 * - status: Filter by status ("success" or "failure")
 * - start_date: Filter logs created after this date (ISO 8601)
 * - end_date: Filter logs created before this date (ISO 8601)
 *
 * Returns paginated audit logs with full context (actor, metadata, timestamps).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withAdminAuth } from '@/lib/admin/api-wrapper';

export const GET = withAdminAuth(async ({ request, organizationId }) => {
    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resource_type');
    const resourceId = url.searchParams.get('resource_id');
    const actorUserId = url.searchParams.get('actor_user_id');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Build query (org-scoped)
    let query = supabaseAdmin
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    // Apply filters
    if (action) {
        query = query.eq('action', action);
    }

    if (resourceType) {
        query = query.eq('resource_type', resourceType);
    }

    if (resourceId) {
        query = query.eq('resource_id', resourceId);
    }

    if (actorUserId) {
        query = query.eq('actor_user_id', actorUserId);
    }

    if (status && (status === 'success' || status === 'failure')) {
        query = query.eq('status', status);
    }

    if (startDate) {
        query = query.gte('created_at', startDate);
    }

    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: logs, error, count } = await query;

    if (error) {
        throw error;
    }

    return NextResponse.json({
        logs: logs || [],
        pagination: {
            limit,
            offset,
            total: count || 0,
            hasMore: (count || 0) > offset + limit,
        },
    });
});
