#!/usr/bin/env tsx
/**
 * Production Readiness Audit Script
 *
 * Checks critical production requirements:
 * 1. Organization scoping in admin APIs
 * 2. Rate limiting configuration
 * 3. Error handling consistency
 * 4. Logging for admin mutations
 */

import * as fs from 'fs';
import * as path from 'path';

// Helper function to recursively find files
function findFiles(dir: string, pattern: RegExp, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.startsWith('.')) {
        findFiles(filePath, pattern, fileList);
      }
    } else if (pattern.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

interface AuditResult {
  category: string;
  passed: boolean;
  message: string;
  file?: string;
  line?: number;
}

const results: AuditResult[] = [];

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// =============================================================================
// 1. Organization Scoping Audit
// =============================================================================

async function auditOrganizationScoping() {
  log('blue', '\n📋 Auditing Organization Scoping...\n');

  const adminRoutes = findFiles('app/api/admin', /route\.ts$/);

  for (const file of adminRoutes) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Check for withAdminAuth wrapper
    const hasAdminAuth = content.includes('withAdminAuth');

    // Check for organization_id scoping in queries
    const hasOrgScoping = content.includes('.eq(\'organization_id\'') ||
      content.includes('organization_id:');

    // Check for GET/POST/PATCH/DELETE handlers
    const hasHandlers = /export\s+const\s+(GET|POST|PATCH|DELETE)\s*=/.test(content);

    if (hasHandlers) {
      if (!hasAdminAuth) {
        results.push({
          category: 'Organization Scoping',
          passed: false,
          message: `Missing withAdminAuth wrapper`,
          file: file.replace(process.cwd() + '/', ''),
        });
      } else if (!hasOrgScoping) {
        // Check if it's a mutation endpoint (POST/PATCH/DELETE)
        const hasMutations = /export\s+const\s+(POST|PATCH|DELETE)\s*=/.test(content);

        if (hasMutations) {
          results.push({
            category: 'Organization Scoping',
            passed: false,
            message: `Mutation endpoint may be missing org scoping`,
            file: file.replace(process.cwd() + '/', ''),
          });
        }
      } else {
        results.push({
          category: 'Organization Scoping',
          passed: true,
          message: `Properly scoped with organization_id`,
          file: file.replace(process.cwd() + '/', ''),
        });
      }
    }
  }
}

// =============================================================================
// 2. Rate Limiting Audit
// =============================================================================

async function auditRateLimiting() {
  log('blue', '\n⏱️  Auditing Rate Limiting...\n');

  // Check if rate limiting is configured
  const rateLimitFile = 'lib/rate-limit-upstash.ts';

  if (!fs.existsSync(rateLimitFile)) {
    results.push({
      category: 'Rate Limiting',
      passed: false,
      message: 'Rate limiting module not found',
    });
    return;
  }

  const content = fs.readFileSync(rateLimitFile, 'utf-8');

  // Check for fail-open behavior
  const hasFailOpen = content.includes('success: true') &&
    content.includes('catch');

  if (hasFailOpen) {
    results.push({
      category: 'Rate Limiting',
      passed: true,
      message: 'Rate limiting has fail-open behavior (intentional)',
      file: rateLimitFile,
    });
  }

  // Check critical endpoints for rate limiting
  const criticalEndpoints = [
    'app/api/reservation/route.ts',
    'app/api/create-payment-intent/route.ts',
    'app/api/contact/route.ts',
  ];

  for (const endpoint of criticalEndpoints) {
    if (fs.existsSync(endpoint)) {
      const endpointContent = fs.readFileSync(endpoint, 'utf-8');
      const hasRateLimit = endpointContent.includes('checkRateLimit') ||
        endpointContent.includes('rateLimiters');

      results.push({
        category: 'Rate Limiting',
        passed: hasRateLimit,
        message: hasRateLimit
          ? 'Rate limiting enabled'
          : 'Missing rate limiting',
        file: endpoint,
      });
    }
  }
}

// =============================================================================
// 3. Error Handling Audit
// =============================================================================

