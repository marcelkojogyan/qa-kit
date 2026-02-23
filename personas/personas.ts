import type { Persona, LifecycleStage, SeedProfile } from '../adapters/base.adapter.js';

// =============================================================================
// Persona Registry
// =============================================================================

/**
 * Registry of all defined personas.
 * Add new personas here and create corresponding .persona.ts files.
 */
const personaRegistry = new Map<string, Persona>();

/**
 * Register a persona in the registry
 */
export function registerPersona(persona: Persona): void {
  if (personaRegistry.has(persona.id)) {
    console.warn(`Persona ${persona.id} is already registered. Overwriting.`);
  }
  personaRegistry.set(persona.id, persona);
}

/**
 * Get a persona by ID
 */
export function getPersona(id: string): Persona {
  const persona = personaRegistry.get(id);
  if (!persona) {
    throw new Error(
      `Persona "${id}" not found. Available personas: ${Array.from(personaRegistry.keys()).join(', ')}`
    );
  }
  return persona;
}

/**
 * Get all registered personas
 */
export function getAllPersonas(): Persona[] {
  return Array.from(personaRegistry.values());
}

/**
 * Check if a persona exists
 */
export function hasPersona(id: string): boolean {
  return personaRegistry.has(id);
}

// =============================================================================
// Lifecycle Stage Helpers
// =============================================================================

/**
 * Ordered lifecycle stages
 */
export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  'signup',
  'onboarded',
  'activated',
  'power_user',
] as const;

/**
 * Get the stage index (for comparison)
 */
export function getStageIndex(stage: LifecycleStage): number {
  return LIFECYCLE_STAGES.indexOf(stage);
}

/**
 * Check if stage A is before stage B
 */
export function isStageBefore(stageA: LifecycleStage, stageB: LifecycleStage): boolean {
  return getStageIndex(stageA) < getStageIndex(stageB);
}

/**
 * Check if stage A is at or after stage B
 */
export function isStageAtOrAfter(stageA: LifecycleStage, stageB: LifecycleStage): boolean {
  return getStageIndex(stageA) >= getStageIndex(stageB);
}

/**
 * Get the next stage after the given stage
 */
export function getNextStage(stage: LifecycleStage): LifecycleStage | null {
  const index = getStageIndex(stage);
  if (index === -1 || index >= LIFECYCLE_STAGES.length - 1) {
    return null;
  }
  return LIFECYCLE_STAGES[index + 1];
}

/**
 * Get all stages from current to target (inclusive)
 */
export function getStagesTo(current: LifecycleStage, target: LifecycleStage): LifecycleStage[] {
  const currentIndex = getStageIndex(current);
  const targetIndex = getStageIndex(target);

  if (currentIndex >= targetIndex) {
    return [];
  }

  return LIFECYCLE_STAGES.slice(currentIndex + 1, targetIndex + 1) as LifecycleStage[];
}

// =============================================================================
// Seed Profile Helpers
// =============================================================================

/**
 * Seed profile configurations
 */
export const SEED_PROFILES: Record<SeedProfile, {
  customers: number;
  vendors: number;
  invoices: number;
  bills: number;
  expenses: number;
  accounts: number;
}> = {
  empty: {
    customers: 0,
    vendors: 0,
    invoices: 0,
    bills: 0,
    expenses: 0,
    accounts: 0,
  },
  minimal: {
    customers: 2,
    vendors: 2,
    invoices: 3,
    bills: 2,
    expenses: 5,
    accounts: 10,
  },
  standard: {
    customers: 10,
    vendors: 8,
    invoices: 20,
    bills: 15,
    expenses: 30,
    accounts: 25,
  },
  large_dataset: {
    customers: 50,
    vendors: 30,
    invoices: 100,
    bills: 80,
    expenses: 200,
    accounts: 50,
  },
};

/**
 * Get seed profile configuration
 */
export function getSeedProfileConfig(profile: SeedProfile) {
  return SEED_PROFILES[profile];
}

// =============================================================================
// Persona Builder (Fluent API)
// =============================================================================

/**
 * Builder for creating personas with a fluent API
 */
export class PersonaBuilder {
  private persona: Partial<Persona> = {};

  /**
   * Set the persona ID
   */
  id(id: string): this {
    this.persona.id = id;
    return this;
  }

  /**
   * Set email from environment variable or default
   */
  email(envVar: string, defaultEmail: string): this {
    this.persona.email = process.env[envVar] || defaultEmail;
    return this;
  }

  /**
   * Set password from environment variable (required)
   */
  password(envVar: string): this {
    const password = process.env[envVar];
    if (!password) {
      console.warn(`Password environment variable ${envVar} is not set!`);
    }
    this.persona.password = password || '';
    return this;
  }

  /**
   * Set display name
   */
  displayName(name: string): this {
    this.persona.displayName = name;
    return this;
  }

  /**
   * Set traits
   */
  traits(traits: string[]): this {
    this.persona.traits = traits;
    return this;
  }

  /**
   * Set target lifecycle stage
   */
  targetLifecycle(stage: LifecycleStage): this {
    this.persona.targetLifecycle = stage;
    return this;
  }

  /**
   * Set seed profile
   */
  seedProfile(profile: SeedProfile): this {
    this.persona.seedProfile = profile;
    return this;
  }

  /**
   * Build and register the persona
   */
  build(): Persona {
    // Validate required fields
    if (!this.persona.id) throw new Error('Persona ID is required');
    if (!this.persona.email) throw new Error('Persona email is required');
    if (!this.persona.displayName) throw new Error('Persona displayName is required');

    // Set defaults
    const persona: Persona = {
      id: this.persona.id,
      email: this.persona.email,
      password: this.persona.password || '',
      displayName: this.persona.displayName,
      traits: this.persona.traits || [],
      targetLifecycle: this.persona.targetLifecycle || 'activated',
      seedProfile: this.persona.seedProfile || 'standard',
    };

    // Register and return
    registerPersona(persona);
    return persona;
  }
}

/**
 * Create a new persona builder
 */
export function definePersona(): PersonaBuilder {
  return new PersonaBuilder();
}

// =============================================================================
// Export types
// =============================================================================

export type { Persona, LifecycleStage, SeedProfile };
