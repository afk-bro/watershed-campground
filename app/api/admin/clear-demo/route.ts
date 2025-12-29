import { NextResponse } from 'next/server';
import { clearDemoData } from '@/lib/seed/demo-seed';
import { withAdminAuth } from '@/lib/admin/api-wrapper';

/**
 * DELETE /api/admin/clear-demo
 * Clears all demo data for the organization
 */
export const DELETE = withAdminAuth(async ({ user, organizationId }) => {
    // Clear demo data for this organization
    const result = await clearDemoData(organizationId, user.id);

    return NextResponse.json({
        success: true,
        message: result.message
    });
});
