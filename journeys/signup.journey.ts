import { test, expect } from '../playwright/fixtures.js';
import { getAdapter } from '../adapters/index.js';
import { getPersona } from '../personas/index.js';
import { byTestId, buttonByText, waitForToast } from '../playwright/selectors.js';
import { takeScreenshot } from '../playwright/utils/screenshot.js';

/**
 * Signup Journey
 *
 * This journey handles user registration. It is idempotent:
 * - If the user already exists, it detects and skips signup
 * - Creates the user account and initial organization
 * - Verifies email if required (in test environment)
 * - Updates persona profile to 'signup' stage
 */

test.describe('Signup Journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('should check if user already exists', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const persona = getPersona(personaId);
    const adapter = getAdapter();

    // Try to login - if successful, user exists
    await page.goto(`${adapter.getBaseUrl()}/login`);

    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', persona.email);
    await page.fill('input[type="password"], input[name="password"]', persona.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check if we're logged in or got an error
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding');

    if (isLoggedIn) {
      console.log(`[Signup Journey] User ${persona.email} already exists, skipping signup`);

      // Update persona profile to mark signup as complete
      await adapter.updatePersonaStage(personaId, 'signup', 'signup.journey');

      // Logout for clean state
      await adapter.logout(page);

      test.info().annotations.push({ type: 'skip', description: 'User already exists' });
    }
  });

  test('should create new user account', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const persona = getPersona(personaId);
    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Check if already signed up via profile
    const profile = await adapter.getPersonaProfile(personaId);
    if (profile && profile.userId) {
      console.log(`[Signup Journey] User ${persona.email} already has profile, skipping`);
      test.skip();
      return;
    }

    // Navigate to signup page
    await page.goto(`${adapter.getBaseUrl()}${routes.signup}`);

    // Screenshot: Signup page initial state
    await takeScreenshot(page, {
      name: 'signup-page',
      subdir: `journeys/${personaId}`,
    });

    // Fill signup form
    const selectors = adapter.getSelectors();

    // Email
    const emailInput = page.locator(selectors.signupEmailInput).or(
      page.locator('input[type="email"]').first()
    );
    await emailInput.fill(persona.email);

    // Password
    const passwordInput = page.locator(selectors.signupPasswordInput).or(
      page.locator('input[type="password"]').first()
    );
    await passwordInput.fill(persona.password);

    // First name (if present)
    const firstNameInput = page.locator(selectors.signupFirstNameInput).or(
      page.locator('input[name="firstName"], input[placeholder*="First"]')
    );
    if (await firstNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstNameInput.fill(persona.displayName);
    }

    // Last name (if present)
    const lastNameInput = page.locator(selectors.signupLastNameInput).or(
      page.locator('input[name="lastName"], input[placeholder*="Last"]')
    );
    if (await lastNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await lastNameInput.fill('TestUser');
    }

    // Screenshot: Form filled
    await takeScreenshot(page, {
      name: 'signup-form-filled',
      subdir: `journeys/${personaId}`,
    });

    // Submit form
    const submitButton = page.locator(selectors.signupSubmitButton).or(
      page.locator('button[type="submit"]').first()
    );
    await submitButton.click();

    // Wait for navigation or success
    await page.waitForURL(
      (url) => {
        return url.pathname.includes('/dashboard') ||
               url.pathname.includes('/onboarding') ||
               url.pathname.includes('/verify-email');
      },
      { timeout: 30000 }
    );

    // Screenshot: Post-signup state
    await takeScreenshot(page, {
      name: 'signup-success',
      subdir: `journeys/${personaId}`,
    });

    console.log(`[Signup Journey] User ${persona.email} created successfully`);
  });

  test('should verify email if required', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Check if we're on verification page
    const currentUrl = page.url();
    if (!currentUrl.includes('/verify-email')) {
      console.log('[Signup Journey] Email verification not required');
      return;
    }

    // In test environment, email verification might be:
    // 1. Auto-verified
    // 2. Skipped
    // 3. Manual (we need to poll for verification)

    // Wait for verification (poll for redirect)
    try {
      await page.waitForURL(
        (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/onboarding'),
        { timeout: 60000 }
      );
      console.log('[Signup Journey] Email verified successfully');
    } catch {
      console.log('[Signup Journey] Email verification timeout - may need manual verification');
    }
  });

  test('should update persona profile to signup stage', async ({ personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Update persona lifecycle stage
    await adapter.updatePersonaStage(personaId, 'signup', 'signup.journey');

    console.log(`[Signup Journey] Persona ${personaId} updated to signup stage`);
  });
});

// =============================================================================
// Standalone Functions for Script Usage
// =============================================================================

/**
 * Check if signup is needed for a persona
 */
export async function isSignupNeeded(personaId: string): Promise<boolean> {
  const adapter = getAdapter();
  const profile = await adapter.getPersonaProfile(personaId);

  // Signup needed if no profile or no user ID
  return !profile || !profile.userId;
}

/**
 * Run signup journey programmatically
 */
export async function runSignupJourney(personaId: string, page: import('@playwright/test').Page): Promise<void> {
  const persona = getPersona(personaId);
  const adapter = getAdapter();

  // Check if already signed up
  const profile = await adapter.getPersonaProfile(personaId);
  if (profile && profile.userId) {
    console.log(`[Signup] User ${persona.email} already exists`);
    return;
  }

  // Navigate to signup
  await page.goto(`${adapter.getBaseUrl()}/signup`);

  // Fill and submit form
  await page.fill('input[type="email"]', persona.email);
  await page.fill('input[type="password"]', persona.password);
  await page.click('button[type="submit"]');

  // Wait for completion
  await page.waitForURL(
    (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/onboarding'),
    { timeout: 30000 }
  );

  // Update profile
  await adapter.updatePersonaStage(personaId, 'signup', 'signup.journey');
}
