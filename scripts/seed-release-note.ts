#!/usr/bin/env tsx
/**
 * Seed Release Note Script
 *
 * Seeds a release note for testing the "What's New" feature.
 *
 * Usage:
 *   pnpm qa:whatsnew peter
 *   node scripts/seed-release-note.ts --title "New Feature" --body "Description"
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { getAdapter } from '../adapters/index.js';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  title: string;
  body: string;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    title: '',
    body: '',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--title' || arg === '-t') {
      result.title = args[++i] || '';
    } else if (arg === '--body' || arg === '-b') {
      result.body = args[++i] || '';
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Seed Release Note Script

Seeds a release note for testing the "What's New" notification feature.

USAGE:
  node scripts/seed-release-note.ts [options]

OPTIONS:
  --title, -t     Release note title
  --body, -b      Release note body (markdown supported)
  --help, -h      Show this help message

EXAMPLES:
  # Seed with default content
  node scripts/seed-release-note.ts

  # Seed with custom content
  node scripts/seed-release-note.ts --title "January Update" --body "New features..."

The script will create a release note via the E2E test API endpoint.
`);
}

// =============================================================================
// Main Logic
// =============================================================================

async function seedReleaseNote(title: string, body: string): Promise<void> {
  console.log('\n📝 Seed Release Note');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const adapter = getAdapter();

  // Use defaults if not provided
  const releaseTitle = title || `Test Release - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  const releaseBody = body || `
## What's New

- **Feature Enhancement**: Improved dashboard performance
- **Bug Fix**: Fixed issue with invoice generation
- **New Feature**: Added export to CSV functionality

## Improvements

- Better mobile responsiveness
- Faster page load times
- Enhanced accessibility

---

This is a test release note seeded for E2E testing purposes.
`.trim();

  console.log(`Title: ${releaseTitle}`);
  console.log(`Body: ${releaseBody.slice(0, 100)}...`);
  console.log('');

  try {
    const releaseId = await adapter.seedReleaseNote(releaseTitle, releaseBody);

    console.log('✅ Release note seeded successfully!');
    console.log(`   ID: ${releaseId}`);
    console.log('');
    console.log('The "What\'s New" badge should now appear for users who haven\'t seen this release.');
    console.log('');

  } catch (error) {
    console.error('❌ Failed to seed release note:', error);
    console.log('');
    console.log('Make sure:');
    console.log('  1. The backend is running');
    console.log('  2. E2E_BOOTSTRAP_SECRET is set correctly');
    console.log('  3. The /api/e2e/seed-release-note endpoint is implemented');
    console.log('');
    process.exit(1);
  }
}

// =============================================================================
// Entry Point
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  await seedReleaseNote(args.title, args.body);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
