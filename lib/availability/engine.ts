import { supabaseAdmin } from "@/lib/supabase-admin";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export type DayStatus = {
    date: string; // YYYY-MM-DD
    status: 'available' | 'sold-out' | 'blackout' | 'limited';
};

export type SearchParams = {
    checkIn: string;
    checkOut: string;
    guestCount: number;
    rvLength?: number;
    unitType?: 'Tent' | 'RV / Trailer' | 'Camper Van' | 'Cabin' | '';
};

/**
 * Checks availability for every day in a given month.
 * Used to populate the high-level date picker.
 */
export async function checkDailyAvailability(month: Date): Promise<DayStatus[]> {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const dates = eachDayOfInterval({ start, end });

    // 1. Get all active campsites (to know total capacity)
    const { data: allCampsites } = await supabaseAdmin
        .from('campsites')
        .select('id')
        .eq('is_active', true);

    if (!allCampsites || allCampsites.length === 0) {
        return dates.map(date => ({ date: format(date, 'yyyy-MM-dd'), status: 'sold-out' }));
    }

    const totalSites = allCampsites.length;

    // 2. Get all reservations in this month
    // Overlap: existing.start <= monthEnd AND existing.end >= monthStart
    const { data: reservations } = await supabaseAdmin
        .from('reservations')
        .select('check_in, check_out, campsite_id')
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`and(check_in.lte.${format(end, 'yyyy-MM-dd')},check_out.gte.${format(start, 'yyyy-MM-dd')})`);

    // 3. Get all blackout dates in this month
    const { data: blackouts } = await supabaseAdmin
        .from('blackout_dates')
        .select('start_date, end_date, campsite_id')
        .or(`and(start_date.lte.${format(end, 'yyyy-MM-dd')},end_date.gte.${format(start, 'yyyy-MM-dd')})`);

    // 4. Calculate status for each day
    const result: DayStatus[] = dates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');

        // Check Global Blackouts (campsite_id is null)
        const isGlobalBlackout = blackouts?.some(b =>
            b.campsite_id === null &&
            b.start_date <= dateStr &&
            b.end_date >= dateStr
        );

        if (isGlobalBlackout) {
            return { date: dateStr, status: 'blackout' };
        }

        // Count booked sites for this specific day
        // Logic: A reservation books a night if the date is >= check_in AND < check_out
        // (Checkout day is available for accumulation, but blocked for stay... wait, standard logic:
        // If I book 12th-14th. I stay night of 12th and 13th.
        // So 12th is booked. 13th is booked. 14th is theoretically free for next arrival?
        // YES. Standard hotel logic: check-in day is booked. check-out day is not booked *for that night*.
        // BUT for *arrival* availability, if I arrive on 12th, I need 12th to be free.
        // If I arrive on 14th, I need 14th to be free.
        // So a reservation 12-14 blocks arrivals on 12 and 13. It does NOT block arrival on 14.

        // This is a rough heuristic. 
        // Ideally we check *distinct* site IDs blocked.
        // Let's do it properly.
        const blockedSiteIds = new Set<string>();

        reservations?.forEach(r => {
            if (r.check_in <= dateStr && r.check_out > dateStr && r.campsite_id) {
                blockedSiteIds.add(r.campsite_id);
            }
        });

        blackouts?.forEach(b => {
            if (b.campsite_id && b.start_date <= dateStr && b.end_date >= dateStr) {
                blockedSiteIds.add(b.campsite_id);
            }
        });

        const availableCount = totalSites - blockedSiteIds.size;

        if (availableCount <= 0) {
            return { date: dateStr, status: 'sold-out' };
        } else if (availableCount < 3) { // Threshold for "Limited"
            return { date: dateStr, status: 'limited' };
        } else {
            return { date: dateStr, status: 'available' };
        }
    });

    return result;
}

/**
 * Searches for specific campsites matching criteria.
 */
export async function searchCampsites(params: SearchParams) {
    const { checkIn, checkOut, guestCount, rvLength, unitType } = params;

    // 1. Get all conflicting IDs (same logic as availability.ts)
    const { data: conflicting } = await supabaseAdmin
        .from('reservations')
        .select('campsite_id')
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .not('campsite_id', 'is', null)
        .or(`and(check_out.gt.${checkIn},check_in.lt.${checkOut})`);

    const { data: blackouts } = await supabaseAdmin
        .from('blackout_dates')
        .select('campsite_id')
        .or(`and(end_date.gte.${checkIn},start_date.lte.${checkOut})`);

    // Check global blackout
    if (blackouts?.some(b => b.campsite_id === null)) {
        return [];
    }

    const blockedIds = new Set([
        ...(conflicting?.map(r => r.campsite_id) || []),
        ...(blackouts?.map(b => b.campsite_id) || [])
    ].filter(id => id !== null) as string[]);

    // 2. Query available sites
    const query = supabaseAdmin
        .from('campsites')
        .select('*')
        .eq('is_active', true)
        .gte('max_guests', guestCount)
        .order('sort_order', { ascending: true });

    // Apply unit type filter for determinism (e.g., RV vs Tent)
    const normalizedUnit = (unitType || '').toLowerCase();
    if (normalizedUnit.includes('rv')) {
        query.eq('type', 'rv');
    } else if (normalizedUnit.includes('tent')) {
        query.eq('type', 'tent');
    }

    // Note: We don't filter RV length / unit type in SQL yet because schema might vary,
    // assuming we filter in memory or they are simple columns.
    // Let's assume schema has 'max_rv_length'.
    // If not, we'll fetch all and filter JS side (safe for small campgrounds).

    const { data: sites } = await query;
    if (!sites) return [];

    return sites.filter(site => {
        if (blockedIds.has(site.id)) return false;

        // Filter by RV Length (if applicable)
        if (rvLength && site.max_rv_length && site.max_rv_length < rvLength) {
            return false;
        }

        // If unit type was specified, ensure site type matches to avoid cross-type suggestions
        if (normalizedUnit) {
            if (normalizedUnit.includes('rv') && site.type !== 'rv') return false;
            if (normalizedUnit.includes('tent') && site.type !== 'tent') return false;
        }

        return true;
    });
}

/**
 * Check availability for a specific date range and optional campsite.
 * Used by payment flow to verify availability before creating payment intent.
 */
export async function checkAvailability(params: {
    checkIn: string;
    checkOut: string;
    guestCount: number;
    campsiteId?: string;
}): Promise<{ available: boolean; recommendedSiteId: string | null }> {
    const { checkIn, checkOut, guestCount, campsiteId } = params;

    // Search for available campsites
    const availableSites = await searchCampsites({
        checkIn,
        checkOut,
        guestCount,
        unitType: '',
        rvLength: 0
    });

    // If no sites available at all
    if (availableSites.length === 0) {
        return { available: false, recommendedSiteId: null };
    }

    // If specific campsite requested, verify it's available
    if (campsiteId) {
        const requestedSite = availableSites.find(site => site.id === campsiteId);
        if (requestedSite) {
            return { available: true, recommendedSiteId: campsiteId };
        }
        // Requested site not available, but others are - return first available
        return { available: true, recommendedSiteId: availableSites[0].id };
    }

    // No specific site requested, return first available
    return { available: true, recommendedSiteId: availableSites[0].id };
}
