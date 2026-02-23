#!/usr/bin/env tsx
/**
 * Create Persona Script
 *
 * Scaffolds a new persona definition file.
 *
 * Usage:
 *   pnpm qa:persona:create --id mary --name "Mary"
 */

import * as fs from 'fs';
import * as path from 'path';
import { hasPersona, type LifecycleStage, type SeedProfile } from '../personas/index.js';

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  id: string;
  name: string;
  email: string | null;
  lifecycle: LifecycleStage;
  seedProfile: SeedProfile;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    id: '',
    name: '',
    email: null,
    lifecycle: 'activated',
    seedProfile: 'standard',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--id') {
      result.id = args[++i] || '';
    } else if (arg === '--name') {
      result.name = args[++i] || '';
    } else if (arg === '--email') {
      result.email = args[++i] || null;
    } else if (arg === '--lifecycle') {
      result.lifecycle = args[++i] as LifecycleStage || 'activated';
    } else if (arg === '--seed-profile') {
      result.seedProfile = args[++i] as SeedProfile || 'standard';
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Create Persona Script

Scaffolds a new persona definition file.

USAGE:
  pnpm qa:persona:create --id <id> --name <name> [options]

REQUIRED:
  --id            Persona ID (e.g., "mary") - lowercase, no spaces
  --name          Display name (e.g., "Mary")

OPTIONS:
  --email         Email template (default: <id>.test+e2e@piro.test)
  --lifecycle     Target lifecycle: signup, onboarded, activated, power_user
  --seed-profile  Data seeding: empty, minimal, standard, large_dataset
  --help, -h      Show this help message

EXAMPLES:
  pnpm qa:persona:create --id mary --name "Mary"
  pnpm qa:persona:create --id bob --name "Bob" --lifecycle onboarded --seed-profile minimal
`);
}

// =============================================================================
// Persona File Generation
// =============================================================================

function generatePersonaFile(args: CliArgs): string {
  const email = args.email || `${args.id}.test+e2e@piro.test`;
  const envVarPrefix = args.id.toUpperCase();

  return `import { definePersona } from './personas.js';

/**
 * ${args.name} - Test Persona
 *
 * TODO: Add description of this persona's characteristics
 *
 * Lifecycle target: ${args.lifecycle}
 * Seed profile: ${args.seedProfile}
 */
export const ${args.id} = definePersona()
  .id('${args.id}')
  .displayName('${args.name}')
  .email('E2E_${envVarPrefix}_EMAIL', '${email}')
  .password('E2E_${envVarPrefix}_PASSWORD')
  .traits([
    // TODO: Add traits that describe this persona
    'standard_user',
  ])
  .targetLifecycle('${args.lifecycle}')
  .seedProfile('${args.seedProfile}')
  .build();

/**
 * ${args.name}'s journey expectations:
 *
 * TODO: Document the expected journey for this persona
 *
 * 1. Signup:
 *    - Account created
 *    - Organization created
 *
 * 2. Onboarding:
 *    - Basic setup completed
 */

export default ${args.id};
`;
}

function updateIndexFile(personaId: string): void {
  const indexPath = path.resolve(__dirname, '../personas/index.ts');
  let content = fs.readFileSync(indexPath, 'utf8');

  // Add export
  const exportLine = `export { ${personaId} } from './${personaId}.persona.js';`;
  if (!content.includes(exportLine)) {
    // Add after peter export
    content = content.replace(
      "export { peter } from './peter.persona.js';",
      `export { peter } from './peter.persona.js';\nexport { ${personaId} } from './${personaId}.persona.js';`
    );
  }

  // Add import
  const importLine = `import './${personaId}.persona.js';`;
  if (!content.includes(importLine)) {
    // Add after peter import
    content = content.replace(
      "import './peter.persona.js';",
      `import './peter.persona.js';\nimport './${personaId}.persona.js';`
    );
  }

  fs.writeFileSync(indexPath, content);
}

// =============================================================================
// Main Logic
// =============================================================================

async function createPersona(args: CliArgs): Promise<void> {
  console.log('\n✨ Create Persona');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate
  if (!args.id) {
    console.error('❌ Please specify a persona ID with --id');
    process.exit(1);
  }

  if (!args.name) {
    console.error('❌ Please specify a display name with --name');
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9_]*$/.test(args.id)) {
    console.error('❌ Persona ID must be lowercase, start with a letter, and contain only letters, numbers, and underscores');
    process.exit(1);
  }

  // Check if already exists
  if (hasPersona(args.id)) {
    console.error(`❌ Persona "${args.id}" already exists.`);
    process.exit(1);
  }

  const filePath = path.resolve(__dirname, `../personas/${args.id}.persona.ts`);

  if (fs.existsSync(filePath)) {
    console.error(`❌ File already exists: ${filePath}`);
    process.exit(1);
  }

  // Generate file
  const content = generatePersonaFile(args);
  fs.writeFileSync(filePath, content);

  console.log(`✅ Created: personas/${args.id}.persona.ts`);

  // Update index
  updateIndexFile(args.id);
  console.log(`✅ Updated: personas/index.ts`);

  console.log('\nNext steps:');
  console.log(`  1. Edit personas/${args.id}.persona.ts to customize traits`);
  console.log(`  2. Add E2E_${args.id.toUpperCase()}_EMAIL and E2E_${args.id.toUpperCase()}_PASSWORD to .env`);
  console.log(`  3. Run: pnpm qa:bootstrap ${args.id}`);
  console.log('');
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

  await createPersona(args);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
