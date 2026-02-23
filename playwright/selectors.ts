import type { Page, Locator } from '@playwright/test';
import { getAdapter } from '../adapters/index.js';

// =============================================================================
// Selector Utilities
// =============================================================================

/**
 * Get a data-testid selector string
 */
export function testId(id: string): string {
  return `[data-testid="${id}"]`;
}

/**
 * Get a partial data-testid selector (contains)
 */
export function testIdContains(partial: string): string {
  return `[data-testid*="${partial}"]`;
}

/**
 * Get a data-testid selector that starts with
 */
export function testIdStartsWith(prefix: string): string {
  return `[data-testid^="${prefix}"]`;
}

/**
 * Get a data-testid selector that ends with
 */
export function testIdEndsWith(suffix: string): string {
  return `[data-testid$="${suffix}"]`;
}

/**
 * Combine multiple selectors with OR
 */
export function anyOf(...selectors: string[]): string {
  return selectors.join(', ');
}

/**
 * Combine selectors with descendant relationship
 */
export function within(parent: string, child: string): string {
  return `${parent} ${child}`;
}

/**
 * Get aria-label selector
 */
export function ariaLabel(label: string): string {
  return `[aria-label="${label}"]`;
}

/**
 * Get role selector
 */
export function role(roleName: string, options?: { name?: string }): string {
  if (options?.name) {
    return `[role="${roleName}"][aria-label="${options.name}"], [role="${roleName}"][name="${options.name}"]`;
  }
  return `[role="${roleName}"]`;
}

// =============================================================================
// Locator Helpers
// =============================================================================

/**
 * Get locator by data-testid
 */
export function byTestId(page: Page, id: string): Locator {
  return page.locator(testId(id));
}

/**
 * Get locator by role
 */
export function byRole(page: Page, roleName: string, options?: Parameters<Page['getByRole']>[1]): Locator {
  return page.getByRole(roleName as Parameters<Page['getByRole']>[0], options);
}

/**
 * Get locator by text
 */
export function byText(page: Page, text: string | RegExp, options?: { exact?: boolean }): Locator {
  return page.getByText(text, options);
}

/**
 * Get locator by label
 */
export function byLabel(page: Page, label: string | RegExp): Locator {
  return page.getByLabel(label);
}

/**
 * Get locator by placeholder
 */
export function byPlaceholder(page: Page, placeholder: string | RegExp): Locator {
  return page.getByPlaceholder(placeholder);
}

/**
 * Get locator by alt text (for images)
 */
export function byAltText(page: Page, altText: string | RegExp): Locator {
  return page.getByAltText(altText);
}

// =============================================================================
// Common Element Locators
// =============================================================================

/**
 * Get common UI element locators from adapter
 */
export function getSelectors(page: Page) {
  const adapter = getAdapter();
  const selectorMap = adapter.getSelectors();

  return {
    // Navigation
    sidebar: page.locator(selectorMap.sidebarNav),
    dashboard: page.locator(selectorMap.navDashboard),
    customers: page.locator(selectorMap.navCustomers),
    invoices: page.locator(selectorMap.navInvoices),
    vendors: page.locator(selectorMap.navVendors),
    bills: page.locator(selectorMap.navBills),
    expenses: page.locator(selectorMap.navExpenses),
    accounts: page.locator(selectorMap.navAccounts),
    journal: page.locator(selectorMap.navJournal),
    reports: page.locator(selectorMap.navReports),
    settings: page.locator(selectorMap.navSettings),
    mobileMenu: page.locator(selectorMap.mobileMenuButton),

    // Dashboard
    dashboardMain: page.locator(selectorMap.dashboardMain),
    metrics: page.locator(selectorMap.dashboardMetrics),
    charts: page.locator(selectorMap.dashboardCharts),
    onboardingBanner: page.locator(selectorMap.onboardingBanner),

    // Notifications
    notificationBadge: page.locator(selectorMap.notificationBadge),
    notificationDrawer: page.locator(selectorMap.notificationDrawer),
    releaseNoteBadge: page.locator(selectorMap.releaseNoteBadge),

    // Common
    modal: page.locator(selectorMap.modal),
    modalClose: page.locator(selectorMap.modalClose),
    toast: page.locator(selectorMap.toast),
    spinner: page.locator(selectorMap.loadingSpinner),
    emptyState: page.locator(selectorMap.emptyState),

    // Tables
    table: page.locator(selectorMap.dataTable),
    tableRows: page.locator(selectorMap.tableRow),
    pagination: page.locator(selectorMap.pagination),

    // Forms
    submitButton: page.locator(selectorMap.formSubmit),
    cancelButton: page.locator(selectorMap.formCancel),
    formError: page.locator(selectorMap.formError),

    // Auth
    loginEmail: page.locator(selectorMap.loginEmailInput),
    loginPassword: page.locator(selectorMap.loginPasswordInput),
    loginSubmit: page.locator(selectorMap.loginSubmitButton),
    logoutButton: page.locator(selectorMap.logoutButton),
  };
}

