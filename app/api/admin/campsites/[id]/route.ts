import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { campsiteFormSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit/audit-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

// GET /api/admin/campsites/[id] - Get a single campsite
export async function GET(request: Request, { params }: Params) {
    try {
        const { authorized, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from('campsites')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: "Campsite not found" }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error in GET /api/admin/campsites/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/admin/campsites/[id] - Update a campsite
export async function PATCH(request: Request, { params }: Params) {
    try {
        const { authorized, user, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        const { id } = await params;

        // Fetch existing for comparison/logging
        const { data: existingCampsite, error: fetchError } = await supabaseAdmin
            .from('campsites')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingCampsite) {
            return NextResponse.json({ error: 'Campsite not found' }, { status: 404 });
        }

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

        // Update campsite
        const { data: updatedCampsite, error: updateError } = await supabaseAdmin
            .from('campsites')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            if (updateError.code === '23505') {
                return NextResponse.json({ error: "A campsite with this code already exists" }, { status: 409 });
            }
            throw updateError;
        }

        // Audit Logging
        await logAudit({
            action: 'CAMPSITE_UPDATE',
            oldData: existingCampsite,
            newData: updatedCampsite,
            changedBy: user!.id
        });

        return NextResponse.json({ data: updatedCampsite });
    } catch (error) {
        console.error("Error in PATCH /api/admin/campsites/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/admin/campsites/[id] - Permanent delete a campsite
export async function DELETE(request: Request, { params }: Params) {
    try {
        const { authorized, user, response: authResponse } = await requireAdmin();
        if (!authorized) return authResponse!;

        const { id } = await params;

        // Fetch existing for logging
        const { data: existingCampsite, error: fetchError } = await supabaseAdmin
            .from('campsites')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingCampsite) {
            return NextResponse.json({ error: "Campsite not found" }, { status: 404 });
        }

        // Delete the campsite record
        const { error: deleteError } = await supabaseAdmin
            .from('campsites')
            .delete()
            .eq('id', id);

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
        await logAudit({
            action: 'CAMPSITE_DEACTIVATE', // Or add CAMPSITE_DELETE but current schema uses campsite_id as reservation_id dummy or similar. Actually logAudit handles it.
            oldData: existingCampsite,
            changedBy: user!.id
        });

        return NextResponse.json({ message: "Campsite deleted permanently" });
    } catch (error) {
        console.error("Error in DELETE /api/admin/campsites/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
