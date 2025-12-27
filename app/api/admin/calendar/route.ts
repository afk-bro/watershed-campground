import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';
import { requireAdminWithOrg } from '@/lib/admin-auth';

/**
 * GET /api/admin/calendar
 * 
 * Fetches calendar data (reservations, campsites, blackout dates) for a specific month.
 * All data is scoped to the user's organization.
 */
export async function GET(request: Request) {
    try {
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('month'); // YYYY-MM

        // Default to current month if not specified
        const targetDate = dateParam ? parseISO(`${dateParam}-01`) : new Date();

        const startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd');

        // Fetch reservations that overlap with the month (org-scoped)
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('*, campsites(id, name, code, type)')
            .eq('organization_id', organizationId!)
            .lte('check_in', endDate)
            .gte('check_out', startDate);

        if (resError) {
            throw resError;
        }

        // Fetch all campsites (org-scoped)
        const { data: campsites, error: campError } = await supabaseAdmin
            .from('campsites')
            .select('*')
            .eq('organization_id', organizationId!)
            .order('sort_order', { ascending: true });

        if (campError) {
            throw campError;
        }

        // Fetch blackout dates (org-scoped)
        const { data: blackouts, error: bErr } = await supabaseAdmin
            .from('blackout_dates')
            .select('*')
            .eq('organization_id', organizationId!)
            .lte('start_date', endDate)
            .gte('end_date', startDate);

        if (bErr) throw bErr;

        return NextResponse.json({
            reservations: reservations || [],
            campsites: campsites || [],
            blackoutDates: blackouts || [],
            meta: {
                startDate,
                endDate,
                organizationId
            }
        });

    } catch (error) {
        console.error('Error fetching calendar data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar data' },
            { status: 500 }
        );
    }
}
