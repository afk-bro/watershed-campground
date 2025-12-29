
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function GET() {
    try {
        logger.debug("Testing Supabase connection...");
        const { data, error } = await supabase.from('reservations').select('count', { count: 'exact', head: true });

        if (error) {
            logger.error("Supabase Test Error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: data });
    } catch (error) {
        logger.error("Supabase Test Exception:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
