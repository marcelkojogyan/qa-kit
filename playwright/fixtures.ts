import { test as base, type Page, type BrowserContext } from '@playwright/test';
import type { Persona, AppAdapter, PersonaProfile } from '../adapters/base.adapter.js';
import { getAdapter } from '../adapters/index.js';
import { getPersona } from '../personas/index.js';
import {
  loadStorageStatePath,
  saveStorageState,
  getOrCreateStorageState,
} from './utils/storage-state.js';
import { vrtCapture, type VrtCaptureOptions, type VrtTestInfo } from './utils/vrt.js';
import { prepareForScreenshot } from './utils/stable-ui.js';

// =============================================================================
// Extended Test Fixtures
// =============================================================================

/**
 * Extended fixtures for QA kit tests
 */
export interface QaFixtures {
  /** Current adapter instance */
  adapter: AppAdapter;

  /** Current persona (if set) */
  persona: Persona | null;

  /** Current persona profile from database */
  personaProfile: PersonaProfile | null;

  /** Authenticated page (if persona is set) */
  authenticatedPage: Page;

  /** VRT capture helper */
  vrtCapture: (options: VrtCaptureOptions) => Promise<VrtTestInfo | null>;

  /** Helper to prepare page for screenshots */
  prepareForScreenshot: () => Promise<void>;
}

/**
 * Worker fixtures (shared across tests in a worker)
 */
export interface QaWorkerFixtures {
  /** Browser name for current project */
  browserName: string;

  /** Viewport tag for current project */
  viewportTag: string;

  /** Is this a mobile project */
  isMobile: boolean;
}

/**
 * Test options (can be configured per test/describe/project)
 */
export interface QaOptions {
  /** Persona ID to use for authenticated tests */
  personaId: string | null;

  /** Auto-login for authenticated tests */
  autoLogin: boolean;

  /** Storage state path override */
  storageStatePath: string | null;
}

// =============================================================================
// Extended Test Function
// =============================================================================

export const test = base.extend<QaFixtures & QaOptions, QaWorkerFixtures>({
  // ===========================================================================
  // Options (configurable)
  // ===========================================================================

  personaId: null,
  autoLogin: true,
  storageStatePath: null,

  // ===========================================================================
  // Worker Fixtures
  // ===========================================================================

  browserName: [async ({ browserName }, use) => {
    await use(browserName);
  }, { scope: 'worker' }],

  viewportTag: [async ({ isMobile }, use) => {
    let tag = 'desktop';
    if (isMobile) {
      tag = 'mobile';
    }
    await use(tag);
  }, { scope: 'worker' }],

  isMobile: [async ({ isMobile }, use) => {
    await use(isMobile ?? false);
  }, { scope: 'test' }],

  // ===========================================================================
  // Test Fixtures
  // ===========================================================================

  adapter: async ({}, use) => {
    const adapter = getAdapter();
    await use(adapter);
  },

  persona: async ({ personaId }, use) => {
    if (!personaId) {
      await use(null);
      return;
    }
    const persona = getPersona(personaId);
    await use(persona);
  },

  personaProfile: async ({ persona, adapter }, use) => {
    if (!persona) {
      await use(null);
      return;
    }
    const profile = await adapter.getPersonaProfile(persona.id);
    await use(profile);
  },

  authenticatedPage: async ({ page, persona, adapter, autoLogin, storageStatePath }, use) => {
    if (!persona) {
      // No persona, just use regular page
      await use(page);
      return;
    }

    // Check for existing storage state
    const existingPath = storageStatePath || loadStorageStatePath(persona.id);

    if (existingPath && autoLogin) {
      // Navigate and check if we're logged in
      await page.goto(`${adapter.getBaseUrl()}/dashboard`);

      const isLoggedIn = await adapter.isLoggedIn(page);
      if (isLoggedIn) {
        await use(page);
        return;
      }
    }

    // Need to login
    if (autoLogin) {
      await adapter.login(page, persona);

      // Save storage state for future tests
      await saveStorageState(page.context(), persona.id);
    }

    await use(page);
  },

  vrtCapture: async ({ page, viewportTag }, use) => {
    const captureWithViewport = async (options: VrtCaptureOptions): Promise<VrtTestInfo | null> => {
      return vrtCapture(page, {
        ...options,
        viewportTag: options.viewportTag || viewportTag,
      });
    };
    await use(captureWithViewport);
  },

  prepareForScreenshot: async ({ page }, use) => {
    const prepare = async () => {
      await prepareForScreenshot(page);
    };
    await use(prepare);
  },
});

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a test that requires a specific persona
 */
export function testWithPersona(personaId: string) {
  return test.extend<{}, { personaId: string }>({
    personaId: [personaId, { scope: 'test' }],
  });
}

/**
 * Create tests for Peter persona
 */
export const testAsPeter = testWithPersona('peter');

// =============================================================================
// Re-export expect
// =============================================================================

export { expect } from '@playwright/test';

// =============================================================================
// Custom Matchers (extend expect if needed)
// =============================================================================

// Example of extending expect with custom matchers:
// expect.extend({
//   async toBeLoggedIn(page: Page) {
//     const adapter = getAdapter();
//     const isLoggedIn = await adapter.isLoggedIn(page);
//     return {
//       pass: isLoggedIn,
//       message: () => isLoggedIn
//         ? 'Expected page to not be logged in'
//         : 'Expected page to be logged in',
//     };
//   },
// });
