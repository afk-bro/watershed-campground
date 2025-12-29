import { supabaseAdmin } from "@/lib/supabase-admin";
import { campsiteFormSchema } from "@/lib/schemas";
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { logAudit } from "@/lib/audit/audit-service";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, validationError } from "@/lib/api-helpers";
import { withAdminAuth } from "@/lib/admin/api-wrapper";

// GET /api/admin/campsites - List all campsites
export const GET = withAdminAuth(async ({ request, organizationId }) => {
    const { searchParams } = new URL(request.url);
    const showInactive = searchParams.get('showInactive') !== 'false';

    let query = supabaseAdmin
        .from('campsites')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

    if (!showInactive) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return successResponse({ data });
});

// POST /api/admin/campsites - Create a new campsite
export const POST = withAdminAuth(async ({ request, user, organizationId }) => {
    const body = await request.json();

    // Validate request body
    const validationResult = campsiteFormSchema.safeParse(body);

    if (!validationResult.success) {
        return validationError(validationResult.error);
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
        organization_id: organizationId,
    };

    // Insert campsite
    const { data, error } = await supabaseAdmin
        .from('campsites')
        .insert(campsiteData)
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return errorResponse("A campsite with this code already exists", 409);
        }
        throw error;
    }

    // Audit Logging
    await logAudit({
        action: 'CAMPSITE_UPDATE', // Reusing action type or could add CAMPSITE_CREATE
        newData: data,
        changedBy: user.id,
        organizationId: organizationId
    });

    return successResponse({ data }, 201);
});
