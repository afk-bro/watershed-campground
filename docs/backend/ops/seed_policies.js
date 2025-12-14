require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function seedPolicies() {
    console.log("Checking payment policies...");

    // 1. Check for 'Seasonal Deposit'
    const { data: depositPolicy } = await supabase
        .from('payment_policies')
        .select('*')
        .eq('name', 'Seasonal 50% Deposit')
        .single();

    if (!depositPolicy) {
        console.log("Creating Seasonal Deposit Policy...");
        await supabase.from('payment_policies').insert([{
            name: 'Seasonal 50% Deposit',
            policy_type: 'deposit',
            deposit_type: 'percent',
            deposit_value: 50.00,
            due_days_before_checkin: 30,
            site_type: 'cabin', // Let's use 'cabin' as the "Deposit" type for this test
            // or we can use 'rv' if we want. Let's assume user wants 'Seasonal' which implies a type or just name.
            // User said: "Campsite type that should select DEPOSIT (ex: Seasonal)". 
            // Our logic matches on 'site_type'. Let's assume 'cabin' = Seasonal behavior for this test.
        }]);
    } else {
        console.log("Seasonal Deposit Policy exists.");
    }

    // 2. Check for 'Standard Full Payment'
    // Actually, our logic defaults to default full payment if no rule matches.
    // But let's create a specific one for 'tent' just to be explicit if we want.
    // Or just rely on default. The default is 'full' if no policy found.
    // Let's create an explicit one for 'rv' to be Full.
    const { data: fullPolicy } = await supabase
        .from('payment_policies')
        .select('*')
        .eq('name', 'Standard RV Full Payment')
        .single();

    if (!fullPolicy) {
        console.log("Creating Standard RV Policy...");
        await supabase.from('payment_policies').insert([{
            name: 'Standard RV Full Payment',
            policy_type: 'full',
            site_type: 'rv'
        }]);
    } else {
        console.log("Standard RV Policy exists.");
    }
}

seedPolicies().catch(console.error);
