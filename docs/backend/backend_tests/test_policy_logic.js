const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function determinePaymentPolicy(policies, campsiteId, campsiteType, checkInDate) {
    const checkInMonth = new Date(checkInDate).getMonth() + 1; // 1-12

    // Logic from lib/payment-policy.ts
    const scoredPolicies = policies.map(p => {
        let score = 0;
        let match = true;

        // 1. Campsite ID Match
        if (p.campsite_id) {
            if (p.campsite_id === campsiteId) score += 100;
            else match = false;
        }

        // 2. Site Type Match
        if (p.site_type) {
            if (p.site_type === campsiteType) score += 50;
            else match = false;
        }

        // 3. Season Match
        if (p.start_month && p.end_month) {
            if (p.start_month <= p.end_month) {
                if (checkInMonth >= p.start_month && checkInMonth <= p.end_month) score += 20;
                else match = false;
            } else {
                if (checkInMonth >= p.start_month || checkInMonth <= p.end_month) score += 20;
                else match = false;
            }
        }

        return { policy: p, score, match };
    });

    const bestMatch = scoredPolicies
        .filter(p => p.match)
        .sort((a, b) => b.score - a.score)[0];

    return bestMatch ? bestMatch.policy : { name: 'Default' };
}

async function run() {
    console.log("Fetching policies...");
    const { data: policies } = await supabase.from('payment_policies').select('*');
    if (!policies) { console.error("No policies"); return; }

    console.log("Policies found:", policies.length);
    policies.forEach(p => console.log(`- ${p.name} (type: ${p.site_type})`));

    // Case A: RV Site
    const { data: rvSite } = await supabase.from('campsites').select('id, type').eq('type', 'rv').limit(1).single();
    if (rvSite) {
        console.log(`\nTesting RV Site (${rvSite.id}, type: ${rvSite.type})...`);
        const p = determinePaymentPolicy(policies, rvSite.id, rvSite.type, '2026-06-01');
        console.log("Result for RV:", p.name);
    }

    // Case B: Cabin Site
    const { data: cabinSite } = await supabase.from('campsites').select('id, type').eq('type', 'cabin').limit(1).single();
    if (cabinSite) {
        console.log(`\nTesting Cabin Site (${cabinSite.id}, type: ${cabinSite.type})...`);
        const p = determinePaymentPolicy(policies, cabinSite.id, cabinSite.type, '2026-06-01'); // Summer
        console.log("Result for Cabin (Summer):", p.name);

        // Check dates? Policy was 30 days before checkin vs season match.
        // My season logic only checks months.
    }
}

run();