async function auditErrorHandling() {
  log('blue', '\n🚨 Auditing Error Handling...\n');

  const apiRoutes = findFiles('app/api', /route\.ts$/);

  for (const file of apiRoutes) {
    const content = fs.readFileSync(file, 'utf-8');

    // Check for stack trace leakage
    const leaksStackTrace = content.includes('error.stack') &&
      !content.includes('NODE_ENV') &&
      !content.includes('production');

    if (leaksStackTrace) {
      results.push({
        category: 'Error Handling',
        passed: false,
        message: 'Potential stack trace leak in production',
        file: file.replace(process.cwd() + '/', ''),
      });
    }

    // Check for consistent error shape
    const hasErrorResponse = content.includes('NextResponse.json') &&
      content.includes('error');

    const hasInconsistentErrors = content.includes('return {') &&
      content.includes('error') &&
      !content.includes('NextResponse.json');

    if (hasInconsistentErrors) {
      results.push({
        category: 'Error Handling',
        passed: false,
        message: 'Inconsistent error response format',
        file: file.replace(process.cwd() + '/', ''),
      });
    } else if (hasErrorResponse) {
      results.push({
        category: 'Error Handling',
        passed: true,
        message: 'Consistent error response format',
        file: file.replace(process.cwd() + '/', ''),
      });
    }
  }
}

// =============================================================================
// 4. Logging Audit
// =============================================================================

async function auditLogging() {
  log('blue', '\n📝 Auditing Logging for Admin Mutations...\n');

  const adminMutationEndpoints = [
    'app/api/admin/reservations/[id]/assign/route.ts',
    'app/api/admin/blackout-dates/route.ts',
    'app/api/admin/blackout-dates/[id]/route.ts',
    'app/api/admin/reservations/[id]/route.ts',
  ];

  for (const file of adminMutationEndpoints) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for logger usage
      const hasLogger = content.includes('logger.') ||
        content.includes('console.log') ||
        content.includes('console.error');

      // Check for audit log creation
      const hasAuditLog = content.includes('audit_logs') ||
        content.includes('createAuditLog');

      results.push({
        category: 'Logging',
        passed: hasLogger && hasAuditLog,
        message: hasLogger && hasAuditLog
          ? 'Has logging and audit trail'
          : hasLogger
            ? 'Has logging but missing audit trail'
            : 'Missing logging',
        file: file.replace(process.cwd() + '/', ''),
      });
    }
  }
}

// =============================================================================
// Report Generation
// =============================================================================

function generateReport() {
  log('blue', '\n' + '='.repeat(80));
  log('blue', 'PRODUCTION READINESS AUDIT REPORT');
  log('blue', '='.repeat(80) + '\n');

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.passed).length;
    const total = categoryResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    log('blue', `\n📊 ${category}: ${passed}/${total} (${percentage}%)`);
    log('blue', '-'.repeat(80));

    for (const result of categoryResults) {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? 'green' : 'red';
      const fileInfo = result.file ? ` [${result.file}]` : '';

      log(color, `${icon} ${result.message}${fileInfo}`);
    }
  }

  // Summary
  const totalPassed = results.filter(r => r.passed).length;
  const totalChecks = results.length;
  const overallPercentage = ((totalPassed / totalChecks) * 100).toFixed(1);

  log('blue', '\n' + '='.repeat(80));
  log('blue', `OVERALL: ${totalPassed}/${totalChecks} checks passed (${overallPercentage}%)`);
  log('blue', '='.repeat(80) + '\n');

  // Critical issues
  const criticalIssues = results.filter(r =>
    !r.passed &&
    (r.category === 'Organization Scoping' || r.category === 'Rate Limiting')
  );

  if (criticalIssues.length > 0) {
    log('red', '\n🚨 CRITICAL ISSUES FOUND:');
    for (const issue of criticalIssues) {
      log('red', `   • ${issue.message} [${issue.file}]`);
    }
    log('red', '');
  }

  // Exit with error code if critical issues found
  if (criticalIssues.length > 0) {
    process.exit(1);
  }
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  log('blue', '\n🔍 Starting Production Readiness Audit...\n');

  await auditOrganizationScoping();
  await auditRateLimiting();
  await auditErrorHandling();
  await auditLogging();

  generateReport();
}

main().catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
