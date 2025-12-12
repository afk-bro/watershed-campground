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

        const tokenHash = hashToken(token);

        // Verify the token and get current status
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('id, status')
            .eq('id', reservation_id)
            .eq('public_edit_token_hash', tokenHash)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json(
                { error: 'Reservation not found or invalid link' },
                { status: 404 }
            );
        }

        // Restrict which statuses can be cancelled by guest
        if (existing.status === 'checked_in' || existing.status === 'checked_out') {
            return NextResponse.json(
                { error: 'Cannot cancel a reservation that is already checked in or completed' },
                { status: 400 }
            );
        }

        if (existing.status === 'cancelled') {
            return NextResponse.json(
                { error: 'Reservation is already cancelled' },
                { status: 400 }
            );
        }

        // Cancel the reservation
        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservation_id)
            .eq('public_edit_token_hash', tokenHash)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: 'Failed to cancel reservation' },
                { status: 500 }
            );
        }

        return NextResponse.json({ reservation: data });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
