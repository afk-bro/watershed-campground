import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
    try {
        // Simple DB connectivity check
        const { error } = await supabaseAdmin
            .from('campsites')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which is fine for health check
            throw error;
        }

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        console.error('[Health Check] Database connectivity failed:', error);
        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 503 }
        );
    }
}
