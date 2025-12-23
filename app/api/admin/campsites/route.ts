import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { campsiteFormSchema } from "@/lib/schemas";
import { z } from "zod";

// GET /api/admin/campsites - List all campsites
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        // Default to showing inactive for admin unless explicitly hidden
        const showInactive = searchParams.get('showInactive') !== 'false';

        let query = supabaseAdmin
            .from('campsites')
            .select('*')
            .order('sort_order', { ascending: true });

        // Filter by active status if showInactive is explicitly false
        if (!showInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching campsites:", error);
            return NextResponse.json(
                { error: "Failed to fetch campsites" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error in GET /api/admin/campsites:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/admin/campsites - Create a new campsite
export async function POST(request: Request) {
    try {
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

        // Validate request body
        const validationResult = campsiteFormSchema.safeParse(body);

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
        const campsiteData = {
            name: formData.name,
            code: formData.code,
            type: formData.type,
            max_guests: formData.maxGuests,
            base_rate: formData.baseRate,
            is_active: formData.isActive,
            notes: formData.notes || null,
            sort_order: formData.sortOrder,
        };

        // Insert campsite
        const { data, error } = await supabaseAdmin
            .from('campsites')
            .insert(campsiteData)
            .select()
            .single();

        if (error) {
            // Check for unique constraint violation on code
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: "A campsite with this code already exists" },
                    { status: 409 }
                );
            }

            console.error("Error creating campsite:", error);
            return NextResponse.json(
                { error: "Failed to create campsite" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/admin/campsites:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
