const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Handle multiple possible key names for robustness
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seedAddons() {
    console.log("Seeding Add-ons...");

    // Check if any exist
    const { data: existing } = await supabase.from('addons').select('id').limit(1);

    if (existing && existing.length > 0) {
        console.log("Add-ons already exist.");
        return;
    }

    const { data, error } = await supabase.from('addons').insert([
        {
            name: 'Firewood Bundle',
            description: 'A bundle of dry firewood.',
            price: 10.00,
            category: 'merchandise',
            is_active: true
        },
        {
            name: 'Kayak Rental (Daily)',
            description: 'Includes paddle and life vest.',
            price: 45.00,
            category: 'rental',
            is_active: true
        }
    ]).select();

    if (error) console.error("Error seeding addons:", error);
    else console.log("Seeded Addons:", data.length);
}

seedAddons();
