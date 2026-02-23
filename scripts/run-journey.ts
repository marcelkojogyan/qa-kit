#!/usr/bin/env tsx
/**
 * Run Journey Script
 *
 * Runs journey tests for a persona, continuing from their current lifecycle stage.
 *
 * Usage:
 *   pnpm qa:run peter
 *   pnpm qa:run peter --journey signup
 *   pnpm qa:run:headed peter
 *   pnpm qa:run:ci peter
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { spawn } from 'child_process';
import { getAdapter } from '../adapters/index.js';
import { getPersona, hasPersona, getStagesTo, LIFECYCLE_STAGES, type LifecycleStage } from '../personas/index.js';
import { getRemainingJourneys, getJourney, JOURNEYS, type Journey } from '../journeys/index.js';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  personaId: string;
  journey: string | null;
  headed: boolean;
  ci: boolean;
  debug: boolean;
  project: string | null;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    personaId: '',
    journey: null,
    headed: process.env.HEADED === 'true',
    ci: process.env.CI === 'true',
    debug: false,
    project: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--journey' || arg === '-j') {
      result.journey = args[++i] || null;
    } else if (arg === '--headed') {
      result.headed = true;
    } else if (arg === '--headless') {
      result.headed = false;
    } else if (arg === '--ci') {
      result.ci = true;
    } else if (arg === '--debug') {
      result.debug = true;
    } else if (arg === '--project' || arg === '-p') {
      result.project = args[++i] || null;
    } else if (!arg.startsWith('-')) {
      result.personaId = arg;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Run Journey Script

Runs Playwright journey tests for a persona.

USAGE:
  pnpm qa:run <persona-id> [options]

ARGUMENTS:
  <persona-id>    The ID of the persona (e.g., "peter")

OPTIONS:
  --journey, -j   Run a specific journey (e.g., "signup", "onboarding")
  --headed        Run tests in headed mode (visible browser)
  --headless      Run tests in headless mode
  --ci            Run in CI mode (stricter, no retries)
  --debug         Run with Playwright debug mode
  --project, -p   Playwright project to use (e.g., "chromium-desktop")
  --help, -h      Show this help message

EXAMPLES:
  pnpm qa:run peter                    # Run all journeys to power_user
  pnpm qa:run peter --journey signup   # Run only signup journey
  pnpm qa:run:headed peter             # Run with visible browser
  pnpm qa:run:ci peter                 # Run in CI mode

AVAILABLE JOURNEYS:
${JOURNEYS.map(j => `  ${j.id.padEnd(15)} ${j.name}`).join('\n')}
`);
}

// =============================================================================
// Journey Execution
// =============================================================================

async function runPlaywrightTests(
  journeys: Journey[],
  personaId: string,
  options: { headed: boolean; ci: boolean; debug: boolean; project: string | null }
): Promise<void> {
  const playwrightArgs: string[] = ['exec', 'playwright', 'test'];

  // Add journey files
  for (const journey of journeys) {
    playwrightArgs.push(`journeys/${journey.file}`);
  }

  // Add options
  if (options.headed) {
    playwrightArgs.push('--headed');
  }

  if (options.debug) {
    playwrightArgs.push('--debug');
  }

  if (options.project) {
    playwrightArgs.push('--project', options.project);
  }

  // CI mode settings
  if (options.ci) {
    playwrightArgs.push('--retries', '0');
    playwrightArgs.push('--reporter', 'list,json');
  }

  // Pass persona ID as environment variable
  const env = {
    ...process.env,
    PERSONA_ID: personaId,
  };

  console.log(`\nRunning: pnpm ${playwrightArgs.join(' ')}\n`);
  console.log('━'.repeat(60) + '\n');

  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', playwrightArgs, {
      cwd: path.resolve(__dirname, '..'),
      env,
      stdio: 'inherit',
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Playwright exited with code ${code}`));
      }
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

// =============================================================================
// Main Logic
// =============================================================================

async function runJourneys(args: CliArgs): Promise<void> {
  console.log('\n🎭 Run Journey');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate persona
  if (!hasPersona(args.personaId)) {
    console.error(`❌ Persona "${args.personaId}" not found.`);
    process.exit(1);
  }

  const persona = getPersona(args.personaId);
  const adapter = getAdapter();

  console.log(`Persona: ${persona.displayName} (${persona.id})`);
  console.log(`Target Lifecycle: ${persona.targetLifecycle}`);
  console.log(`Mode: ${args.ci ? 'CI' : 'Local'}${args.headed ? ' (headed)' : ''}`);
  console.log('');

  // Get current profile
  const profile = await adapter.getPersonaProfile(args.personaId);
  const currentStage: LifecycleStage = profile?.lifecycleStage || 'signup';

  console.log(`Current Stage: ${currentStage}`);
  console.log('');

  // Determine which journeys to run
  let journeysToRun: Journey[];

  if (args.journey) {
    // Run specific journey
    const journey = getJourney(args.journey);
    if (!journey) {
      console.error(`❌ Journey "${args.journey}" not found.`);
      console.log('\nAvailable journeys:');
      JOURNEYS.forEach(j => console.log(`  - ${j.id}`));
      process.exit(1);
    }
    journeysToRun = [journey];
  } else {
    // Run journeys to reach target lifecycle
    journeysToRun = getRemainingJourneys(currentStage, persona.targetLifecycle);

    if (journeysToRun.length === 0) {
      console.log(`✅ Persona is already at ${persona.targetLifecycle} stage.`);
      console.log('   Use --journey <name> to run a specific journey.');
      return;
    }
  }

  console.log(`Journeys to run (${journeysToRun.length}):`);
  journeysToRun.forEach(j => {
    console.log(`  - ${j.name} (${j.file})`);
  });
  console.log('');

  // Run tests
  try {
    await runPlaywrightTests(journeysToRun, args.personaId, {
      headed: args.headed,
      ci: args.ci,
      debug: args.debug,
      project: args.project,
    });

    console.log('\n━'.repeat(60));
    console.log('\n✅ Journeys completed successfully!\n');

  } catch (error) {
    console.log('\n━'.repeat(60));
    console.log('\n❌ Journeys failed. Check output above for details.\n');
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

  await runJourneys(args);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
