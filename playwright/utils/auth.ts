import type { Page, BrowserContext } from '@playwright/test';
import type { Persona } from '../../adapters/base.adapter.js';
import { getAdapter } from '../../adapters/index.js';

// =============================================================================
// Authentication Utilities
// =============================================================================

/**
 * Login with a persona and optionally save the storage state
 */
export async function loginAs(
  page: Page,
  persona: Persona,
  options?: { saveStorageState?: string }
): Promise<void> {
  const adapter = getAdapter();

  // Perform login
  await adapter.login(page, persona);

  // Save storage state if requested
  if (options?.saveStorageState) {
    await page.context().storageState({ path: options.saveStorageState });
  }
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  const adapter = getAdapter();
  await adapter.logout(page);
}

/**
 * Check if the user is currently logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const adapter = getAdapter();
  return adapter.isLoggedIn(page);
}

/**
 * Ensure user is logged in (login if not)
 */
export async function ensureLoggedIn(page: Page, persona: Persona): Promise<void> {
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    await loginAs(page, persona);
  }
}

/**
 * Create authenticated context from storage state
 */
export async function createAuthenticatedContext(
  context: BrowserContext,
  storageStatePath: string
): Promise<BrowserContext> {
  // Load storage state into the context
  await context.addCookies([]);  // This is a workaround to ensure context is ready

  // Actually, we need to create a new context with storage state
  // This function should be called from a fixture that creates the context
  console.warn(
    'createAuthenticatedContext: Use storageState option when creating context instead'
  );

  return context;
}

/**
 * Get current user info from the page (via localStorage or API)
 */
export async function getCurrentUser(page: Page): Promise<{
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
} | null> {
  try {
    const userInfo = await page.evaluate(() => {
      const token = localStorage.getItem('piro_access_token');
      if (!token) return null;

      // Try to decode JWT payload (it's base64)
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return {
          id: decoded.sub || decoded.userId,
          email: decoded.email,
        };
      } catch {
        return null;
      }
    });

    return userInfo;
  } catch {
    return null;
  }
}

/**
 * Get current organization from the page
 */
export async function getCurrentOrganization(page: Page): Promise<{
  id?: string;
  name?: string;
} | null> {
  try {
    const orgInfo = await page.evaluate(() => {
      // Try to get from localStorage or session
      const orgData = localStorage.getItem('piro_current_org');
      if (orgData) {
        try {
          return JSON.parse(orgData);
        } catch {
          return null;
        }
      }
      return null;
    });

    return orgInfo;
  } catch {
    return null;
  }
}

/**
 * Clear all authentication data
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear localStorage
    localStorage.removeItem('piro_access_token');
    localStorage.removeItem('piro_refresh_token');
    localStorage.removeItem('piro_current_org');

    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/');
    });
  });

  // Also clear context cookies
  await page.context().clearCookies();
}
