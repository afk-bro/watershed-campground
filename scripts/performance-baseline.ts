#!/usr/bin/env tsx
/**
 * Performance Baseline Script
 *
 * Measures response times (P50/P95/P99) and payload sizes for critical endpoints.
 * Saves results to JSON artifact for tracking performance regressions over time.
 *
 * Usage:
 *   # Test against local dev server
 *   npm run dev (in separate terminal)
 *   tsx scripts/performance-baseline.ts
 *
 *   # Test against staging
 *   BASE_URL=https://staging.example.com tsx scripts/performance-baseline.ts
 *
 *   # Compare runs
 *   diff results/baseline-2025-01-01.json results/baseline-2025-01-15.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS || '20'); // Per endpoint
const RESULTS_DIR = 'performance-results';

// Critical endpoints to test
const ENDPOINTS = [
  // Public endpoints
  {
    name: 'Home Page',
    method: 'GET',
    path: '/',
    category: 'public',
  },
  {
    name: 'Rates Page',
    method: 'GET',
    path: '/rates',
    category: 'public',
  },
  {
    name: 'Availability Check',
    method: 'POST',
    path: '/api/availability',
    category: 'public-api',
    body: {
      checkIn: '2025-06-01',
      checkOut: '2025-06-07',
      adults: 2,
      children: 0,
      campingUnit: 'RV / Trailer',
    },
  },

  // Admin endpoints (require auth)
  {
    name: 'Admin Calendar',
    method: 'GET',
    path: '/api/admin/calendar?year=2025&month=6',
    category: 'admin-api',
    requiresAuth: true,
  },
  {
    name: 'Admin Reservations List',
    method: 'GET',
    path: '/api/admin/reservations',
    category: 'admin-api',
    requiresAuth: true,
  },
  {
    name: 'Admin Campsites List',
    method: 'GET',
    path: '/api/admin/campsites',
    category: 'admin-api',
    requiresAuth: true,
  },
  {
    name: 'Admin Audit Logs',
    method: 'GET',
    path: '/api/admin/audit-logs?limit=50',
    category: 'admin-api',
    requiresAuth: true,
  },
  {
    name: 'Admin Availability Calendar',
    method: 'GET',
    path: '/api/admin/availability/calendar?year=2025&month=6',
    category: 'admin-api',
    requiresAuth: true,
  },
] as const;

// ============================================================================
// Types
// ============================================================================

interface RequestResult {
  duration: number; // milliseconds
  status: number;
  size: number; // bytes
  error?: string;
}

interface EndpointStats {
  name: string;
  method: string;
  path: string;
  category: string;
  requests: number;
  successful: number;
  failed: number;
  duration: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
    mean: number;
  };
  size: {
    p50: number;
    p95: number;
    max: number;
    mean: number;
  };
}

interface BaselineReport {
  timestamp: string;
  baseUrl: string;
  numRequests: number;
  endpoints: EndpointStats[];
  summary: {
    totalEndpoints: number;
    totalRequests: number;
    totalSuccessful: number;
    totalFailed: number;
    averageP95Duration: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate percentile from sorted array
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate mean
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Fetch with timing
 */
