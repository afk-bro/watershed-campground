import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { campsiteFormSchema } from "@/lib/schemas";
import { logCampsiteChange } from "@/lib/audit/audit-service";
import { verifyOrgResource } from '@/lib/db-helpers';
import type { Json } from '@/lib/database.types';
import { withAdminAuth } from '@/lib/admin/api-wrapper';

// GET /api/admin/campsites/[id] - Get a single campsite
export const GET = withAdminAuth(async ({ organizationId, params }) => {
    const { id } = params;

    // Use verifyOrgResource for 404 before any FK validation
    const campsite = await verifyOrgResource('campsites', id, organizationId);

    if (!campsite) {
        return NextResponse.json({ error: "Campsite not found" }, { status: 404 });
    }

    return NextResponse.json({ data: campsite });
});

// PATCH /api/admin/campsites/[id] - Update a campsite
export const PATCH = withAdminAuth(async ({ request, user, organizationId, params }) => {
    const { id } = params;

    // Fetch existing for comparison/logging - use verifyOrgResource for 404 before validation
    const existingCampsite = await verifyOrgResource('campsites', id, organizationId);

    const body = await request.json();

    // Validate request body (make all fields optional for partial updates)
    const partialSchema = campsiteFormSchema.partial();
    const validationResult = partialSchema.safeParse(body);

    if (!validationResult.success) {
        return NextResponse.json(
            { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const formData = validationResult.data;

    // Convert camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};
    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.code !== undefined) updateData.code = formData.code;
    if (formData.type !== undefined) updateData.type = formData.type;
    if (formData.maxGuests !== undefined) updateData.max_guests = formData.maxGuests;
    if (formData.baseRate !== undefined) updateData.base_rate = formData.baseRate;
    if (formData.isActive !== undefined) updateData.is_active = formData.isActive;
    if (formData.notes !== undefined) updateData.notes = formData.notes || null;
    if (formData.sortOrder !== undefined) updateData.sort_order = formData.sortOrder;
    if (formData.imageUrl !== undefined) updateData.image_url = formData.imageUrl || null;
    updateData.updated_at = new Date().toISOString();

    // Update campsite (org-scoped)
    const { data: updatedCampsite, error: updateError } = await supabaseAdmin
        .from('campsites')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

    if (updateError) {
        if (updateError.code === '23505') {
            return NextResponse.json({ error: "A campsite with this code already exists" }, { status: 409 });
        }
        throw updateError;
    }

    // Audit Logging
    await logCampsiteChange({
        action: 'CAMPSITE_UPDATE',
        oldData: existingCampsite as unknown as Json,
        newData: updatedCampsite as unknown as Json,
        userId: user.id,
        organizationId
    });

    return NextResponse.json({ data: updatedCampsite });
});

// DELETE /api/admin/campsites/[id] - Permanent delete a campsite
export const DELETE = withAdminAuth(async ({ user, organizationId, params }) => {
    const { id } = params;

    // Fetch existing for logging - use verifyOrgResource for 404 before deletion
    const existingCampsite = await verifyOrgResource('campsites', id, organizationId);

    // Delete the campsite record (org-scoped)
    const { error: deleteError } = await supabaseAdmin
        .from('campsites')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

    if (deleteError) {
        if (deleteError.code === '23503') {
            return NextResponse.json(
                { error: "Cannot delete campsite with existing reservations. Deactivate it instead." },
                { status: 409 }
            );
        }
        throw deleteError;
    }

    // Audit Logging
    await logCampsiteChange({
        action: 'CAMPSITE_DEACTIVATE',
        oldData: existingCampsite as unknown as Json,
        newData: null as never,
        userId: user.id,
        organizationId
    });

    return NextResponse.json({ message: "Campsite deleted permanently" });
});
