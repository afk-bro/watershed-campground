import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { startOfMonth, endOfMonth, parse, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { requireAdminWithOrg } from '@/lib/admin-auth';

export async function GET(request: Request) {
    try {
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { searchParams } = new URL(request.url);
        const monthStr = searchParams.get('month'); // "yyyy-MM"

        if (!monthStr) {
            return NextResponse.json({ error: 'Month parameter is required (yyyy-MM)' }, { status: 400 });
        }

        const startDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
        const endDate = endOfMonth(startDate);

        // 1. Get all confirmed/checked_in/checked_out reservations that overlap with this month (org-scoped)
        // We check overlap: start < end_month AND end > start_month
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('id, total_amount, check_in, check_out, status, campsite_id')
            .eq('organization_id', organizationId!)
            .in('status', ['confirmed', 'checked_in', 'checked_out', 'deposit_paid'])
            .or(`and(check_in.lte.${endDate.toISOString()},check_out.gte.${startDate.toISOString()})`);

        if (resError) throw resError;

        // 2. Get active campsites count for occupancy calculation (org-scoped)
        const { count: totalCampsites, error: siteError } = await supabaseAdmin
            .from('campsites')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId!)
            .eq('is_active', true);

        if (siteError) throw siteError;

        // 3. Calculate Metrics
        let totalRevenue = 0;
        let bookedNights = 0;
        const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate }).length;
        const totalPossibleNights = (totalCampsites || 0) * daysInMonth;

        reservations?.forEach(res => {
            // Revenue (simple sum of total_amount for this month's bookings)
            // Note: Ideally we'd split revenue by day, but for V1 "Minimal", 
            // we'll just sum the total of any reservation STARTING or OVERLAPPING?
            // "Revenue" usually means money earned. 
            // Let's sum total_amount for all reservations that *end* in this month or *start*?
            // Standard simple accounting: Revenue belongs to the month check-in occurs (or split). 
            // V1 Simple: Sum total_amount if check_in is within the month.

            const checkInDate = new Date(res.check_in);
            if (isWithinInterval(checkInDate, { start: startDate, end: endDate })) {
                totalRevenue += res.total_amount;
            }

            // Occupancy (Count nights falling within this month)
            const resStart = new Date(res.check_in);
            const resEnd = new Date(res.check_out);

            // Intersect reservation range with month range
            const overlapStart = resStart < startDate ? startDate : resStart;
            const overlapEnd = resEnd > endDate ? endDate : resEnd;

            if (overlapStart < overlapEnd) {
                const nights = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
                bookedNights += nights;
            }
        });

        const occupancyRate = totalPossibleNights > 0
            ? (bookedNights / totalPossibleNights) * 100
            : 0;

        return NextResponse.json({
            revenue: totalRevenue,
            occupancy: Math.round(occupancyRate * 10) / 10, // 1 decimal
            totalReservations: reservations?.length || 0,
            bookedNights,
            totalPossibleNights
        });

    } catch (error) {
        console.error("Reporting Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
