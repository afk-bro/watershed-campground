#!/usr/bin/env node

/**
 * Automated check to ensure all admin API routes are either:
 * 1. Migrated (using requireAdminWithOrg)
 * 2. Guarded (using migrationGate)
 * 
 * This prevents accidentally adding new admin endpoints without proper tenant isolation.
 * 
 * Run: node scripts/check-admin-routes.js
 */

const fs = require('fs');
const path = require('path');

const ADMIN_API_DIR = path.join(__dirname, '../app/api/admin');

function getAllRouteFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getAllRouteFiles(filePath, fileList);
        } else if (file === 'route.ts' || file === 'route.js') {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function checkRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ADMIN_API_DIR, filePath);

    // Check if migrated (uses requireAdminWithOrg)
    const isMigrated = content.includes('requireAdminWithOrg');

    // Check if guarded (uses migrationGate)
    const isGuarded = content.includes('migrationGate');

    // Check if it's a legacy endpoint (uses requireAdmin without Org)
    const isLegacy = content.includes('requireAdmin') && !isMigrated;

    return {
        path: relativePath,
        isMigrated,
        isGuarded,
        isLegacy,
        isSafe: isMigrated || isGuarded
    };
}

function main() {
    console.log('🔍 Checking admin API routes for tenant safety...\n');

    const routeFiles = getAllRouteFiles(ADMIN_API_DIR);
    const results = routeFiles.map(checkRouteFile);

    const migrated = results.filter(r => r.isMigrated);
    const guarded = results.filter(r => r.isGuarded);
    const unsafe = results.filter(r => !r.isSafe);

    console.log(`✅ Migrated (requireAdminWithOrg): ${migrated.length}`);
    migrated.forEach(r => console.log(`   - ${r.path}`));

    console.log(`\n🛡️  Guarded (migrationGate): ${guarded.length}`);
    guarded.forEach(r => console.log(`   - ${r.path}`));

    if (unsafe.length > 0) {
        console.log(`\n❌ UNSAFE (no guard or migration): ${unsafe.length}`);
        unsafe.forEach(r => console.log(`   - ${r.path}`));
        console.log('\n⚠️  These endpoints are NOT safe for production!');
        console.log('   Add migrationGate() or migrate to requireAdminWithOrg()');
        process.exit(1);
    }

    console.log(`\n✅ All ${results.length} admin routes are safe!`);
    console.log(`   ${migrated.length} migrated, ${guarded.length} guarded`);
}

main();
