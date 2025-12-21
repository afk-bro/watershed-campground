import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: Request) {
    try {
        const { reservation_id, token } = await req.json();

        if (!reservation_id || !token) {
            return NextResponse.json(
                { error: 'Missing parameters' },
                { status: 400 }
            );
        }

        // Validate token format: must be a 64-character hex string
        if (!/^[a-f0-9]{64}$/.test(token)) {
            return NextResponse.json(
                { error: 'Invalid token format' },
                { status: 400 }
            );
        }
        const tokenHash = hashToken(token);

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('id', reservation_id)
            .eq('public_edit_token_hash', tokenHash)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: 'Reservation not found or invalid link' },
                { status: 404 }
            );
        }

        return NextResponse.json({ reservation: data });
    } catch (error) {
        console.error('Error in manage-reservation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
