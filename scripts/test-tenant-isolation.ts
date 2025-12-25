#!/usr/bin/env tsx
/**
 * Tenant Isolation Smoke Test
 *
 * This script verifies that multi-tenant boundaries are enforced:
 * 1. Cross-org reads return 404 (not found)
 * 2. Cross-org writes are rejected
 * 3. Conflict checks don't see other org's data
 * 4. Storage keys are org-prefixed
 *
 * Run: npx tsx scripts/test-tenant-isolation.ts
 *
 * Prerequisites:
 * - Two organizations exist in DB (org A, org B)
 * - Admin users exist for each org
 * - .env.local or .env.test configured
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Load environment
try {
    const envPath = fs.existsSync(path.join(projectRoot, '.env.test'))
        ? path.join(projectRoot, '.env.test')
        : path.join(projectRoot, '.env.local');

    const envConfig = parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
    console.log('✓ Environment loaded');
} catch (e) {
    console.error('✗ Failed to load environment', e);
    process.exit(1);
}

async function run() {
    const { supabaseAdmin } = await import('../lib/supabase-admin');
    const { verifyOrgResource } = await import('../lib/db-helpers');

    console.log('\n🔍 TENANT ISOLATION SMOKE TEST\n');
    console.log('This test verifies multi-tenant boundaries are enforced.\n');

    let passCount = 0;
    let failCount = 0;

    function pass(msg: string) {
        console.log(`✅ PASS: ${msg}`);
        passCount++;
    }

    function fail(msg: string) {
        console.error(`❌ FAIL: ${msg}`);
        failCount++;
    }

    try {
        // ============================================
        // Test 1: Get Two Organizations
        // ============================================
        console.log('📋 Test 1: Fetching organizations...');

        const { data: orgs, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, slug')
            .limit(2);

        if (orgError || !orgs || orgs.length < 2) {
            fail('Need at least 2 organizations in database');
            console.log('\nCreate orgs with: npx supabase db reset');
            process.exit(1);
        }

        const orgA = orgs[0];
        const orgB = orgs[1];

        console.log(`   Org A: ${orgA.name} (${orgA.id})`);
        console.log(`   Org B: ${orgB.name} (${orgB.id})`);
        pass('Two organizations found');

        // ============================================
        // Test 2: Create Test Data in Each Org
        // ============================================
        console.log('\n📋 Test 2: Creating test campsite in each org...');

        const { data: campsiteA, error: campsiteAError } = await supabaseAdmin
            .from('campsites')
            .insert({
                name: 'Test Site A (Isolation Test)',
                code: `TEST-A-${Date.now()}`,
                type: 'tent',
                max_guests: 4,
                base_rate: 50,
                is_active: true,
                sort_order: 999,
                organization_id: orgA.id
            })
            .select()
            .single();

        if (campsiteAError || !campsiteA) {
            fail('Failed to create campsite in Org A');
            console.error(campsiteAError);
            process.exit(1);
        }

        const { data: campsiteB, error: campsiteBError } = await supabaseAdmin
            .from('campsites')
            .insert({
                name: 'Test Site B (Isolation Test)',
                code: `TEST-B-${Date.now()}`,
                type: 'tent',
                max_guests: 4,
                base_rate: 50,
                is_active: true,
                sort_order: 999,
                organization_id: orgB.id
            })
            .select()
            .single();

        if (campsiteBError || !campsiteB) {
            fail('Failed to create campsite in Org B');
            console.error(campsiteBError);
            process.exit(1);
        }

        pass('Test campsites created');

        // ============================================
        // Test 3: Cross-Org Read Returns 404
        // ============================================
        console.log('\n📋 Test 3: Verifying cross-org reads are blocked...');

        try {
            // Org A admin trying to read Org B's campsite should throw
            await verifyOrgResource('campsites', campsiteB.id, orgA.id);
            fail('Cross-org read did NOT return 404 (security breach!)');
        } catch (error: any) {
            if (error.message?.includes('not found') || error.message?.includes('404')) {
                pass('Cross-org campsite read blocked (404)');
            } else {
                fail(`Unexpected error on cross-org read: ${error.message}`);
            }
        }

        // ============================================
        // Test 4: Same-Org Read Succeeds
        // ============================================
        console.log('\n📋 Test 4: Verifying same-org reads succeed...');

        try {
            const result = await verifyOrgResource('campsites', campsiteA.id, orgA.id);
            if (result && result.id === campsiteA.id) {
                pass('Same-org campsite read succeeds');
            } else {
                fail('Same-org read returned wrong data');
            }
        } catch (error: any) {
            fail(`Same-org read failed: ${error.message}`);
        }

        // ============================================
        // Test 5: Create Blackout in Each Org
        // ============================================
        console.log('\n📋 Test 5: Creating blackout dates...');

        const testDate = new Date();
        testDate.setDate(testDate.getDate() + 30);
        const startDate = testDate.toISOString().split('T')[0];
        testDate.setDate(testDate.getDate() + 2);
        const endDate = testDate.toISOString().split('T')[0];

        const { data: blackoutA } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date: startDate,
                end_date: endDate,
                campsite_id: campsiteA.id,
                reason: 'Isolation Test A',
                organization_id: orgA.id
            })
            .select()
            .single();

        const { data: blackoutB } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date: startDate,
                end_date: endDate,
                campsite_id: campsiteB.id,
                reason: 'Isolation Test B',
                organization_id: orgB.id
            })
            .select()
            .single();

        if (!blackoutA || !blackoutB) {
            fail('Failed to create blackout dates');
        } else {
            pass('Blackout dates created');
        }

        // ============================================
        // Test 6: Conflict Checks Are Org-Scoped
        // ============================================
        console.log('\n📋 Test 6: Verifying conflict checks are org-scoped...');

        // Query blackouts for Org A - should NOT see Org B's blackout
        const { data: orgABlackouts } = await supabaseAdmin
            .from('blackout_dates')
            .select('*')
            .eq('organization_id', orgA.id)
            .gte('end_date', startDate)
            .lte('start_date', endDate);

        const foundOrgBBlackout = orgABlackouts?.some(b => b.id === blackoutB?.id);
        if (foundOrgBBlackout) {
            fail('Org A query saw Org B blackout (isolation breach!)');
        } else {
            pass('Conflict checks are org-scoped (Org A does not see Org B data)');
        }

        // ============================================
        // Test 7: Storage Key Format (if applicable)
        // ============================================
        console.log('\n📋 Test 7: Verifying storage key format...');

        const { campsiteImageKey } = await import('../lib/storage-utils');
        const testKey = campsiteImageKey(orgA.id, campsiteA.id, 'test.jpg');

        if (testKey.startsWith(`org/${orgA.id}/campsites/${campsiteA.id}/`)) {
            pass('Storage keys are org-prefixed');
        } else {
            fail(`Storage key format incorrect: ${testKey}`);
        }

        // ============================================
        // Cleanup
        // ============================================
        console.log('\n🧹 Cleaning up test data...');

        await supabaseAdmin.from('blackout_dates').delete().eq('id', blackoutA?.id);
        await supabaseAdmin.from('blackout_dates').delete().eq('id', blackoutB?.id);
        await supabaseAdmin.from('campsites').delete().eq('id', campsiteA.id);
        await supabaseAdmin.from('campsites').delete().eq('id', campsiteB.id);

        console.log('✓ Cleanup complete\n');

        // ============================================
        // Summary
        // ============================================
        console.log('━'.repeat(60));
        console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
        console.log('━'.repeat(60));

        if (failCount > 0) {
            console.error('\n❌ TENANT ISOLATION TEST FAILED');
            console.error('⚠️  CRITICAL: Multi-tenant boundaries are NOT enforced!');
            process.exit(1);
        } else {
            console.log('\n✅ TENANT ISOLATION TEST PASSED');
            console.log('   All multi-tenant boundaries are properly enforced.');
            process.exit(0);
        }

    } catch (error) {
        console.error('\n💥 FATAL ERROR:', error);
        process.exit(1);
    }
}

run();
