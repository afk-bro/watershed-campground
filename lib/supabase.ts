
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
    image_url?: string | null;
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
    /**
     * Hash of the public edit token. Sensitive; do not expose to clients.
     */
    public_edit_token_hash?: string;
    campsite_id?: string;
    locked?: boolean;
    metadata?: {
        admin_overrides?: {
            override_reason?: string;
            force_conflict?: boolean;
            override_blackout?: boolean;
            is_offline?: boolean;
            entry_source?: string;
        };
        audit_version?: number;
        source?: string;
        created_by?: string;
        [key: string]: unknown;
    } | null;
    archived_at?: string | null;
    archived_by?: string | null;
    // Joined fields
    campsites?: {
        code: string;
        name: string;
        type: CampsiteType;
    };
};

export type BlackoutDate = {
    id: string;
    start_date: string;
    end_date: string;
    reason?: string;
    campsite_id?: string | null; // null means all sites
    created_at?: string;
};

// Overview item types for unified reservations + blocking events view
export type ReservationOverviewItem = {
    type: 'reservation';
    id: string;
    check_in: string;
    check_out: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    adults: number;
    children: number;
    status: ReservationStatus;
    campsite_code?: string;
    campsite_name?: string;
    campsite_type?: CampsiteType;
    created_at: string;
};

export type BlockingEventOverviewItem = {
    type: 'maintenance' | 'blackout';
    id: string;
    start_date: string;
    end_date: string;
    reason?: string;
    campsite_code?: string;
    campsite_name?: string;
    campsite_type?: CampsiteType;
    created_at: string;
};

export type OverviewItem = ReservationOverviewItem | BlockingEventOverviewItem;
