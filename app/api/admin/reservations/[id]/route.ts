import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ReservationStatus } from "@/lib/supabase";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body as { status: ReservationStatus };

        // Validate status
        const validStatuses: ReservationStatus[] = [
            'pending',
            'confirmed',
            'cancelled',
            'checked_in',
            'checked_out',
            'no_show'
        ];

        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json(
                { error: "Invalid status value" },
                { status: 400 }
            );
        }

        // Update reservation status
        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Error updating reservation:", error);
            return NextResponse.json(
                { error: "Failed to update reservation" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error in PATCH /api/admin/reservations/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
