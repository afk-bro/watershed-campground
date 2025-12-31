import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' }); // Use test env if available
dotenv.config(); // Fallback to .env

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!
);

async function checkDb() {
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('*');
    console.log('Organizations:', orgs);
    if (orgError) console.error('Org Error:', orgError);

    const { data: sites, error: siteError } = await supabase.from('campsites').select('id, code, organization_id').limit(5);
    console.log('Campsites (first 5):', sites);
    if (siteError) console.error('Site Error:', siteError);

    const { count, error: countError } = await supabase.from('campsites').select('*', { count: 'exact', head: true }).is('organization_id', null);
    console.log('Campsites with null organization_id:', count);
}

checkDb();
