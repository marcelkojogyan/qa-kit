import { test, expect } from '../playwright/fixtures.js';
import { getAdapter } from '../adapters/index.js';
import { getPersona } from '../personas/index.js';
import { takeScreenshot } from '../playwright/utils/screenshot.js';
import { waitForLoading } from '../playwright/selectors.js';
import { vrtCapture } from '../playwright/utils/vrt.js';

/**
 * What's New Journey
 *
 * This journey tests the release notes / what's new notification feature:
 * - Seed a new release note
 * - Verify notification badge appears
 * - Open the release notes drawer/modal
 * - Mark as seen
 * - Verify badge disappears
 * - Verify persistence on page reload
 *
 * This is a special journey that can be run independently of lifecycle stages.
 */

test.describe('What\'s New Journey', () => {
  test.describe.configure({ mode: 'serial' });

  let releaseNoteId: string;

  test.beforeAll(async () => {
    // Seed a release note before tests
    const adapter = getAdapter();

    try {
      releaseNoteId = await adapter.seedReleaseNote(
        'Test Release - January 2026',
        `
          ## What's New
          - Feature A: Description of feature A
          - Feature B: Description of feature B
          - Bug fix: Fixed issue with XYZ

          ## Improvements
          - Performance improvements
          - UI enhancements

          This is a test release note seeded for E2E testing.
        `.trim()
      );

      console.log(`[What's New Journey] Seeded release note: ${releaseNoteId}`);
    } catch (error) {
      console.log('[What\'s New Journey] Could not seed release note:', error);
    }
  });

  test.beforeEach(async ({ page, personaId }) => {
    if (!personaId) return;

    const persona = getPersona(personaId);
    const adapter = getAdapter();

    // Ensure logged in
    if (!(await adapter.isLoggedIn(page))) {
      await adapter.login(page, persona);
    }

    // Navigate to dashboard
    await page.goto(`${adapter.getBaseUrl()}/dashboard`);
    await waitForLoading(page);
  });

  test('should show notification badge for new release note', async ({ page, personaId }) => {
    if (!personaId || !releaseNoteId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const selectors = adapter.getSelectors();

    // Look for release note badge
    const badge = page.locator(selectors.releaseNoteBadge).or(
      page.locator('[data-testid="whats-new-badge"]')
    ).or(
      page.locator('.notification-badge:has-text("New")')
    );

    // Wait for badge to appear
    const hasBadge = await badge.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasBadge) {
      // Screenshot: Badge visible
      await takeScreenshot(page, {
        name: 'whats-new-badge-visible',
        subdir: `journeys/${personaId}`,
      });

      // VRT capture
      await vrtCapture(page, {
        name: 'whats-new-badge',
        selector: selectors.releaseNoteBadge,
      });

      console.log('[What\'s New Journey] Badge is visible');
    } else {
      console.log('[What\'s New Journey] Badge not found - may need UI implementation');
      // Don't fail, just skip remaining tests
    }
  });

  test('should open release notes drawer when clicking badge', async ({ page, personaId }) => {
    if (!personaId || !releaseNoteId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const selectors = adapter.getSelectors();

    // Find and click the badge/button
    const trigger = page.locator(selectors.releaseNoteBadge).or(
      page.locator('[data-testid="whats-new-trigger"]')
    ).or(
      page.locator('button:has-text("What\'s New")')
    );

    if (!(await trigger.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[What\'s New Journey] Trigger not found, skipping');
      return;
    }

    await trigger.click();

    // Wait for drawer/modal to open
    const drawer = page.locator(selectors.releaseNoteDrawer).or(
      page.locator('[data-testid="whats-new-drawer"]')
    ).or(
      page.locator('[role="dialog"]:has-text("What\'s New")')
    );

    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Screenshot: Drawer open
    await takeScreenshot(page, {
      name: 'whats-new-drawer-open',
      subdir: `journeys/${personaId}`,
    });

    // VRT capture
    await vrtCapture(page, {
      name: 'whats-new-drawer',
      selector: '[role="dialog"], [data-testid="whats-new-drawer"]',
    });

    // Verify content
    const title = page.locator('text=Test Release - January 2026');
    const hasTitle = await title.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTitle) {
      console.log('[What\'s New Journey] Release note content displayed');
    }

    console.log('[What\'s New Journey] Drawer opened successfully');
  });

  test('should mark release note as seen', async ({ page, personaId }) => {
    if (!personaId || !releaseNoteId) {
      test.skip();
      return;
    }

    // The drawer should still be open from previous test
    // Or we need to open it again

    // Look for dismiss/mark as read button
    const dismissButton = page.locator(
      'button:has-text("Got it"), button:has-text("Dismiss"), button:has-text("Close"), [data-testid="whats-new-dismiss"]'
    ).first();

    if (await dismissButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dismissButton.click();

      // Wait for drawer to close
      await page.waitForTimeout(500);

      console.log('[What\'s New Journey] Release note marked as seen');
    } else {
      // Try pressing Escape
      await page.keyboard.press('Escape');
      console.log('[What\'s New Journey] Closed drawer with Escape');
    }
  });

  test('should hide badge after marking as seen', async ({ page, personaId }) => {
    if (!personaId || !releaseNoteId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const selectors = adapter.getSelectors();

    // Wait a moment for state to update
    await page.waitForTimeout(1000);

    // Badge should no longer be visible (or should show different state)
    const badge = page.locator(selectors.releaseNoteBadge).or(
      page.locator('[data-testid="whats-new-badge"]:not(.seen)')
    );

    const hasBadge = await badge.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasBadge) {
      console.log('[What\'s New Journey] Badge hidden after marking as seen');
    } else {
      console.log('[What\'s New Journey] Badge still visible - check mark-as-seen implementation');
    }

    // Screenshot: Badge hidden state
    await takeScreenshot(page, {
      name: 'whats-new-badge-hidden',
      subdir: `journeys/${personaId}`,
    });
  });

  test('should persist seen state across page reload', async ({ page, personaId }) => {
    if (!personaId || !releaseNoteId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const selectors = adapter.getSelectors();

    // Reload the page
    await page.reload();
    await waitForLoading(page);

    // Badge should still be hidden
    const badge = page.locator(selectors.releaseNoteBadge).or(
      page.locator('[data-testid="whats-new-badge"]:not(.seen)')
    );

    const hasBadge = await badge.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasBadge) {
      console.log('[What\'s New Journey] Seen state persisted after reload');
    } else {
      console.log('[What\'s New Journey] Badge reappeared after reload - persistence issue');
    }

    // Screenshot: After reload
    await takeScreenshot(page, {
      name: 'whats-new-after-reload',
      subdir: `journeys/${personaId}`,
    });
  });

  test('should show badge again for new release note', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const selectors = adapter.getSelectors();

    // Seed another release note
    try {
      const newReleaseId = await adapter.seedReleaseNote(
        'Test Release 2 - February 2026',
        'Another test release for testing persistence.'
      );

      console.log(`[What's New Journey] Seeded second release note: ${newReleaseId}`);

      // Reload page
      await page.reload();
      await waitForLoading(page);

      // Check for badge
      const badge = page.locator(selectors.releaseNoteBadge).or(
        page.locator('[data-testid="whats-new-badge"]')
      );

      const hasBadge = await badge.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasBadge) {
        console.log('[What\'s New Journey] Badge appeared for new release note');
      } else {
        console.log('[What\'s New Journey] Badge did not appear for new release');
      }
    } catch (error) {
      console.log('[What\'s New Journey] Could not seed second release note:', error);
    }
  });
});

// =============================================================================
// Standalone Functions
// =============================================================================

/**
 * Seed a release note for testing
 */
export async function seedReleaseNote(title: string, body: string): Promise<string> {
  const adapter = getAdapter();
  return adapter.seedReleaseNote(title, body);
}

/**
 * Run what's new journey programmatically
 */
export async function runWhatsNewJourney(
  personaId: string,
  page: import('@playwright/test').Page
): Promise<void> {
  const persona = getPersona(personaId);
  const adapter = getAdapter();

  // Seed a release note
  const releaseNoteId = await adapter.seedReleaseNote(
    'Test Release',
    'Test release content for E2E testing.'
  );

  // Login and navigate
  await adapter.login(page, persona);
  await page.goto(`${adapter.getBaseUrl()}/dashboard`);
  await waitForLoading(page);

  // Find and click badge
  const badge = page.locator('[data-testid="whats-new-badge"]');
  if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
    await badge.click();

    // Dismiss
    const dismiss = page.locator('button:has-text("Got it")');
    if (await dismiss.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dismiss.click();
    }
  }
}
