import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { OverviewItem } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin/api-wrapper";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/reservations
 *
 * Fetches all reservations and blackout dates for the organization.
 * Used by the admin dashboard to display the reservations list.
 * 
 * Query parameters:
 * - id: exact reservation ID match (returns single reservation)
 * - q: fuzzy search across first_name, last_name, email, phone
 */
export const GET = withAdminAuth(async ({ organizationId, request }) => {
    const { searchParams } = new URL(request.url);
    const idFilter = searchParams.get('id');
    const searchQuery = searchParams.get('q');

    // Base query: Always scoped to organization and non-archived
    const baseQuery = supabaseAdmin
        .from('reservations')
        .select(`
            *,
            campsite:campsites(code, name, type),
            payment_transactions(amount, status, type, created_at)
        `)
        .eq('organization_id', organizationId)
        .is('archived_at', null);

    let reservationQuery = baseQuery;

    // Apply filters
    if (idFilter) {
        // Exact ID match - highest priority
        reservationQuery = reservationQuery.eq('id', idFilter);
    } else if (searchQuery) {
        // Fuzzy search across multiple fields
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery);

        // PostgREST: org_id=X AND (A OR B OR C)
        reservationQuery = reservationQuery.or(
            `first_name.ilike.%${searchQuery}%,` +
            `last_name.ilike.%${searchQuery}%,` +
            `email.ilike.%${searchQuery}%,` +
            `phone.ilike.%${searchQuery}%` +
            (isUUID ? `,id.eq.${searchQuery}` : '')
        );
    }

    // Explicit ordering: Newest first is best for surfacing fresh test data
    reservationQuery = reservationQuery
        .order('created_at', { ascending: false })
        .limit(5000);

    const { data: reservations, error: reservationsError } = await reservationQuery;

    if (reservationsError) {
        logger.error("[API] Error fetching reservations:", {
            error: reservationsError,
            org: organizationId,
            query: { id: idFilter, q: searchQuery }
        });
        return NextResponse.json(
            { error: "Failed to fetch reservations" },
            { status: 500 }
        );
    }

    // Fetch blackout dates (org-scoped)
    const { data: blackoutDates, error: blackoutError } = await supabaseAdmin
        .from('blackout_dates')
        .select(`
            *,
            campsite:campsites(code, name, type)
        `)
        .eq('organization_id', organizationId);

    if (blackoutError) {
        logger.error("Error fetching blackout dates:", blackoutError);
        return NextResponse.json(
            { error: "Failed to fetch blackout dates" },
            { status: 500 }
        );
    }

    // Add type discriminator to reservations
    const reservationItems = (reservations || []).map(res => ({
        ...res,
        type: 'reservation' as const,
    }));

    // Add type discriminator to blackout dates
    const blackoutItems = (blackoutDates || []).map(bd => {
        const itemType: 'blackout' | 'maintenance' = 'blackout' in bd ? 'blackout' : 'maintenance';
        return {
            ...bd,
            type: itemType,
            campsite_code: bd.campsite?.code,
        };
    });

    const allItems: OverviewItem[] = [...reservationItems, ...blackoutItems];

    return NextResponse.json({
        data: allItems,
        meta: {
            organizationId,
            total: allItems.length,
            reservations: reservationItems.length,
            blackouts: blackoutItems.length,
            filtered: !!(idFilter || searchQuery),
            filter: { id: idFilter, q: searchQuery }
        }
    });
});
