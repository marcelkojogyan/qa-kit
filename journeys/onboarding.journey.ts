import { test, expect } from '../playwright/fixtures.js';
import { getAdapter } from '../adapters/index.js';
import { getPersona, isStageAtOrAfter } from '../personas/index.js';
import { takeScreenshot } from '../playwright/utils/screenshot.js';
import { waitForLoading } from '../playwright/selectors.js';

/**
 * Onboarding Journey
 *
 * This journey handles the initial user onboarding flow:
 * - Business details configuration
 * - Currency selection
 * - Fiscal year setup
 * - Initial chart of accounts
 *
 * Idempotent: Detects and skips already-completed onboarding steps.
 */

test.describe('Onboarding Journey', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, personaId }) => {
    if (!personaId) return;

    const persona = getPersona(personaId);
    const adapter = getAdapter();

    // Login if not already
    if (!(await adapter.isLoggedIn(page))) {
      await adapter.login(page, persona);
    }
  });

  test('should check if onboarding is needed', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const profile = await adapter.getPersonaProfile(personaId);

    // Check if already past onboarding stage
    if (profile && isStageAtOrAfter(profile.lifecycleStage, 'onboarded')) {
      console.log(`[Onboarding Journey] Persona ${personaId} already onboarded, skipping`);
      test.skip();
      return;
    }

    // Check current page - if on dashboard, onboarding might be complete
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      // Check for onboarding banner/prompt
      const selectors = adapter.getSelectors();
      const onboardingBanner = page.locator(selectors.onboardingBanner);

      if (!(await onboardingBanner.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log('[Onboarding Journey] No onboarding banner found, may be complete');
      }
    }
  });

  test('should complete business details step', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to onboarding if not there
    const currentUrl = page.url();
    if (!currentUrl.includes('/onboarding')) {
      // Check if there's an onboarding prompt on dashboard
      const selectors = adapter.getSelectors();
      const onboardingBanner = page.locator(selectors.onboardingBanner);

      if (await onboardingBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click to start onboarding
        await onboardingBanner.click();
      } else {
        // Navigate directly
        await page.goto(`${adapter.getBaseUrl()}${routes.onboarding}`);
      }
    }

    // Wait for onboarding page to load
    await waitForLoading(page);

    // Screenshot: Onboarding start
    await takeScreenshot(page, {
      name: 'onboarding-start',
      subdir: `journeys/${personaId}`,
    });

    // Fill business name if present
    const businessNameInput = page.locator(
      'input[name="businessName"], input[name="organizationName"], input[placeholder*="Business"]'
    );
    if (await businessNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const persona = getPersona(personaId);
      await businessNameInput.fill(`${persona.displayName}'s Test Business`);
    }

    // Fill business type if present
    const businessTypeSelect = page.locator(
      'select[name="businessType"], [data-testid="business-type"]'
    );
    if (await businessTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await businessTypeSelect.selectOption({ index: 1 }); // Select first option
    }

    // Look for Next/Continue button
    const nextButton = page.locator(
      'button:has-text("Next"), button:has-text("Continue"), button:has-text("Save")'
    ).first();

    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextButton.click();
      await waitForLoading(page);
    }

    console.log('[Onboarding Journey] Business details step completed');
  });

  test('should configure currency', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    // Look for currency selection
    const currencySelect = page.locator(
      'select[name="currency"], [data-testid="currency-select"], [data-testid="currency-selector"]'
    );

    if (await currencySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Select GHS (Ghanaian Cedi) as it's Piro's default
      try {
        await currencySelect.selectOption('GHS');
      } catch {
        // Try clicking and selecting
        await currencySelect.click();
        await page.click('text=GHS');
      }

      console.log('[Onboarding Journey] Currency set to GHS');

      // Screenshot
      await takeScreenshot(page, {
        name: 'onboarding-currency',
        subdir: `journeys/${personaId}`,
      });

      // Next button
      const nextButton = page.locator(
        'button:has-text("Next"), button:has-text("Continue"), button:has-text("Save")'
      ).first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await waitForLoading(page);
      }
    } else {
      console.log('[Onboarding Journey] Currency step not found or already complete');
    }
  });

  test('should configure fiscal year', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    // Look for fiscal year selection
    const fiscalYearSelect = page.locator(
      'select[name="fiscalYearStart"], [data-testid="fiscal-year"]'
    );

    if (await fiscalYearSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Select January (month 1)
      await fiscalYearSelect.selectOption('1');

      console.log('[Onboarding Journey] Fiscal year configured');

      // Next button
      const nextButton = page.locator(
        'button:has-text("Next"), button:has-text("Continue"), button:has-text("Finish"), button:has-text("Complete")'
      ).first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await waitForLoading(page);
      }
    } else {
      console.log('[Onboarding Journey] Fiscal year step not found or already complete');
    }
  });

  test('should complete onboarding and reach dashboard', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Try to complete any remaining steps
    const finishButton = page.locator(
      'button:has-text("Finish"), button:has-text("Complete"), button:has-text("Get Started"), button:has-text("Go to Dashboard")'
    ).first();

    if (await finishButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finishButton.click();
    }

    // Wait for dashboard
    await page.waitForURL(
      (url) => url.pathname.includes('/dashboard'),
      { timeout: 30000 }
    ).catch(() => {
      // May already be on dashboard
    });

    // Verify we're on dashboard
    const dashboardSelector = adapter.getSelectors().dashboardMain;
    await expect(page.locator(dashboardSelector)).toBeVisible({ timeout: 10000 });

    // Screenshot: Dashboard after onboarding
    await takeScreenshot(page, {
      name: 'dashboard-after-onboarding',
      subdir: `journeys/${personaId}`,
    });

    console.log('[Onboarding Journey] Completed - now on dashboard');
  });

  test('should update persona profile to onboarded stage', async ({ personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Update persona lifecycle stage
    await adapter.updatePersonaStage(personaId, 'onboarded', 'onboarding.journey');

    console.log(`[Onboarding Journey] Persona ${personaId} updated to onboarded stage`);
  });
});

// =============================================================================
// Standalone Functions
// =============================================================================

/**
 * Check if onboarding is needed for a persona
 */
export async function isOnboardingNeeded(personaId: string): Promise<boolean> {
  const adapter = getAdapter();
  const profile = await adapter.getPersonaProfile(personaId);

  if (!profile) return true;
  return !isStageAtOrAfter(profile.lifecycleStage, 'onboarded');
}

/**
 * Run onboarding journey programmatically
 */
export async function runOnboardingJourney(personaId: string, page: import('@playwright/test').Page): Promise<void> {
  const adapter = getAdapter();
  const persona = getPersona(personaId);

  // Ensure logged in
  if (!(await adapter.isLoggedIn(page))) {
    await adapter.login(page, persona);
  }

  // Navigate to onboarding
  await page.goto(`${adapter.getBaseUrl()}/onboarding`);

  // Complete steps (simplified - real implementation would handle each step)
  await page.waitForTimeout(2000);

  // Try to finish
  const finishButton = page.locator('button:has-text("Finish"), button:has-text("Complete")').first();
  if (await finishButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await finishButton.click();
  }

  // Wait for dashboard
  await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 30000 });

  // Update profile
  await adapter.updatePersonaStage(personaId, 'onboarded', 'onboarding.journey');
}
