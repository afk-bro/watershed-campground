import { NextResponse } from 'next/server';
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { clearDemoData } from '@/lib/seed/demo-seed';

/**
 * DELETE /api/admin/clear-demo
 * Clears all demo data for the organization
 */
export async function DELETE(request: Request) {
    try {
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        // Clear demo data for this organization
        const result = await clearDemoData(organizationId!, user!.id);

        return NextResponse.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('[API] Clear demo error:', error);
        return NextResponse.json(
            { error: 'Failed to clear demo data' },
            { status: 500 }
        );
    }
}
