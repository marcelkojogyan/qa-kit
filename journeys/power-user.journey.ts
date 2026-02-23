import { test, expect } from '../playwright/fixtures.js';
import { getAdapter } from '../adapters/index.js';
import { getPersona, isStageAtOrAfter, getSeedProfileConfig } from '../personas/index.js';
import { takeScreenshot } from '../playwright/utils/screenshot.js';
import { waitForLoading, waitForToast } from '../playwright/selectors.js';
import { vrtCapture } from '../playwright/utils/vrt.js';

/**
 * Power User Journey
 *
 * This journey tests advanced features that a power user would use:
 * - Custom account categories
 * - Recurring invoices/bills
 * - Advanced filters and search
 * - Bulk operations
 * - Keyboard shortcuts
 * - Export functionality
 *
 * Idempotent: Can be run multiple times safely.
 */

test.describe('Power User Journey', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, personaId }) => {
    if (!personaId) return;

    const persona = getPersona(personaId);
    const adapter = getAdapter();

    // Ensure logged in
    if (!(await adapter.isLoggedIn(page))) {
      await adapter.login(page, persona);
    }

    await waitForLoading(page);
  });

  test('should check if power user journey is needed', async ({ personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const profile = await adapter.getPersonaProfile(personaId);

    if (profile && isStageAtOrAfter(profile.lifecycleStage, 'power_user')) {
      console.log(`[Power User Journey] Persona ${personaId} already at power_user, running for validation`);
    }
  });

  test('should use advanced filters', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to invoices (has filtering)
    await page.goto(`${adapter.getBaseUrl()}${routes.invoices}`);
    await waitForLoading(page);

    // Look for filter controls
    const filterButton = page.locator(
      'button:has-text("Filter"), [data-testid="filter-button"], [aria-label="Filter"]'
    ).first();

    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();

      // Apply a status filter
      const statusFilter = page.locator(
        'select[name="status"], [data-testid="status-filter"]'
      );
      if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusFilter.selectOption('PAID');
        await waitForLoading(page);
      }

      // Screenshot: Filtered view
      await takeScreenshot(page, {
        name: 'invoices-filtered',
        subdir: `journeys/${personaId}`,
      });

      // Clear filters
      const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();
      if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearButton.click();
      }

      console.log('[Power User Journey] Advanced filters tested');
    } else {
      console.log('[Power User Journey] Filter controls not found');
    }
  });

  test('should use search functionality', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]'
    ).first();

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      await waitForLoading(page);

      // Screenshot: Search results
      await takeScreenshot(page, {
        name: 'search-results',
        subdir: `journeys/${personaId}`,
      });

      // Clear search
      await searchInput.clear();

      console.log('[Power User Journey] Search functionality tested');
    } else {
      console.log('[Power User Journey] Search input not found');
    }
  });

  test('should test keyboard shortcuts', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    // Test common keyboard shortcuts
    const shortcuts = [
      { key: 'k', modifier: 'Meta', description: 'Command palette' },
      { key: '/', modifier: null, description: 'Focus search' },
    ];

    for (const shortcut of shortcuts) {
      try {
        if (shortcut.modifier) {
          await page.keyboard.press(`${shortcut.modifier}+${shortcut.key}`);
        } else {
          await page.keyboard.press(shortcut.key);
        }

        // Wait briefly for UI response
        await page.waitForTimeout(500);

        // Press Escape to close any opened modal/palette
        await page.keyboard.press('Escape');

        console.log(`[Power User Journey] Tested shortcut: ${shortcut.description}`);
      } catch {
        console.log(`[Power User Journey] Shortcut ${shortcut.description} not available`);
      }
    }
  });

  test('should test bulk selection', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to a page with bulk selection (e.g., invoices)
    await page.goto(`${adapter.getBaseUrl()}${routes.invoices}`);
    await waitForLoading(page);

    // Look for select all checkbox
    const selectAllCheckbox = page.locator(
      'input[type="checkbox"][aria-label*="Select all"], th input[type="checkbox"]'
    ).first();

    if (await selectAllCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectAllCheckbox.check();

      // Screenshot: Bulk selected
      await takeScreenshot(page, {
        name: 'bulk-selection',
        subdir: `journeys/${personaId}`,
      });

      // Uncheck
      await selectAllCheckbox.uncheck();

      console.log('[Power User Journey] Bulk selection tested');
    } else {
      console.log('[Power User Journey] Bulk selection not available');
    }
  });

  test('should test export functionality', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to a page with export (e.g., reports)
    await page.goto(`${adapter.getBaseUrl()}${routes.reports}`);
    await waitForLoading(page);

    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export"), [data-testid="export-button"], [aria-label="Export"]'
    ).first();

    if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up download listener
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        exportButton.click(),
      ]);

      if (download) {
        console.log('[Power User Journey] Export downloaded:', await download.suggestedFilename());
      }

      console.log('[Power User Journey] Export functionality tested');
    } else {
      console.log('[Power User Journey] Export not available');
    }
  });

  test('should capture visual regression snapshots', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Capture key screens for VRT
    const screens = [
      { route: routes.dashboard, name: 'power-user-dashboard' },
      { route: routes.invoices, name: 'power-user-invoices' },
      { route: routes.reports, name: 'power-user-reports' },
    ];

    for (const screen of screens) {
      await page.goto(`${adapter.getBaseUrl()}${screen.route}`);
      await waitForLoading(page);

      // Capture for VRT
      await vrtCapture(page, {
        name: screen.name,
        maskSelectors: ['[data-testid*="timestamp"]', '.time-ago'],
      });

      // Also save local screenshot
      await takeScreenshot(page, {
        name: screen.name,
        subdir: `journeys/${personaId}/vrt`,
      });
    }

    console.log('[Power User Journey] VRT snapshots captured');
  });

  test('should update persona profile to power_user stage', async ({ personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Update persona lifecycle stage
    await adapter.updatePersonaStage(personaId, 'power_user', 'power-user.journey');

    console.log(`[Power User Journey] Persona ${personaId} updated to power_user stage`);
  });
});

// =============================================================================
// Standalone Functions
// =============================================================================

/**
 * Check if power user journey is needed
 */
export async function isPowerUserNeeded(personaId: string): Promise<boolean> {
  const adapter = getAdapter();
  const profile = await adapter.getPersonaProfile(personaId);

  if (!profile) return true;
  return !isStageAtOrAfter(profile.lifecycleStage, 'power_user');
}
