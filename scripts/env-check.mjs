#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Validates that all required environment variables from .env.example are present
 * in the current environment (.env.local for dev, .env.test for tests).
 *
 * Usage:
 *   npm run env:check              # Check .env.local (development)
 *   npm run env:check -- --test    # Check .env.test (testing)
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse command line args
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');

// Determine which env file to check
const envFile = isTestMode ? '.env.test' : '.env.local';
const envPath = join(rootDir, envFile);
const examplePath = join(rootDir, '.env.example');

console.log(`🔍 Validating ${envFile} against .env.example...\n`);

// Check if .env.example exists
if (!existsSync(examplePath)) {
    console.error('❌ .env.example not found!');
    process.exit(1);
}

// Check if target env file exists
if (!existsSync(envPath)) {
    console.error(`❌ ${envFile} not found!`);
    console.log(`\n💡 Copy .env.example to ${envFile} and fill in values:\n`);
    console.log(`   cp .env.example ${envFile}\n`);
    process.exit(1);
}

// Parse .env.example to extract required variables
function parseEnvFile(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const vars = new Map();
    const lines = content.split('\n');

    let inRequiredSection = false;
    let lastComment = '';

    for (const line of lines) {
        const trimmed = line.trim();

        // Track section headers
        if (trimmed.includes('# REQUIRED')) {
            inRequiredSection = true;
        } else if (trimmed.includes('# OPTIONAL') || trimmed.includes('# TEST-SPECIFIC')) {
            inRequiredSection = false;
        }

        // Track comments for next line
        if (trimmed.startsWith('#')) {
            lastComment = trimmed;
            continue;
        }

        // Skip empty lines
        if (trimmed === '') {
            lastComment = '';
            continue;
        }

        // Extract key from KEY=value format
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
        if (match) {
            const key = match[1];
            // Variable is required if:
            // 1. In REQUIRED section AND not marked Optional in inline/previous comment
            // 2. Explicitly marked as (REQUIRED) in comment
            const isOptional =
                lastComment.toLowerCase().includes('optional') ||
                trimmed.toLowerCase().includes('optional');
            const isExplicitlyRequired =
                lastComment.includes('(REQUIRED)') ||
                trimmed.includes('(REQUIRED)');

            const required = isExplicitlyRequired || (inRequiredSection && !isOptional);
            vars.set(key, { required });
            lastComment = '';
        }
    }

    return vars;
}

// Parse both files
const exampleVars = parseEnvFile(examplePath);
const currentVars = parseEnvFile(envPath);

// Also load actual environment to check runtime values
const dotenvPath = join(rootDir, envFile);
const envContent = readFileSync(dotenvPath, 'utf-8');
const loadedEnv = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
            loadedEnv[key.trim()] = valueParts.join('=').trim();
        }
    }
});

// Check for missing required variables
const missing = [];
const empty = [];
const optional = [];

for (const [key, meta] of exampleVars) {
    const hasKey = currentVars.has(key);
    const value = loadedEnv[key];
    const isEmpty = !value || value === '' || value.includes('your-') || value.includes('...');

    if (!hasKey) {
        if (meta.required) {
            missing.push(key);
        } else {
            optional.push(key);
        }
    } else if (isEmpty && meta.required) {
        empty.push(key);
    }
}

// Report results
let hasErrors = false;

if (missing.length > 0) {
    hasErrors = true;
    console.log('❌ Missing REQUIRED variables:\n');
    missing.forEach(key => console.log(`   ${key}`));
    console.log('');
}

if (empty.length > 0) {
    hasErrors = true;
    console.log('⚠️  REQUIRED variables with placeholder/empty values:\n');
    empty.forEach(key => console.log(`   ${key} = "${loadedEnv[key] || ''}"`));
    console.log('');
}

if (optional.length > 0 && !isTestMode) {
    console.log('ℹ️  Optional variables not set (features may be disabled):\n');
    optional.forEach(key => console.log(`   ${key}`));
    console.log('');
}

if (hasErrors) {
    console.log('💡 Fix the issues above by editing', envFile);
    console.log('📖 See .env.example for descriptions and examples\n');
    process.exit(1);
} else {
    console.log('✅ All required environment variables are set!\n');

    // Additional validation for specific keys
    const warnings = [];

    // Check org slug consistency
    const orgSlug = loadedEnv['NEXT_PUBLIC_ORG_SLUG'];
    const e2eOrgSlug = loadedEnv['E2E_ORG_SLUG'];
    if (isTestMode && e2eOrgSlug && orgSlug !== e2eOrgSlug) {
        warnings.push(`NEXT_PUBLIC_ORG_SLUG (${orgSlug}) doesn't match E2E_ORG_SLUG (${e2eOrgSlug})`);
    }

    // Check admin email format
    const adminEmails = loadedEnv['ADMIN_EMAILS'];
    if (adminEmails && !adminEmails.includes('@')) {
        warnings.push('ADMIN_EMAILS should contain valid email addresses');
    }

    if (warnings.length > 0) {
        console.log('⚠️  Warnings:\n');
        warnings.forEach(warning => console.log(`   ${warning}`));
        console.log('');
    }

    console.log('🎉 Environment validation passed!\n');
}
