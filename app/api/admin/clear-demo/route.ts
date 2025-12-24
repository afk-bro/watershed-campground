import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { clearDemoData } from '@/lib/seed/demo-seed';

/**
 * Clears all demo data from the campground.
 */
export async function DELETE(request: Request) {
    try {
        // Authorization
        const { authorized, user, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        // Clear demo data with audit logging
        const result = await clearDemoData(user!.id);

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