async function timedFetch(
  url: string,
  options: RequestInit
): Promise<RequestResult> {
  const start = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const text = await response.text();
    const end = performance.now();

    return {
      duration: end - start,
      status: response.status,
      size: new Blob([text]).size,
    };
  } catch (error) {
    const end = performance.now();
    return {
      duration: end - start,
      status: 0,
      size: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get admin auth token (for authenticated endpoints)
 */
async function getAdminAuthToken(): Promise<string | null> {
  // Try to read from .env.test
  const envPath = path.join(process.cwd(), '.env.test');
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  No .env.test found - skipping authenticated endpoints');
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const emailMatch = envContent.match(/TEST_ADMIN_EMAIL=(.+)/);
  const passwordMatch = envContent.match(/TEST_ADMIN_PASSWORD=(.+)/);

  if (!emailMatch || !passwordMatch) {
    console.warn('⚠️  TEST_ADMIN_EMAIL/PASSWORD not found - skipping authenticated endpoints');
    return null;
  }

  const email = emailMatch[1].trim();
  const password = passwordMatch[1].trim();

  // Authenticate
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      console.warn('⚠️  Failed to authenticate - skipping authenticated endpoints');
      return null;
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.warn('⚠️  Auth error - skipping authenticated endpoints:', error);
    return null;
  }
}

/**
 * Test a single endpoint
 */
async function testEndpoint(
  endpoint: typeof ENDPOINTS[number],
  authToken: string | null
): Promise<EndpointStats> {
  console.log(`\n🔍 Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);

  const results: RequestResult[] = [];
  const url = `${BASE_URL}${endpoint.path}`;

  const headers: Record<string, string> = {};
  if (endpoint.requiresAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Run requests
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const result = await timedFetch(url, {
      method: endpoint.method,
      headers,
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });

    results.push(result);

    // Progress indicator
    if ((i + 1) % 5 === 0) {
      process.stdout.write('.');
    }
  }

  console.log(''); // newline after progress dots

  // Calculate stats
  const successful = results.filter(r => r.status >= 200 && r.status < 300);
  const failed = results.filter(r => r.status === 0 || r.status >= 400);

  const durations = successful.map(r => r.duration);
  const sizes = successful.map(r => r.size);

  const stats: EndpointStats = {
    name: endpoint.name,
    method: endpoint.method,
    path: endpoint.path,
    category: endpoint.category,
    requests: NUM_REQUESTS,
    successful: successful.length,
    failed: failed.length,
    duration: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      max: Math.max(...durations, 0),
      mean: mean(durations),
    },
    size: {
      p50: percentile(sizes, 50),
      p95: percentile(sizes, 95),
      max: Math.max(...sizes, 0),
      mean: mean(sizes),
    },
  };

  // Print summary
  console.log(`  ✅ Success: ${successful.length}/${NUM_REQUESTS}`);
  console.log(`  ⏱️  Duration: P50=${stats.duration.p50.toFixed(0)}ms, P95=${stats.duration.p95.toFixed(0)}ms, P99=${stats.duration.p99.toFixed(0)}ms`);
  console.log(`  📦 Size: P50=${(stats.size.p50 / 1024).toFixed(1)}KB, P95=${(stats.size.p95 / 1024).toFixed(1)}KB`);

  if (failed.length > 0) {
    console.log(`  ❌ Failed: ${failed.length}`);
  }

  return stats;
}

/**
 * Save results to JSON
 */
function saveResults(report: BaselineReport): void {
  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `baseline-${timestamp}.json`;
  const filepath = path.join(RESULTS_DIR, filename);

  // Write JSON
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

  console.log(`\n💾 Results saved to: ${filepath}`);
}

/**
 * Print summary report
 */
function printSummary(report: BaselineReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE BASELINE SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n📊 Overall:`);
  console.log(`  Endpoints: ${report.summary.totalEndpoints}`);
  console.log(`  Total Requests: ${report.summary.totalRequests}`);
  console.log(`  Successful: ${report.summary.totalSuccessful} (${((report.summary.totalSuccessful / report.summary.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${report.summary.totalFailed}`);
  console.log(`  Average P95 Duration: ${report.summary.averageP95Duration.toFixed(0)}ms`);

  console.log(`\n⚡ Top 3 Slowest Endpoints (P95):`);
  const slowest = [...report.endpoints]
    .sort((a, b) => b.duration.p95 - a.duration.p95)
    .slice(0, 3);

  slowest.forEach((endpoint, i) => {
    console.log(`  ${i + 1}. ${endpoint.name}: ${endpoint.duration.p95.toFixed(0)}ms`);
  });

  console.log(`\n📦 Top 3 Largest Payloads (P95):`);
  const largest = [...report.endpoints]
    .sort((a, b) => b.size.p95 - a.size.p95)
    .slice(0, 3);

  largest.forEach((endpoint, i) => {
    console.log(`  ${i + 1}. ${endpoint.name}: ${(endpoint.size.p95 / 1024).toFixed(1)}KB`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 Performance Baseline Test');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Requests per endpoint: ${NUM_REQUESTS}`);

  // Get auth token for admin endpoints
  const authToken = await getAdminAuthToken();
  if (!authToken) {
    console.log('   ⚠️  Running without authentication (admin endpoints will be skipped)');
  }

  // Test each endpoint
  const endpointStats: EndpointStats[] = [];

  for (const endpoint of ENDPOINTS) {
    // Skip auth-required endpoints if no token
    if (endpoint.requiresAuth && !authToken) {
      console.log(`\n⏭️  Skipping: ${endpoint.name} (requires auth)`);
      continue;
    }

    const stats = await testEndpoint(endpoint, authToken);
    endpointStats.push(stats);
  }

  // Build report
  const report: BaselineReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    numRequests: NUM_REQUESTS,
    endpoints: endpointStats,
    summary: {
      totalEndpoints: endpointStats.length,
      totalRequests: endpointStats.reduce((sum, e) => sum + e.requests, 0),
      totalSuccessful: endpointStats.reduce((sum, e) => sum + e.successful, 0),
      totalFailed: endpointStats.reduce((sum, e) => sum + e.failed, 0),
      averageP95Duration: mean(endpointStats.map(e => e.duration.p95)),
    },
  };

  // Save and print
  saveResults(report);
  printSummary(report);
}

main().catch((error) => {
  console.error('❌ Performance test failed:', error);
  process.exit(1);
});
