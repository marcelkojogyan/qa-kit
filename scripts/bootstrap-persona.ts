#!/usr/bin/env tsx
/**
 * Bootstrap Persona Script
 *
 * Creates or updates a persona in the system.
 * Idempotent - safe to run multiple times.
 *
 * Usage:
 *   pnpm qa:bootstrap peter
 *   pnpm qa:bootstrap --id peter --force
 *   pnpm qa:bootstrap peter --skip-seed
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getAdapter } from '../adapters/index.js';
import { getPersona, hasPersona } from '../personas/index.js';
import type { PersonaProfile } from '../adapters/base.adapter.js';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// =============================================================================
// Persona Profile Persistence
// =============================================================================

const PROFILE_DIR = path.resolve(__dirname, '../storage-state');

function getProfilePath(personaId: string): string {
  return path.join(PROFILE_DIR, `persona-profile.${personaId}.json`);
}

function savePersonaProfile(profile: PersonaProfile & { seeded?: Record<string, number> }): void {
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }
  const filePath = getProfilePath(profile.personaId);
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
  console.log(`[Profile] Saved to ${filePath}`);
}

function loadPersonaProfile(personaId: string): (PersonaProfile & { seeded?: Record<string, number> }) | null {
  const filePath = getProfilePath(personaId);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  personaId: string;
  force: boolean;
  skipSeed: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    personaId: '',
    force: false,
    skipSeed: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if (arg === '--skip-seed' || arg === '--no-seed') {
      result.skipSeed = true;
    } else if (arg === '--id' || arg === '-i') {
      result.personaId = args[++i] || '';
    } else if (!arg.startsWith('-')) {
      result.personaId = arg;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Bootstrap Persona Script

Creates or updates a test persona in the application.

USAGE:
  pnpm qa:bootstrap <persona-id> [options]

ARGUMENTS:
  <persona-id>    The ID of the persona to bootstrap (e.g., "peter")

OPTIONS:
  --id, -i        Specify persona ID explicitly
  --force, -f     Force re-creation even if persona exists
  --skip-seed     Skip data seeding (bootstrap user/org only)
  --help, -h      Show this help message

EXAMPLES:
  pnpm qa:bootstrap peter
  pnpm qa:bootstrap --id peter --force
  pnpm qa:bootstrap peter --skip-seed
  pnpm qa:bootstrap mary

AVAILABLE PERSONAS:
  peter           Power user persona (large dataset)

The script will:
  1. Check if persona is already bootstrapped
  2. Create user account if needed
  3. Create organization if needed
  4. Seed initial data based on persona's seedProfile
  5. Update persona_profiles table
  6. Persist profile locally for test runs
`);
}

// =============================================================================
// Main Bootstrap Logic
// =============================================================================

async function bootstrapPersona(personaId: string, force: boolean, skipSeed: boolean): Promise<void> {
  console.log('\n🚀 Bootstrap Persona');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate persona exists
  if (!hasPersona(personaId)) {
    console.error(`❌ Persona "${personaId}" not found.`);
    console.log('\nAvailable personas:');

    // Import and list all personas
    const { getAllPersonas } = await import('../personas/index.js');
    const personas = getAllPersonas();
    personas.forEach(p => {
      console.log(`  - ${p.id}: ${p.displayName} (${p.targetLifecycle})`);
    });

    process.exit(1);
  }

  const persona = getPersona(personaId);
  const adapter = getAdapter();

  console.log(`Persona: ${persona.displayName} (${persona.id})`);
  console.log(`Email: ${persona.email}`);
  console.log(`Target Lifecycle: ${persona.targetLifecycle}`);
  console.log(`Seed Profile: ${persona.seedProfile}`);
  console.log('');

  // Check existing profile (remote first, then local)
  const existingProfile = await adapter.getPersonaProfile(personaId);
  const localProfile = loadPersonaProfile(personaId);

  if (existingProfile && !force) {
    console.log('✅ Persona already bootstrapped:');
    console.log(`   User ID: ${existingProfile.userId}`);
    console.log(`   Workspace ID: ${existingProfile.workspaceId}`);
    console.log(`   Lifecycle Stage: ${existingProfile.lifecycleStage}`);
    console.log(`   Last Journey: ${existingProfile.lastCompletedJourney || 'none'}`);
    if (localProfile?.seeded) {
      console.log(`   Seeded: ${JSON.stringify(localProfile.seeded)}`);
    }
    console.log('');
    console.log('Use --force to re-bootstrap.');
    return;
  }

  if (existingProfile && force) {
    console.log('⚠️  Force mode enabled - re-bootstrapping...\n');
  }

  // Bootstrap the persona
  console.log('Bootstrapping persona...\n');

  try {
    const profile = await adapter.bootstrapPersona(persona);

    console.log('✅ Persona bootstrapped successfully:');
    console.log(`   User ID: ${profile.userId}`);
    console.log(`   Workspace ID: ${profile.workspaceId}`);
    console.log(`   Lifecycle Stage: ${profile.lifecycleStage}`);
    console.log('');

    // Seed data if not skipped and persona has a seed profile
    let seededCounts: Record<string, number> | undefined;
    if (!skipSeed && persona.seedProfile !== 'empty') {
      console.log(`Seeding data (profile: ${persona.seedProfile})...\n`);
      try {
        const seedResult = await adapter.seedData(personaId, persona.seedProfile);
        seededCounts = seedResult.counts;
        console.log('✅ Data seeded:');
        Object.entries(seededCounts).forEach(([key, count]) => {
          console.log(`   ${key}: ${count}`);
        });
        console.log('');
      } catch (seedError) {
        console.warn('⚠️  Seed failed (non-fatal):', seedError);
      }
    } else if (skipSeed) {
      console.log('ℹ️  Skipping data seeding (--skip-seed)\n');
    }

    // Save profile locally for test runs
    savePersonaProfile({
      ...profile,
      seeded: seededCounts,
    });

    // Print summary line
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${persona.displayName} bootstrapped → orgId=${profile.workspaceId} stage=${profile.lifecycleStage}${seededCounts ? ` seeded=${persona.seedProfile}` : ''}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Log credentials reminder
    console.log('📝 Credentials:');
    console.log(`   Email: ${persona.email}`);
    console.log(`   Password: (from E2E_${personaId.toUpperCase()}_PASSWORD env var)`);
    console.log('');

  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
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

  if (!args.personaId) {
    console.error('❌ Please specify a persona ID.');
    console.log('Run with --help for usage information.');
    process.exit(1);
  }

  await bootstrapPersona(args.personaId, args.force, args.skipSeed);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
