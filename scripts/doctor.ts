#!/usr/bin/env tsx
/**
 * QA Kit Doctor Script
 *
 * Validates environment setup and connectivity for E2E testing.
 * Run this first when troubleshooting bootstrap/test failures.
 *
 * Usage:
 *   pnpm qa:doctor
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// =============================================================================
// Check Functions
// =============================================================================

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

async function checkEnvVar(name: string, required: boolean = true): Promise<CheckResult> {
  const value = process.env[name];
  if (value) {
    // Mask sensitive values
    const displayValue = name.includes('SECRET') || name.includes('PASSWORD')
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      : value;
    return {
      name: `ENV: ${name}`,
      status: 'pass',
      message: `Set to: ${displayValue}`,
    };
  }
  return {
    name: `ENV: ${name}`,
    status: required ? 'fail' : 'warn',
    message: required ? 'Required but not set' : 'Optional, not set',
  };
}

async function checkUrlReachable(name: string, url: string): Promise<CheckResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      name,
      status: 'pass',
      message: `Reachable (HTTP ${response.status})`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name,
      status: 'fail',
      message: `Not reachable: ${message}`,
    };
  }
}

async function checkE2EEndpoint(): Promise<CheckResult> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const secret = process.env.E2E_BOOTSTRAP_SECRET;

  if (!apiBaseUrl || !secret) {
    return {
      name: 'E2E Health Check',
      status: 'fail',
      message: 'Missing API_BASE_URL or E2E_BOOTSTRAP_SECRET',
    };
  }

  // Normalize URL
  let normalizedUrl = apiBaseUrl.replace(/\/$/, '');
  if (!normalizedUrl.endsWith('/api')) {
    normalizedUrl = `${normalizedUrl}/api`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${normalizedUrl}/e2e/health`, {
      method: 'GET',
      headers: {
        'X-E2E-Secret': secret,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 200) {
      const data = await response.json();
      return {
        name: 'E2E Health Check',
        status: data.e2eEnabled ? 'pass' : 'warn',
        message: data.e2eEnabled
          ? 'E2E endpoints are enabled and reachable'
          : 'E2E endpoints reachable but E2E_ENABLED=false on backend',
      };
    }

    if (response.status === 403) {
      return {
        name: 'E2E Health Check',
        status: 'fail',
        message: 'Secret mismatch - check E2E_BOOTSTRAP_SECRET matches backend',
      };
    }

    if (response.status === 404) {
      return {
        name: 'E2E Health Check',
        status: 'fail',
        message: 'E2E endpoints not found - ensure E2E_ENABLED=true on backend',
      };
    }

    return {
      name: 'E2E Health Check',
      status: 'fail',
      message: `Unexpected response: HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'E2E Health Check',
      status: 'fail',
      message: `Failed: ${message}`,
    };
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('\n🩺 QA Kit Doctor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: CheckResult[] = [];

  // Environment variable checks
  console.log('Checking environment variables...\n');
  results.push(await checkEnvVar('APP_BASE_URL', true));
  results.push(await checkEnvVar('API_BASE_URL', true));
  results.push(await checkEnvVar('E2E_BOOTSTRAP_SECRET', true));
  results.push(await checkEnvVar('E2E_PETER_EMAIL', true));
  results.push(await checkEnvVar('E2E_PETER_PASSWORD', true));
  results.push(await checkEnvVar('VRT_API_URL', false));
  results.push(await checkEnvVar('VRT_PROJECT', false));

  // Connectivity checks
  console.log('Checking connectivity...\n');
  const appUrl = process.env.APP_BASE_URL;
  const apiUrl = process.env.API_BASE_URL;

  if (appUrl) {
    results.push(await checkUrlReachable('App Base URL', appUrl));
  }

  if (apiUrl) {
    // Normalize and check API health
    let normalizedApiUrl = apiUrl.replace(/\/$/, '');
    if (!normalizedApiUrl.endsWith('/api')) {
      normalizedApiUrl = `${normalizedApiUrl}/api`;
    }
    results.push(await checkUrlReachable('API Base URL', normalizedApiUrl));
  }

  // E2E endpoint check
  console.log('Checking E2E endpoints...\n');
  results.push(await checkE2EEndpoint());

  // Print results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Results:\n');

  let hasFailures = false;
  let hasWarnings = false;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}\n`);

    if (result.status === 'fail') hasFailures = true;
    if (result.status === 'warn') hasWarnings = true;
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (hasFailures) {
    console.log('❌ Some checks failed. Fix the issues above before running tests.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Some checks have warnings. Tests may work but review above.\n');
    process.exit(0);
  } else {
    console.log('✅ All checks passed! Ready to run E2E tests.\n');
    console.log('Next steps:');
    console.log('  pnpm qa:bootstrap peter');
    console.log('  pnpm qa:run peter --headed');
    console.log('');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
