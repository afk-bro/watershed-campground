import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { campsiteFormSchema } from "@/lib/schemas";
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { logAudit } from "@/lib/audit/audit-service";

// GET /api/admin/campsites - List all campsites
export async function GET(request: Request) {
    try {
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { searchParams } = new URL(request.url);
        const showInactive = searchParams.get('showInactive') !== 'false';

        let query = supabaseAdmin
            .from('campsites')
            .select('*')
            .eq('organization_id', organizationId!)
            .order('sort_order', { ascending: true });

        if (!showInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error in GET /api/admin/campsites:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/admin/campsites - Create a new campsite
export async function POST(request: Request) {
    try {
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const body = await request.json();

        // Validate request body
        const validationResult = campsiteFormSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const formData = validationResult.data;

        // Convert camelCase to snake_case for database
        const campsiteData = {
            name: formData.name,
            code: formData.code,
            type: formData.type,
            max_guests: formData.maxGuests,
            base_rate: formData.baseRate,
            is_active: formData.isActive,
            notes: formData.notes || null,
            sort_order: formData.sortOrder,
            organization_id: organizationId!,
        };

        // Insert campsite
        const { data, error } = await supabaseAdmin
            .from('campsites')
            .insert(campsiteData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: "A campsite with this code already exists" }, { status: 409 });
            }
            throw error;
        }

        // Audit Logging
        await logAudit({
            action: 'CAMPSITE_UPDATE', // Reusing action type or could add CAMPSITE_CREATE
            newData: data,
            changedBy: user!.id,
            organizationId: organizationId!
        });

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/admin/campsites:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
