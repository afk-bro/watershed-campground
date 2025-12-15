import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { start_date, end_date, campsite_id, reason } = body;

        if (!start_date || !end_date) {
            return NextResponse.json(
                { error: 'Start date and end date are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date,
                end_date,
                campsite_id: campsite_id === 'UNASSIGNED' ? null : campsite_id,
                reason
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating blackout date:', error);
        return NextResponse.json(
            { error: 'Failed to create blackout date' },
            { status: 500 }
        );
    }
}
