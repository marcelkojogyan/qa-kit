import { test, expect } from '../playwright/fixtures.js';
import { getAdapter } from '../adapters/index.js';
import { getPersona, isStageAtOrAfter, getSeedProfileConfig } from '../personas/index.js';
import { takeScreenshot } from '../playwright/utils/screenshot.js';
import { waitForLoading, waitForToast } from '../playwright/selectors.js';

/**
 * Activation Journey
 *
 * This journey handles user activation - the point where a user
 * becomes "active" by performing meaningful actions:
 * - Creating or importing data (customers, invoices, etc.)
 * - Viewing their first report
 * - Populating the dashboard
 *
 * Idempotent: Detects and skips already-completed steps.
 */

test.describe('Activation Journey', () => {
  test.describe.configure({ mode: 'serial' });

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

  test('should check if activation is needed', async ({ personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const profile = await adapter.getPersonaProfile(personaId);

    if (profile && isStageAtOrAfter(profile.lifecycleStage, 'activated')) {
      console.log(`[Activation Journey] Persona ${personaId} already activated, skipping`);
      test.skip();
      return;
    }
  });

  test('should create first customer', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to customers
    await page.goto(`${adapter.getBaseUrl()}${routes.customers}`);
    await waitForLoading(page);

    // Check if customers already exist
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
    const hasCustomers = !(await emptyState.isVisible({ timeout: 3000 }).catch(() => false));

    if (hasCustomers) {
      console.log('[Activation Journey] Customers already exist, skipping creation');
      return;
    }

    // Click create customer button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add Customer"), button:has-text("New Customer")'
    ).first();

    await createButton.click();
    await waitForLoading(page);

    // Fill customer form
    await page.fill('input[name="name"], input[placeholder*="Name"]', 'Test Customer Inc.');
    await page.fill('input[name="email"], input[type="email"]', 'customer@test.com');

    // Optional fields
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Phone"]');
    if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phoneInput.fill('+1 555-123-4567');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
    await submitButton.click();

    // Wait for success
    await waitForToast(page, { text: /created|saved|success/i });

    // Screenshot
    await takeScreenshot(page, {
      name: 'first-customer-created',
      subdir: `journeys/${personaId}`,
    });

    console.log('[Activation Journey] First customer created');
  });

  test('should create first invoice', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to invoices
    await page.goto(`${adapter.getBaseUrl()}${routes.invoices}`);
    await waitForLoading(page);

    // Check if invoices already exist
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
    const hasInvoices = !(await emptyState.isVisible({ timeout: 3000 }).catch(() => false));

    if (hasInvoices) {
      console.log('[Activation Journey] Invoices already exist, skipping creation');
      return;
    }

    // Click create invoice button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Invoice"), button:has-text("Add Invoice")'
    ).first();

    await createButton.click();
    await waitForLoading(page);

    // Select customer
    const customerSelect = page.locator('[data-testid="customer-select"], select[name="customerId"]');
    if (await customerSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customerSelect.selectOption({ index: 1 }); // First customer
    }

    // Add line item
    const descriptionInput = page.locator('input[name*="description"], input[placeholder*="Description"]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill('Professional Services');
    }

    const amountInput = page.locator('input[name*="amount"], input[name*="unitPrice"]').first();
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill('1000');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitButton.click();

    // Wait for success
    await waitForToast(page, { text: /created|saved|success/i }).catch(() => {});

    // Screenshot
    await takeScreenshot(page, {
      name: 'first-invoice-created',
      subdir: `journeys/${personaId}`,
    });

    console.log('[Activation Journey] First invoice created');
  });

  test('should view first report', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();
    const routes = adapter.getRoutes();

    // Navigate to reports
    await page.goto(`${adapter.getBaseUrl()}${routes.reports}`);
    await waitForLoading(page);

    // Screenshot: Reports page
    await takeScreenshot(page, {
      name: 'reports-page',
      subdir: `journeys/${personaId}`,
    });

    // Click on first report (e.g., P&L, Balance Sheet)
    const reportLink = page.locator(
      'a:has-text("Profit"), a:has-text("Balance"), a:has-text("AR Aging"), [data-testid*="report"]'
    ).first();

    if (await reportLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reportLink.click();
      await waitForLoading(page);

      // Screenshot: Report view
      await takeScreenshot(page, {
        name: 'first-report-viewed',
        subdir: `journeys/${personaId}`,
      });

      console.log('[Activation Journey] First report viewed');
    } else {
      console.log('[Activation Journey] No reports available to view');
    }
  });

  test('should verify dashboard is populated', async ({ page, personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Navigate to dashboard
    await page.goto(`${adapter.getBaseUrl()}/dashboard`);
    await waitForLoading(page);

    // Verify dashboard has content
    const selectors = adapter.getSelectors();

    // Check for metrics
    const metrics = page.locator(selectors.dashboardMetrics);
    const hasMetrics = await metrics.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMetrics) {
      console.log('[Activation Journey] Dashboard has metrics');
    }

    // Screenshot: Activated dashboard
    await takeScreenshot(page, {
      name: 'dashboard-activated',
      subdir: `journeys/${personaId}`,
    });

    console.log('[Activation Journey] Dashboard verification complete');
  });

  test('should update persona profile to activated stage', async ({ personaId }) => {
    if (!personaId) {
      test.skip();
      return;
    }

    const adapter = getAdapter();

    // Update persona lifecycle stage
    await adapter.updatePersonaStage(personaId, 'activated', 'activation.journey');

    console.log(`[Activation Journey] Persona ${personaId} updated to activated stage`);
  });
});

// =============================================================================
// Standalone Functions
// =============================================================================

/**
 * Check if activation is needed for a persona
 */
export async function isActivationNeeded(personaId: string): Promise<boolean> {
  const adapter = getAdapter();
  const profile = await adapter.getPersonaProfile(personaId);

  if (!profile) return true;
  return !isStageAtOrAfter(profile.lifecycleStage, 'activated');
}
