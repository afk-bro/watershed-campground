import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';
import { fileURLToPath } from 'url';

// Use standard Node APIs since we are in tsx
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Load .env.local
console.log('Loading env from:', path.join(projectRoot, '.env.local'));
try {
    const envConfig = parse(fs.readFileSync(path.join(projectRoot, '.env.local')));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
    console.log('Supabase URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch (e) {
    console.error('Failed to load .env.local', e);
}


async function run() {
    // Dynamic import to ensure env is ready
    const { checkAvailability } = await import('../lib/availability/engine');
    const { supabaseAdmin } = await import('../lib/supabase-admin');

    console.log('Fetching first active campsite...');
    const { data: campsites, error } = await supabaseAdmin
        .from('campsites')
        .select('id, name, organization_id')
        .eq('is_active', true)
        .limit(1);

    if (error) {
        console.error('Supabase error:', error);
        return;
    }

    if (!campsites || campsites.length === 0) {
        console.error('No active campsites found');
        return;
    }

    const site = campsites[0];
    console.log(`Testing with site: ${site.name} (${site.id})`);
    console.log(`Organization ID: ${site.organization_id}`);

    // Test "Today" to "Tomorrow"
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 2); // 2 night stay to be safe

    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];

    console.log(`Checking dates: ${checkIn} to ${checkOut}`);

    try {
        const result = await checkAvailability({
            checkIn,
            checkOut,
            guestCount: 1,
            campsiteId: site.id,
            organizationId: site.organization_id // REQUIRED for new engine
        });

        console.log('Result:', result);
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
