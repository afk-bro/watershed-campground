import { NextResponse } from 'next/server';
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { seedDemoDataForCampground } from '@/lib/seed/demo-seed';

/**
 * POST /api/admin/seed-demo
 * Seeds demo data for the organization
 */
export async function POST(request: Request) {
    try {
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        // Seed demo data for this organization
        const result = await seedDemoDataForCampground(organizationId!, user!.id);

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

    } catch (error) {
        console.error('[API] Seed demo error:', error);
        return NextResponse.json(
            { error: 'Failed to seed demo data' },
            { status: 500 }
        );
    }
}
