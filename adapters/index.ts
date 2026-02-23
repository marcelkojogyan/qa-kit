/**
 * Adapter exports
 *
 * The adapter pattern allows the QA kit to work with different applications.
 * Each app implements its own adapter that extends BaseAdapter.
 */

// Base types and abstract class
export {
  type AppAdapter,
  type Persona,
  type PersonaProfile,
  type LifecycleStage,
  type SeedProfile,
  type SelectorMap,
  type RouteMap,
  BaseAdapter,
} from './base.adapter.js';

// Piro-specific adapter
export { PiroAdapter, piroAdapter } from './piro.adapter.js';

// Default adapter (can be switched via environment)
import { piroAdapter } from './piro.adapter.js';

/**
 * Get the active adapter based on environment configuration.
 * Override with APP_ADAPTER environment variable if needed.
 */
export function getAdapter() {
  const adapterName = process.env.APP_ADAPTER || 'piro';

  switch (adapterName) {
    case 'piro':
      return piroAdapter;
    default:
      throw new Error(`Unknown adapter: ${adapterName}. Available: piro`);
  }
}
