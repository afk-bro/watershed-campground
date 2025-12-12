
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes if present
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error("Could not read .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

console.log("URL:", supabaseUrl);
console.log("Key:", supabaseKey ? supabaseKey.substring(0, 10) + "..." : "MISSING");

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing connection...");
    const { data, error } = await supabase.from('reservations').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("Supabase Error:", error);
        process.exit(1);
    } else {
        console.log("Connection successful! Count:", data);
    }
}

testConnection();
