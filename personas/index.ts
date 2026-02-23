/**
 * Persona exports
 *
 * Personas represent test users at different lifecycle stages.
 * Each persona has traits, a target lifecycle, and seed data requirements.
 */

// Core persona utilities
export {
  registerPersona,
  getPersona,
  getAllPersonas,
  hasPersona,
  definePersona,
  PersonaBuilder,
  // Lifecycle helpers
  LIFECYCLE_STAGES,
  getStageIndex,
  isStageBefore,
  isStageAtOrAfter,
  getNextStage,
  getStagesTo,
  // Seed profile helpers
  SEED_PROFILES,
  getSeedProfileConfig,
  // Types
  type Persona,
  type LifecycleStage,
  type SeedProfile,
} from './personas.js';

// Pre-defined personas
export { peter } from './peter.persona.js';

// =============================================================================
// Initialize all personas on import
// =============================================================================

// Import persona files to register them
import './peter.persona.js';

// Log available personas in development
if (process.env.NODE_ENV !== 'production') {
  import('./personas.js').then(({ getAllPersonas }) => {
    const personas = getAllPersonas();
    console.log(`[Personas] Registered ${personas.length} persona(s): ${personas.map(p => p.id).join(', ')}`);
  });
}