// =============================================================================
// Button Helpers
// =============================================================================

/**
 * Get button by text content
 */
export function buttonByText(page: Page, text: string): Locator {
  return page.locator(`button:has-text("${text}"), [role="button"]:has-text("${text}")`);
}

/**
 * Get primary/submit button
 */
export function primaryButton(page: Page): Locator {
  return page.locator('button[type="submit"], button.btn-primary, [data-testid="primary-button"]');
}

/**
 * Get cancel button
 */
export function cancelButton(page: Page): Locator {
  return page.locator('button:has-text("Cancel"), [data-testid="cancel-button"]');
}

// =============================================================================
// Form Helpers
// =============================================================================

/**
 * Get form input by name
 */
export function inputByName(page: Page, name: string): Locator {
  return page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
}

/**
 * Get form field by label text
 */
export function fieldByLabel(page: Page, labelText: string): Locator {
  return page.getByLabel(labelText);
}

// =============================================================================
// Table Helpers
// =============================================================================

/**
 * Get table row by text content
 */
export function tableRowByText(page: Page, text: string): Locator {
  return page.locator(`tr:has-text("${text}")`);
}

/**
 * Get table cell by column and row text
 */
export function tableCellByRowAndColumn(page: Page, rowText: string, columnIndex: number): Locator {
  return page.locator(`tr:has-text("${rowText}") td:nth-child(${columnIndex + 1})`);
}

/**
 * Get table header by text
 */
export function tableHeaderByText(page: Page, text: string): Locator {
  return page.locator(`th:has-text("${text}")`);
}

// =============================================================================
// Modal Helpers
// =============================================================================

/**
 * Get modal by title
 */
export function modalByTitle(page: Page, title: string): Locator {
  return page.locator(`[role="dialog"]:has-text("${title}"), .modal:has-text("${title}")`);
}

/**
 * Check if any modal is open
 */
export async function isModalOpen(page: Page): Promise<boolean> {
  const adapter = getAdapter();
  const modalSelector = adapter.getSelectors().modal;
  return page.locator(modalSelector).isVisible();
}

/**
 * Close any open modal
 */
export async function closeModal(page: Page): Promise<void> {
  const adapter = getAdapter();
  const closeSelector = adapter.getSelectors().modalClose;

  const closeButton = page.locator(closeSelector);
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Try pressing Escape
    await page.keyboard.press('Escape');
  }
}

// =============================================================================
// Waiting Helpers
// =============================================================================

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, options?: {
  text?: string | RegExp;
  timeout?: number;
}): Promise<Locator> {
  const adapter = getAdapter();
  const toastSelector = adapter.getSelectors().toast;

  let locator = page.locator(toastSelector);

  if (options?.text) {
    locator = locator.filter({ hasText: options.text });
  }

  await locator.waitFor({ timeout: options?.timeout ?? 5000 });
  return locator;
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page, options?: { timeout?: number }): Promise<void> {
  const adapter = getAdapter();
  const spinnerSelector = adapter.getSelectors().loadingSpinner;

  await page.locator(spinnerSelector).waitFor({
    state: 'hidden',
    timeout: options?.timeout ?? 30000,
  });
}
