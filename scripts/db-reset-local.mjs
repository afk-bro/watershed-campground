#!/usr/bin/env node

/**
 * Cross-platform E2E database reset script
 * Works on Windows, macOS, and Linux
 */

import { spawn } from 'child_process';
import { platform } from 'os';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const isWindows = platform() === 'win32';

/**
 * Run a command and stream output
 */
function run(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows, // Use shell on Windows for better compatibility
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  console.log('\n🔄 Resetting local database with E2E seed data...\n');

  try {
    // Step 1: Print safety banner
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚨 LOCAL RESET MODE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Target: ${DB_URL}`);
    console.log(`🖥️  Platform: ${platform()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 2: Run db reset (migrations + safe seed.sql)
    console.log('  → Running migrations and safe seed...');
    await run('npx', ['supabase', 'db', 'reset']);

    // Step 3: Run destructive local seed (truncate + reload)
    console.log('\n  → Running local destructive seed (truncate + reload)...');

    const psqlCommand = isWindows ? 'psql.exe' : 'psql';

    // Run seed.local.sql
    await run(psqlCommand, [
      DB_URL,
      '-f', 'supabase/seed.local.sql'
    ]);

    // Run seed.sql again
    await run(psqlCommand, [
      DB_URL,
      '-f', 'supabase/seed.sql'
    ]);

    console.log('\n✅ Database reset complete!\n');
    console.log('Test data loaded:');
    console.log('  - 7 campsites (S1-S5, C1-C2)');
    console.log('  - 3 reservations (John Doe, Jane Smith, Bob Johnson)');
    console.log('  - 1 admin user (admin@test.com / testpass123)\n');

  } catch (error) {
    console.error('\n❌ Database reset failed!');
    console.error(error.message);
    process.exit(1);
  }
}

main();
