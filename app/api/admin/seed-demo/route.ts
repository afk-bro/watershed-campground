import { NextResponse } from 'next/server';
import { seedDemoDataForCampground } from '@/lib/seed/demo-seed';
import { withAdminAuth } from '@/lib/admin/api-wrapper';

/**
 * POST /api/admin/seed-demo
 * Seeds demo data for the organization
 */
export const POST = withAdminAuth(async ({ user, organizationId }) => {
    // Seed demo data for this organization
    const result = await seedDemoDataForCampground(organizationId, user.id);

    if (!result.success) {
        return NextResponse.json(
            { error: result.message },
            { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        message: result.message
    });
});
