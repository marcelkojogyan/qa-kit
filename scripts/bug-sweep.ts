#!/usr/bin/env tsx
/**
 * Bug Sweep Script
 *
 * Standalone Playwright script that crawls every Piro page and attempts CRUD forms,
 * capturing all errors for comprehensive bug reporting.
 *
 * Usage:
 *   pnpm qa:sweep
 *   pnpm qa:sweep:headless
 *   E2E_SWEEP_EMAIL=test@example.com E2E_SWEEP_PASSWORD=password pnpm qa:sweep
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// =============================================================================
// Configuration
// =============================================================================

interface BugReport {
  timestamp: string;
  targetUrl: string;
  bugs: Bug[];
  pagesVisited: number;
  bugsFound: number;
  summary: string;
}

interface Bug {
  page: string;
  action: string;
  error: string;
  type: 'validation_error' | 'console_error' | 'network_error' | 'exception' | 'ui_error';
  screenshot?: string;
  consoleErrors: string[];
  networkErrors: NetworkError[];
}

interface NetworkError {
  url: string;
  status: number;
  body?: string;
}

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const SWEEP_EMAIL = process.env.E2E_SWEEP_EMAIL;
const SWEEP_PASSWORD = process.env.E2E_SWEEP_PASSWORD;
const ARTIFACTS_DIR = path.resolve(__dirname, '../artifacts');
const SCREENSHOTS_DIR = path.resolve(ARTIFACTS_DIR, 'bug-sweep-screenshots');

// Ensure required environment variables
if (!SWEEP_EMAIL || !SWEEP_PASSWORD) {
  throw new Error('E2E_SWEEP_EMAIL and E2E_SWEEP_PASSWORD environment variables are required');
}

// Target pages for comprehensive testing
const TARGET_PAGES = [
  { path: '/invoices', name: 'invoices', hasCreate: true },
  { path: '/bills', name: 'bills', hasCreate: true },
  { path: '/expenses', name: 'expenses', hasCreate: true },
  { path: '/customers', name: 'customers', hasCreate: true },
  { path: '/vendors', name: 'vendors', hasCreate: true },
  { path: '/payments', name: 'payments', hasCreate: true },
  { path: '/accounts', name: 'accounts', hasCreate: true },
  { path: '/journal', name: 'journal', hasCreate: false },
  { path: '/reports', name: 'reports', hasCreate: false },
  { path: '/settings', name: 'settings', hasCreate: false },
  { path: '/dashboard', name: 'dashboard', hasCreate: false },
  { path: '/audit-log', name: 'audit-log', hasCreate: false },
  { path: '/bank-reconciliation', name: 'bank-reconciliation', hasCreate: false },
  { path: '/recurring', name: 'recurring', hasCreate: true },
] as const;

// Test data for CRUD operations
const TEST_DATA = {
  invoice: {
    customer: 'Test Corp',
    lineItem: 'Consulting',
    qty: 1,
    unitPrice: 500,
    taxRate: 15,
  },
  bill: {
    vendor: 'Office Supply Co',
    lineItem: 'Paper',
    qty: 10,
    unitPrice: 25,
  },
  expense: {
    vendor: 'Uber',
    amount: 45.50,
    category: 'Transport',
  },
  customer: {
    name: 'Bug Sweep Corp',
    email: 'sweep@test.com',
  },
  vendor: {
    name: 'Sweep Vendor LLC',
    email: 'vendor@sweep.com',
  },
} as const;

// =============================================================================
// Bug Sweep Test
// =============================================================================

test.describe('Bug Sweep - Comprehensive CRUD Testing', () => {
  let context: BrowserContext;
  let page: Page;
  let bugs: Bug[] = [];
  let consoleErrors: string[] = [];
  let networkErrors: NetworkError[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create directories
    if (!fs.existsSync(ARTIFACTS_DIR)) {
      fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Create context and page
    context = await browser.newContext();
    page = await context.newPage();

    // Set up error listeners
    setupErrorListeners(page);

    // Authenticate
    await authenticateUser(page);
  });

  test.afterAll(async () => {
    // Generate final report
    const report: BugReport = {
      timestamp: new Date().toISOString(),
      targetUrl: BASE_URL,
      bugs,
      pagesVisited: TARGET_PAGES.length,
      bugsFound: bugs.length,
      summary: generateSummary(),
    };

    // Write report to file
    const reportPath = path.join(ARTIFACTS_DIR, 'bug-sweep-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n=== BUG SWEEP COMPLETE ===`);
    console.log(`Pages visited: ${report.pagesVisited}`);
    console.log(`Bugs found: ${report.bugsFound}`);
    console.log(`Report saved: ${reportPath}`);

    await context.close();
  });

  // Test each page
  for (const targetPage of TARGET_PAGES) {
    test(`Bug sweep: ${targetPage.name}`, async () => {
      console.log(`\n--- Testing ${targetPage.name} ---`);
      
      try {
        await testPage(page, targetPage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Error testing ${targetPage.name}: ${errorMessage}`);
        
        await captureBug({
          page: targetPage.path,
          action: 'page navigation',
          error: errorMessage,
          type: 'exception',
        });
      }
    });
  }

  // =============================================================================
  // Helper Functions
  // =============================================================================

  async function authenticateUser(page: Page): Promise<void> {
    console.log('Authenticating user...');
    
    try {
      await page.goto(`${BASE_URL}/login`);
      
      // Wait for login form with multiple fallbacks
      const emailSelector = await page.waitForSelector([
        '[data-testid="input-login-email"]',
        'input[type="email"]',
        'input[name="email"]'
      ].join(', '), { timeout: 10000 });
      
      const passwordSelector = await page.waitForSelector([
        '[data-testid="input-login-password"]',
        'input[type="password"]',
        'input[name="password"]'
      ].join(', '), { timeout: 5000 });

      // Fill credentials
      await emailSelector.fill(SWEEP_EMAIL!);
      await passwordSelector.fill(SWEEP_PASSWORD!);
      
      // Submit form
      const submitButton = await page.$(
        '[data-testid="btn-login-submit"], button[type="submit"], button:has-text("Sign in")'
      );
      
      if (submitButton) {
        await submitButton.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // Wait for navigation to dashboard or any authenticated page
      await page.waitForURL(/\/(dashboard|customers|invoices)/, { timeout: 15000 });
      console.log('Authentication successful');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Authentication failed: ${errorMessage}`);
      
      await captureBug({
        page: '/login',
        action: 'authentication',
        error: errorMessage,
        type: 'exception',
      });
      
      throw error;
    }
  }

  async function testPage(page: Page, targetPage: typeof TARGET_PAGES[number]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Navigate to page
      console.log(`Navigating to ${targetPage.path}...`);
      await page.goto(`${BASE_URL}${targetPage.path}`, { timeout: 30000 });
      
      // Wait for page to load
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Check for basic page load success
      await checkPageLoadSuccess(page, targetPage);
      
      // If page has create functionality, test CRUD operations
      if (targetPage.hasCreate) {
        await testCRUDOperations(page, targetPage);
      } else {
        // For non-CRUD pages, just verify they load without errors
        await verifyPageContent(page, targetPage);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✓ ${targetPage.name} tested successfully (${duration}ms)`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`✗ Error testing ${targetPage.name}: ${errorMessage}`);
      
      await captureBug({
        page: targetPage.path,
        action: 'page test',
        error: errorMessage,
        type: 'exception',
      });
    }
  }

  async function checkPageLoadSuccess(page: Page, targetPage: typeof TARGET_PAGES[number]): Promise<void> {
    // Check for common error indicators
    const errorIndicators = [
      '.error',
      '[role="alert"]',
      '.alert-error',
      '[data-testid^="alert-"]',
      '.toast-error'
    ];
    
    for (const selector of errorIndicators) {
      const errorElement = await page.$(selector);
      if (errorElement) {
        const errorText = await errorElement.textContent();
        if (errorText) {
          await captureBug({
            page: targetPage.path,
            action: 'page load',
            error: errorText,
            type: 'ui_error',
          });
        }
      }
    }
    
    // Check for loading states that never resolve
    const loadingSpinner = await page.$('.animate-spin');
    if (loadingSpinner) {
      // Wait a bit to see if loading resolves
      await page.waitForTimeout(3000);
      const stillLoading = await page.$('.animate-spin');
      if (stillLoading) {
        await captureBug({
          page: targetPage.path,
          action: 'page load',
          error: 'Page stuck in loading state',
          type: 'ui_error',
        });
      }
    }
  }

  async function verifyPageContent(page: Page, targetPage: typeof TARGET_PAGES[number]): Promise<void> {
    // Basic content verification for non-CRUD pages
    const bodyText = await page.textContent('body');
    
    if (!bodyText || bodyText.trim().length === 0) {
      await captureBug({
        page: targetPage.path,
        action: 'content verification',
        error: 'Page appears to be empty',
        type: 'ui_error',
      });
    }
    
    // Check for specific error messages
    if (bodyText?.includes('404') || bodyText?.includes('Not Found')) {
      await captureBug({
        page: targetPage.path,
        action: 'content verification',
        error: 'Page shows 404 or Not Found',
        type: 'ui_error',
      });
    }
  }

  async function testCRUDOperations(page: Page, targetPage: typeof TARGET_PAGES[number]): Promise<void> {
    // Look for create button with multiple fallback selectors
    const createButtonSelectors = [
      `[data-testid="btn-${targetPage.name.slice(0, -1)}-create"]`, // Remove 's' for singular
      '[data-testid*="create"]',
      'button:has-text("Create")',
      'button:has-text("New")',
      'button:has-text("Add")',
      '[aria-label*="Create"]',
      '[aria-label*="Add"]'
    ];
    
    let createButton = null;
    for (const selector of createButtonSelectors) {
      createButton = await page.$(selector);
      if (createButton) break;
    }
    
    if (!createButton) {
      console.log(`No create button found for ${targetPage.name}`);
      return;
    }
    
    console.log(`Testing create operation for ${targetPage.name}...`);
    
    try {
      // Click create button
      await createButton.click();
      
      // Wait for modal or form to appear
      await page.waitForSelector([
        '[role="dialog"]',
        '.modal',
        '[data-testid*="modal"]',
        '[data-testid*="form"]',
        'form'
      ].join(', '), { timeout: 5000 });
      
      // Fill form based on page type
      await fillCreateForm(page, targetPage.name);
      
      // Submit form
      await submitCreateForm(page, targetPage);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`CRUD test failed for ${targetPage.name}: ${errorMessage}`);
      
      await captureBug({
        page: targetPage.path,
        action: `create ${targetPage.name.slice(0, -1)}`,
        error: errorMessage,
        type: 'exception',
      });
    }
  }

  async function fillCreateForm(page: Page, entityType: string): Promise<void> {
    const entitySingular = entityType.slice(0, -1); // Remove 's'
    
    switch (entityType) {
      case 'invoices':
        await fillInvoiceForm(page);
        break;
      case 'bills':
        await fillBillForm(page);
        break;
      case 'expenses':
        await fillExpenseForm(page);
        break;
      case 'customers':
        await fillCustomerForm(page);
        break;
      case 'vendors':
        await fillVendorForm(page);
        break;
      default:
        // Generic form filling for other types
        await fillGenericForm(page);
        break;
    }
  }

  async function fillInvoiceForm(page: Page): Promise<void> {
    const data = TEST_DATA.invoice;
    
    // Customer field
    await fillFieldSafely(page, [
      '[data-testid="select-customer"]',
      '[data-testid*="customer"]',
      'select[name="customer"]',
      'input[name="customer"]'
    ], data.customer);
    
    // Line item description
    await fillFieldSafely(page, [
      '[data-testid="input-line-item-description"]',
      '[data-testid*="description"]',
      'input[name="description"]',
      'textarea[name="description"]'
    ], data.lineItem);
    
    // Quantity
    await fillFieldSafely(page, [
      '[data-testid="input-quantity"]',
      '[data-testid*="qty"]',
      'input[name="quantity"]',
      'input[name="qty"]'
    ], data.qty.toString());
    
    // Unit price
    await fillFieldSafely(page, [
      '[data-testid="input-unit-price"]',
      '[data-testid*="price"]',
      'input[name="unitPrice"]',
      'input[name="price"]'
    ], data.unitPrice.toString());
    
    // Tax rate
    await fillFieldSafely(page, [
      '[data-testid="input-tax-rate"]',
      '[data-testid*="tax"]',
      'input[name="taxRate"]',
      'input[name="tax"]'
    ], data.taxRate.toString());
  }

  async function fillBillForm(page: Page): Promise<void> {
    const data = TEST_DATA.bill;
    
    await fillFieldSafely(page, [
      '[data-testid="select-vendor"]',
      '[data-testid*="vendor"]',
      'select[name="vendor"]'
    ], data.vendor);
    
    await fillFieldSafely(page, [
      '[data-testid="input-line-item-description"]',
      '[data-testid*="description"]',
      'input[name="description"]'
    ], data.lineItem);
    
    await fillFieldSafely(page, [
      '[data-testid="input-quantity"]',
      'input[name="quantity"]'
    ], data.qty.toString());
    
    await fillFieldSafely(page, [
      '[data-testid="input-unit-price"]',
      'input[name="unitPrice"]'
    ], data.unitPrice.toString());
  }

  async function fillExpenseForm(page: Page): Promise<void> {
    const data = TEST_DATA.expense;
    
    await fillFieldSafely(page, [
      '[data-testid="select-vendor"]',
      '[data-testid*="vendor"]',
      'select[name="vendor"]'
    ], data.vendor);
    
    await fillFieldSafely(page, [
      '[data-testid="input-amount"]',
      '[data-testid*="amount"]',
      'input[name="amount"]'
    ], data.amount.toString());
    
    await fillFieldSafely(page, [
      '[data-testid="select-category"]',
      '[data-testid*="category"]',
      'select[name="category"]'
    ], data.category);
  }

  async function fillCustomerForm(page: Page): Promise<void> {
    const data = TEST_DATA.customer;
    
    await fillFieldSafely(page, [
      '[data-testid="input-customer-name"]',
      '[data-testid*="name"]',
      'input[name="name"]'
    ], data.name);
    
    await fillFieldSafely(page, [
      '[data-testid="input-customer-email"]',
      '[data-testid*="email"]',
      'input[name="email"]'
    ], data.email);
  }

  async function fillVendorForm(page: Page): Promise<void> {
    const data = TEST_DATA.vendor;
    
    await fillFieldSafely(page, [
      '[data-testid="input-vendor-name"]',
      '[data-testid*="name"]',
      'input[name="name"]'
    ], data.name);
    
    await fillFieldSafely(page, [
      '[data-testid="input-vendor-email"]',
      '[data-testid*="email"]',
      'input[name="email"]'
    ], data.email);
  }

  async function fillGenericForm(page: Page): Promise<void> {
    // Generic form filling - find common input types and fill with reasonable values
    const inputs = await page.$$('input[type="text"], input[type="email"], textarea, select');
    
    for (let i = 0; i < Math.min(inputs.length, 3); i++) {
      const input = inputs[i];
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());
      const type = await input.evaluate(el => el.getAttribute('type'));
      const name = await input.evaluate(el => el.getAttribute('name'));
      
      try {
        if (type === 'email' || name?.includes('email')) {
          await input.fill('test@example.com');
        } else if (tagName === 'select') {
          const options = await input.$$('option');
          if (options.length > 1) {
            await input.selectOption({ index: 1 });
          }
        } else {
          await input.fill(`Test ${name || 'Value'} ${Date.now()}`);
        }
      } catch (error) {
        console.log(`Could not fill input ${name}: ${error}`);
      }
    }
  }

  async function fillFieldSafely(page: Page, selectors: string[], value: string): Promise<void> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          
          if (tagName === 'select') {
            // For select elements, try to find option by text or value
            const options = await element.$$('option');
            for (const option of options) {
              const optionText = await option.textContent();
              const optionValue = await option.getAttribute('value');
              if (optionText?.includes(value) || optionValue?.includes(value)) {
                await element.selectOption(optionValue || optionText || '');
                return;
              }
            }
            // If no matching option, select first non-empty option
            if (options.length > 1) {
              await element.selectOption({ index: 1 });
              return;
            }
          } else {
            // For input elements
            await element.fill(value);
            return;
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    console.log(`Could not find or fill field with selectors: ${selectors.join(', ')}`);
  }

  async function submitCreateForm(page: Page, targetPage: typeof TARGET_PAGES[number]): Promise<void> {
    // Look for submit button
    const submitSelectors = [
      '[data-testid*="save"]',
      '[data-testid*="submit"]',
      '[data-testid*="create"]',
      'button[type="submit"]',
      'button:has-text("Save")',
      'button:has-text("Create")',
      'button:has-text("Submit")'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }
    
    if (!submitButton) {
      throw new Error('No submit button found');
    }
    
    // Click submit
    await submitButton.click();
    
    // Wait for either success or validation errors
    await Promise.race([
      // Success: modal closes or navigates away
      page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 10000 }),
      // Error: validation messages appear
      page.waitForSelector('[role="alert"], .toast, [data-testid^="alert-"]', { timeout: 10000 }),
      // Network response
      page.waitForResponse(response => response.url().includes('/api/'), { timeout: 10000 })
    ]).catch(() => {
      // Timeout is acceptable - might be slow network
    });
    
    // Check for validation errors
    await checkForValidationErrors(page, targetPage);
  }

  async function checkForValidationErrors(page: Page, targetPage: typeof TARGET_PAGES[number]): Promise<void> {
    const errorSelectors = [
      '[role="alert"]',
      '.toast-error',
      '[data-sonner-toast]',
      '[data-testid^="alert-"]',
      '.error-message',
      '.form-error'
    ];
    
    for (const selector of errorSelectors) {
      const errorElements = await page.$$(selector);
      
      for (const errorElement of errorElements) {
        const errorText = await errorElement.textContent();
        if (errorText && errorText.trim()) {
          console.log(`Validation error found: ${errorText}`);
          
          await captureBug({
            page: targetPage.path,
            action: `create ${targetPage.name.slice(0, -1)}`,
            error: errorText,
            type: 'validation_error',
          });
        }
      }
    }
  }

  function setupErrorListeners(page: Page): void {
    // Console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = `Console Error: ${msg.text()}`;
        consoleErrors.push(error);
        console.log(`🔴 ${error}`);
      }
    });
    
    // Unhandled exceptions
    page.on('pageerror', error => {
      const errorMessage = `Page Exception: ${error.message}`;
      consoleErrors.push(errorMessage);
      console.log(`💥 ${errorMessage}`);
    });
    
    // Network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        const networkError: NetworkError = {
          url: response.url(),
          status: response.status(),
        };
        
        response.text().then(body => {
          networkError.body = body.substring(0, 500); // Limit body size
        }).catch(() => {
          // Body might not be available
        });
        
        networkErrors.push(networkError);
        console.log(`🌐 Network Error: ${response.status()} ${response.url()}`);
      }
    });
  }

  async function captureBug(bugData: Omit<Bug, 'consoleErrors' | 'networkErrors' | 'screenshot'>): Promise<void> {
    const bug: Bug = {
      ...bugData,
      consoleErrors: [...consoleErrors],
      networkErrors: [...networkErrors],
    };
    
    // Take screenshot
    try {
      const timestamp = Date.now();
      const screenshotName = `${bugData.page.replace(/\//g, '_')}_${bugData.type}_${timestamp}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        timeout: 5000 
      });
      
      bug.screenshot = screenshotName;
      console.log(`📸 Screenshot saved: ${screenshotName}`);
      
    } catch (error) {
      console.log(`Failed to capture screenshot: ${error}`);
    }
    
    bugs.push(bug);
    
    // Clear error arrays for next test
    consoleErrors = [];
    networkErrors = [];
  }

  function generateSummary(): string {
    const errorTypes = bugs.reduce((acc, bug) => {
      acc[bug.type] = (acc[bug.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const pageErrors = bugs.reduce((acc, bug) => {
      acc[bug.page] = (acc[bug.page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      `Bug sweep completed at ${new Date().toLocaleString()}`,
      `Total pages tested: ${TARGET_PAGES.length}`,
      `Total bugs found: ${bugs.length}`,
      `Error types: ${Object.entries(errorTypes).map(([type, count]) => `${type}: ${count}`).join(', ') || 'none'}`,
      `Pages with errors: ${Object.entries(pageErrors).map(([page, count]) => `${page}: ${count}`).join(', ') || 'none'}`,
      bugs.length === 0 ? '✅ All tests passed successfully!' : `❌ ${bugs.length} issues found requiring attention`,
    ].join('\n');
  }
});