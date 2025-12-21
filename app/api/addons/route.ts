import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { data: addons, error } = await supabaseAdmin
            .from("addons")
            .select("*")
            .eq("is_active", true)
            .order("name");

        if (error) {
            console.error("Error fetching addons:", error);
            return NextResponse.json({ error: "Failed to fetch addons" }, { status: 500 });
        }

        return NextResponse.json(addons);
    } catch (err) {
        console.error("Internal Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
