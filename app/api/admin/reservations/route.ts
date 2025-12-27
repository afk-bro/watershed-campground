import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { OverviewItem } from "@/lib/supabase";
import { requireAdminWithOrg } from "@/lib/admin-auth";

/**
 * GET /api/admin/reservations
 * 
 * Fetches all reservations and blackout dates for the organization.
 * Used by the admin dashboard to display the reservations list.
 */
export async function GET() {
    try {
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        // Fetch reservations with payment data (org-scoped)
        const { data: reservations, error: reservationsError } = await supabaseAdmin
            .from('reservations')
            .select(`
                *,
                campsite:campsites(code, name, type),
                payment_transactions(amount, status, type, created_at)
            `)
            .eq('organization_id', organizationId!)
            .is('archived_at', null);

        if (reservationsError) {
            console.error("Error fetching reservations:", reservationsError);
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
            .eq('organization_id', organizationId!);

        if (blackoutError) {
            console.error("Error fetching blackout dates:", blackoutError);
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
                blackouts: blackoutItems.length
            }
        });

    } catch (error) {
        console.error("Error in reservations endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
