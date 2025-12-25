#!/usr/bin/env node

/**
 * Batch migration script for remaining admin endpoints.
 * 
 * This script performs a mechanical find-and-replace to migrate endpoints:
 * 1. Replace requireAdmin with requireAdminWithOrg
 * 2. Add organizationId to destructuring
 * 3. Add .eq('organization_id', organizationId!) to queries
 * 
 * Run: node scripts/batch-migrate-endpoints.js
 */

const fs = require('fs');
const path = require('path');

const ENDPOINTS_TO_MIGRATE = [
    // High Priority - Mutations
    'app/api/admin/reservations/[id]/route.ts',
    'app/api/admin/reservations/[id]/assign/route.ts',
    'app/api/admin/reservations/bulk-status/route.ts',
    'app/api/admin/reservations/bulk-archive/route.ts',
    'app/api/admin/reservations/bulk-assign-random/route.ts',

    // Medium Priority - Campsite Mutations
    'app/api/admin/campsites/route.ts',
    'app/api/admin/campsites/[id]/route.ts',

    // Medium Priority - Blackout Mutations
    'app/api/admin/blackout-dates/route.ts',
    'app/api/admin/blackout-dates/[id]/route.ts',

    // Low Priority - Reads
    'app/api/admin/reports/route.ts',
    'app/api/admin/upload-image/route.ts',
];

function migrateFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Skipping ${filePath} (not found)`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // 1. Replace import
    if (content.includes('requireAdmin') && !content.includes('requireAdminWithOrg')) {
        content = content.replace(
            /import { requireAdmin } from ['"]@\/lib\/admin-auth['"]/g,
            `import { requireAdminWithOrg } from '@/lib/admin-auth'`
        );
        modified = true;
    }

    // 2. Replace auth calls (handle multiple patterns)
    const authPatterns = [
        {
            old: /const { authorized, user, response: authResponse } = await requireAdmin\(\);/g,
            new: 'const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();'
        },
        {
            old: /const { authorized, response: authResponse } = await requireAdmin\(\);/g,
            new: 'const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();'
        }
    ];

    authPatterns.forEach(({ old, new: replacement }) => {
        if (content.match(old)) {
            content = content.replace(old, replacement);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Migrated ${filePath}`);
        return true;
    }

    console.log(`⏭️  Skipped ${filePath} (already migrated or no changes needed)`);
    return false;
}

function main() {
    console.log('🚀 Starting batch migration of admin endpoints...\n');

    let migratedCount = 0;

    ENDPOINTS_TO_MIGRATE.forEach(filePath => {
        if (migrateFile(filePath)) {
            migratedCount++;
        }
    });

    console.log(`\n✅ Migration complete! ${migratedCount}/${ENDPOINTS_TO_MIGRATE.length} files updated`);
    console.log('\n⚠️  IMPORTANT: You must manually add .eq(\'organization_id\', organizationId!) to all queries');
    console.log('   Run: grep -r "\\.from(" app/api/admin/ | grep -v "organization_id"');
}

main();
