#!/usr/bin/env tsx
/**
 * Reset Persona Script
 *
 * Resets a persona to initial state or specific lifecycle stage.
 * Use with caution - this deletes persona data.
 *
 * Usage:
 *   pnpm qa:reset peter                 # Reset to signup, keep data
 *   pnpm qa:reset peter --full          # Full reset - delete all data
 *   pnpm qa:reset peter --to onboarded  # Reset to specific stage
 *   pnpm qa:reset peter --reseed        # Reset and re-seed data
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getAdapter } from '../adapters/index.js';
import { getPersona, hasPersona } from '../personas/index.js';
import { clearStorageState } from '../playwright/utils/storage-state.js';
import type { LifecycleStage } from '../adapters/base.adapter.js';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// =============================================================================
// Persona Profile Persistence
// =============================================================================

const PROFILE_DIR = path.resolve(__dirname, '../storage-state');

function getProfilePath(personaId: string): string {
  return path.join(PROFILE_DIR, `persona-profile.${personaId}.json`);
}

function clearPersonaProfile(personaId: string): void {
  const filePath = getProfilePath(personaId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[Profile] Cleared ${filePath}`);
  }
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

const VALID_STAGES: LifecycleStage[] = ['signup', 'onboarded', 'activated', 'power_user'];

interface CliArgs {
  personaId: string;
  confirm: boolean;
  fullReset: boolean;
  targetStage: LifecycleStage | null;
  reseed: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    personaId: '',
    confirm: false,
    fullReset: false,
    targetStage: null,
    reseed: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--confirm' || arg === '-y') {
      result.confirm = true;
    } else if (arg === '--full') {
      result.fullReset = true;
    } else if (arg === '--to') {
      const stage = args[++i] as LifecycleStage;
      if (VALID_STAGES.includes(stage)) {
        result.targetStage = stage;
      } else {
        console.error(`❌ Invalid stage: ${stage}. Valid stages: ${VALID_STAGES.join(', ')}`);
        process.exit(1);
      }
    } else if (arg === '--reseed') {
      result.reseed = true;
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
Reset Persona Script

Resets a test persona to initial state or a specific lifecycle stage.

USAGE:
  pnpm qa:reset <persona-id> [options]

ARGUMENTS:
  <persona-id>    The ID of the persona to reset (e.g., "peter")

OPTIONS:
  --id, -i        Specify persona ID explicitly
  --full          Full reset - delete ALL data (users, invoices, etc.)
  --to <stage>    Reset to specific stage (signup, onboarded, activated, power_user)
  --reseed        Re-seed data after reset (uses persona's seedProfile)
  --confirm, -y   Skip confirmation prompt
  --help, -h      Show this help message

EXAMPLES:
  pnpm qa:reset peter                  # Reset to signup stage, keep data
  pnpm qa:reset peter --full           # Delete all data, reset to signup
  pnpm qa:reset peter --to onboarded   # Reset to onboarded stage
  pnpm qa:reset peter --full --reseed  # Full reset and re-seed

LIFECYCLE STAGES:
  signup      → Initial state (just created)
  onboarded   → Completed onboarding flow
  activated   → Created first invoice/bill
  power_user  → Heavy usage, all features explored

⚠️  WARNING: --full will delete all data associated with the persona!
`);
}

// =============================================================================
// Confirmation Prompt
// =============================================================================

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// =============================================================================
// Main Reset Logic
// =============================================================================

interface ResetOptions {
  skipConfirm: boolean;
  fullReset: boolean;
  targetStage: LifecycleStage | null;
  reseed: boolean;
}

async function resetPersona(personaId: string, options: ResetOptions): Promise<void> {
  const { skipConfirm, fullReset, targetStage, reseed } = options;

  console.log('\n⚠️  Reset Persona');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate persona exists
  if (!hasPersona(personaId)) {
    console.error(`❌ Persona "${personaId}" not found.`);
    process.exit(1);
  }

  const persona = getPersona(personaId);
  const adapter = getAdapter();

  console.log(`Persona: ${persona.displayName} (${persona.id})`);
  console.log(`Email: ${persona.email}`);
  console.log('');

  // Check existing profile
  const existingProfile = await adapter.getPersonaProfile(personaId);

  if (!existingProfile) {
    console.log('ℹ️  Persona has no existing profile - nothing to reset.');
    return;
  }

  console.log('Current state:');
  console.log(`   User ID: ${existingProfile.userId}`);
  console.log(`   Workspace ID: ${existingProfile.workspaceId}`);
  console.log(`   Lifecycle Stage: ${existingProfile.lifecycleStage}`);
  console.log(`   Last Journey: ${existingProfile.lastCompletedJourney || 'none'}`);
  console.log('');

  // Show what will happen
  console.log('Reset configuration:');
  console.log(`   Full Reset: ${fullReset ? 'YES (delete all data)' : 'NO (keep data)'}`);
  console.log(`   Target Stage: ${targetStage || 'signup'}`);
  console.log(`   Re-seed Data: ${reseed ? 'YES' : 'NO'}`);
  console.log('');

  // Confirm
  if (!skipConfirm) {
    const warningMsg = fullReset
      ? '⚠️  This will DELETE ALL DATA. Are you sure?'
      : 'Are you sure you want to reset this persona?';
    const confirmed = await confirm(warningMsg);
    if (!confirmed) {
      console.log('\n❌ Reset cancelled.');
      process.exit(0);
    }
  }

  console.log('\nResetting persona...\n');

  try {
    // Map targetStage to backend format
    const backendStage = targetStage
      ? (targetStage.toUpperCase() as 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER')
      : 'SIGNUP';

    // Reset via adapter
    const profile = await adapter.resetPersona(personaId, {
      fullReset,
      targetStage: backendStage,
    });

    console.log('✅ Persona reset successfully.');
    console.log(`   New Stage: ${profile.lifecycleStage}`);
    console.log('');

    // Re-seed if requested
    if (reseed) {
      console.log(`Seeding data (profile: ${persona.seedProfile})...\n`);
      try {
        const seedResult = await adapter.seedData(personaId, persona.seedProfile);
        console.log('✅ Data seeded:');
        Object.entries(seedResult.counts).forEach(([key, count]) => {
          console.log(`   ${key}: ${count}`);
        });
        console.log('');
      } catch (seedError) {
        console.warn('⚠️  Seed failed (non-fatal):', seedError);
      }
    }

    // Clear local storage state and profile
    clearStorageState(personaId);
    clearPersonaProfile(personaId);

    // Print summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${persona.displayName} reset → stage=${targetStage || 'signup'}${fullReset ? ' (full)' : ''}${reseed ? ' (reseeded)' : ''}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Reset failed:', error);
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

  await resetPersona(args.personaId, {
    skipConfirm: args.confirm,
    fullReset: args.fullReset,
    targetStage: args.targetStage,
    reseed: args.reseed,
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
