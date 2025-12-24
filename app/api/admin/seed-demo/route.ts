import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { seedDemoDataForCampground } from '@/lib/seed/demo-seed';

/**
 * Seeds demo data for the campground.
 * Only works if the campground has no existing reservations.
 */
export async function POST(request: Request) {
    try {
        // Authorization
        const { authorized, user, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        // Seed demo data
        const result = await seedDemoDataForCampground(user!.id);

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
        console.error('[API] Demo seed error:', error);
        return NextResponse.json(
            { error: 'Failed to seed demo data' },
            { status: 500 }
        );
    }
}
