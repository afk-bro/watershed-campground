
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL ERROR: Supabase environment variables are missing!");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseKey ? "Set (Hidden)" : "Missing");
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");

export type ReservationStatus =
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'checked_in'
    | 'checked_out'
    | 'no_show';

export type CampsiteType = 'rv' | 'tent' | 'cabin';

export type Campsite = {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    code: string;
    type: CampsiteType;
    max_guests: number;
    base_rate: number;
    is_active: boolean;
    notes?: string;
    sort_order: number;
};

export type Reservation = {
    id?: string;
    created_at?: string;
    updated_at?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    postal_code: string;
    check_in: string;
    check_out: string;
    adults: number;
    children: number;
    rv_length: string;
    rv_year?: string;
    camping_unit: string;
    hear_about?: string;
    contact_method: string;
    comments?: string;
    status: ReservationStatus;
    campsite_id?: string;
    // Joined data from campsites table (when queried with join)
    campsites?: {
        code: string;
        name: string;
        type: CampsiteType;
    };
};
