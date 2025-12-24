
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    try {
        const { authorized, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('month'); // YYYY-MM

        // Default to current month if not specified
        const targetDate = dateParam ? parseISO(`${dateParam}-01`) : new Date();

        const startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd');

        // Fetch reservations that overlap with the month
        // We want reservations where (start <= month_end) AND (end >= month_start)
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('*, campsites(id, name, code, type)')
            .lte('check_in', endDate)
            .gte('check_out', startDate);

        if (resError) {
            throw resError;
        }

        // Fetch all campsites to build the rows
        const { data: campsites, error: campError } = await supabaseAdmin
            .from('campsites')
            .select('*')
            .order('sort_order', { ascending: true });

        if (campError) {
            throw campError;
        }

        // Fetch blackout dates
        const { data: blackouts, error: bErr } = await supabaseAdmin
            .from('blackout_dates')
            .select('*')
            .lte('start_date', endDate)
            .gte('end_date', startDate);

        if (bErr) throw bErr;

        return NextResponse.json({
            reservations: reservations || [],
            campsites: campsites || [],
            blackoutDates: blackouts || [],
            meta: {
                startDate,
                endDate
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
