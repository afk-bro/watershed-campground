import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { campsiteFormSchema } from "@/lib/schemas";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

// GET /api/admin/campsites/[id] - Get a single campsite
export async function GET(request: Request, { params }: Params) {
    try {
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from('campsites')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: "Campsite not found" },
                    { status: 404 }
                );
            }

            console.error("Error fetching campsite:", error);
            return NextResponse.json(
                { error: "Failed to fetch campsite" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error in GET /api/admin/campsites/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/campsites/[id] - Update a campsite
export async function PATCH(request: Request, { params }: Params) {
    try {
        const { id } = await params;
        const text = await request.text();
        if (!text) {
            return NextResponse.json({ error: "Empty request body" }, { status: 400 });
        }
        let body: unknown;
        try {
            body = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
        }

        // Validate request body (make all fields optional for partial updates)
        const partialSchema = campsiteFormSchema.partial();
        const validationResult = partialSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: validationResult.error.flatten().fieldErrors
                },
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

        // Update campsite
        const { data, error } = await supabaseAdmin
            .from('campsites')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: "Campsite not found" },
                    { status: 404 }
                );
            }

            // Check for unique constraint violation on code
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: "A campsite with this code already exists" },
                    { status: 409 }
                );
            }

            console.error("Error updating campsite:", error);
            return NextResponse.json(
                { error: "Failed to update campsite" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error in PATCH /api/admin/campsites/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/campsites/[id] - Soft delete (deactivate) a campsite
export async function DELETE(request: Request, { params }: Params) {
    try {
        const { id } = await params;

        // Soft delete: set is_active to false instead of actually deleting
        const { data, error } = await supabaseAdmin
            .from('campsites')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: "Campsite not found" },
                    { status: 404 }
                );
            }

            console.error("Error deactivating campsite:", error);
            return NextResponse.json(
                { error: "Failed to deactivate campsite" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            data,
            message: "Campsite deactivated successfully"
        });
    } catch (error) {
        console.error("Error in DELETE /api/admin/campsites/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
