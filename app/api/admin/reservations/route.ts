import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching reservations:", error);
            return NextResponse.json(
                { error: "Failed to fetch reservations" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error in GET /api/admin/reservations:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
