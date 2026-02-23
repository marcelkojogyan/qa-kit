import type { Page } from '@playwright/test';
import {
  BaseAdapter,
  type Persona,
  type PersonaProfile,
  type LifecycleStage,
  type SeedProfile,
  type SelectorMap,
  type RouteMap,
} from './base.adapter.js';
import {
  getE2EClient,
  type BootstrapResponse,
  type SeedDataResponse,
} from './piro/piro.e2e.client.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for resetting a persona
 */
export interface ResetOptions {
  /** Full reset - delete all data and reset to signup stage */
  fullReset?: boolean;
  /** Reset to a specific lifecycle stage */
  targetStage?: 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER';
}

/**
 * Extended bootstrap response with all details
 */
export interface BootstrapResult {
  profile: PersonaProfile;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  organization: {
    id: string;
    name: string;
  };
  isNew: boolean;
  seeded?: {
    customers: number;
    vendors: number;
    invoices: number;
    bills: number;
    expenses: number;
  };
}

// =============================================================================
// Piro Adapter
// =============================================================================

/**
 * Piro-specific adapter implementation.
 * Implements all the app-specific selectors, routes, and behaviors for Piro.
 */
export class PiroAdapter extends BaseAdapter {
  readonly appName = 'piro';

  private readonly baseUrl: string;
  private readonly apiUrl: string;

  constructor() {
    super();
    this.baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    this.apiUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  // ===========================================================================
  // Selectors - Updated to match actual data-testid attributes
  // ===========================================================================

  getSelectors(): SelectorMap {
    return {
      // Auth - matches QA-016 implementation
      loginEmailInput: '[data-testid="input-login-email"]',
      loginPasswordInput: '[data-testid="input-login-password"]',
      loginSubmitButton: '[data-testid="btn-login-submit"]',
      signupEmailInput: '[data-testid="input-signup-email"]',
      signupPasswordInput: '[data-testid="input-signup-password"]',
      signupFirstNameInput: '[data-testid="input-signup-firstname"]',
      signupLastNameInput: '[data-testid="input-signup-lastname"]',
      signupSubmitButton: '[data-testid="btn-signup-submit"]',
      logoutButton: '[data-testid="btn-logout"]',

      // Navigation - matches QA-016 implementation
      sidebarNav: '[data-testid="sidebar"]',
      navDashboard: '[data-testid="nav-dashboard"]',
      navCustomers: '[data-testid="nav-customers"]',
      navInvoices: '[data-testid="nav-invoices"]',
      navVendors: '[data-testid="nav-vendors"]',
      navBills: '[data-testid="nav-bills"]',
      navExpenses: '[data-testid="nav-expenses"]',
      navAccounts: '[data-testid="nav-accounts"]',
      navJournal: '[data-testid="nav-journal"]',
      navReports: '[data-testid="nav-reports"]',
      navSettings: '[data-testid="nav-settings"]',
      mobileMenuButton: '[data-testid="btn-mobile-menu"]',

      // Header
      header: '[data-testid="header"]',
      searchButton: '[data-testid="btn-search"]',
      searchButtonMobile: '[data-testid="btn-search-mobile"]',
      notificationsButton: '[data-testid="btn-notifications"]',

      // Dashboard
      dashboardMain: 'main',
      dashboardMetrics: '[data-testid="dashboard-metrics"]',
      dashboardCharts: '[data-testid="dashboard-charts"]',
      onboardingBanner: '[data-testid="onboarding-banner"], [data-testid="setup-checklist"]',

      // Notifications
      notificationBadge: '[data-testid="notification-badge"]',
      notificationDrawer: '[data-testid="notification-drawer"]',
      notificationItem: '[data-testid="notification-item"]',
      releaseNoteBadge: '[data-testid="release-note-badge"]',
      releaseNoteDrawer: '[data-testid="release-note-drawer"]',

      // Common UI
      modal: '[role="dialog"]',
      modalClose: '[aria-label="Close"]',
      toast: '[data-sonner-toast]',
      loadingSpinner: '.animate-spin',
      emptyState: '[data-testid="empty-state"]',

      // Tables - matches QA-016 implementation
      dataTable: '[data-testid="table-customers"], table',
      tableRow: '[data-testid^="table-customers-row-"], tbody tr',
      tableHeader: 'thead th',
      pagination: '[data-testid="pagination"]',

      // Forms
      formSubmit: 'button[type="submit"]',
      formCancel: '[data-testid="form-cancel"]',
      formError: '[data-testid^="alert-"], [role="alert"]',

      // Customers - matches QA-016 implementation
      customerCreateButton: '[data-testid="btn-customer-create"]',
      customerSearchInput: '[data-testid="input-customer-search"]',
      customerModal: '[data-testid="modal-customer"]',
      customerForm: '[data-testid="form-customer"]',
      customerNameInput: '[data-testid="input-customer-name"]',
      customerEmailInput: '[data-testid="input-customer-email"]',
      customerSaveButton: '[data-testid="btn-customer-save"]',

      // Piro-specific
      currencySelector: '[data-testid="currency-selector"]',
      organizationSwitcher: '[data-testid="organization-switcher"]',
      invoiceModal: '[data-testid="modal-invoice"]',
      billModal: '[data-testid="modal-bill"]',
      expenseModal: '[data-testid="modal-expense"]',
      paymentModal: '[data-testid="modal-payment"]',
    };
  }

  // ===========================================================================
  // Routes
  // ===========================================================================

  getRoutes(): RouteMap {
    return {
      home: '/',
      login: '/login',
      signup: '/signup',
      forgotPassword: '/forgot-password',
      resetPassword: '/reset-password',
      verifyEmail: '/verify-email',
      dashboard: '/dashboard',
      customers: '/customers',
      invoices: '/invoices',
      vendors: '/vendors',
      bills: '/bills',
      expenses: '/expenses',
      accounts: '/accounts',
      journal: '/journal',
      reports: '/reports',
      settings: '/settings',
      onboarding: '/onboarding',
      bankReconciliation: '/bank-reconciliation',
      recurring: '/recurring',
      auditLog: '/audit-log',
      payments: '/payments',
    };
  }

  // ===========================================================================
  // Authentication
  // ===========================================================================

  async login(page: Page, persona: Persona): Promise<void> {
    const selectors = this.getSelectors();
    const routes = this.getRoutes();

    // Navigate to login page
    await page.goto(`${this.baseUrl}${routes.login}`);

    // Wait for login form - use primary selector first, then fallback
    try {
      await page.waitForSelector(selectors.loginEmailInput, { timeout: 5000 });
    } catch {
      // Fallback to generic selectors
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    }

    // Fill in credentials
    const emailInput = await page.$(selectors.loginEmailInput) ||
      await page.$('input[type="email"]') ||
      await page.$('input[name="email"]');

    const passwordInput = await page.$(selectors.loginPasswordInput) ||
      await page.$('input[type="password"]') ||
      await page.$('input[name="password"]');

    if (!emailInput || !passwordInput) {
      throw new Error('Could not find login form inputs');
    }

    await emailInput.fill(persona.email);
    await passwordInput.fill(persona.password);

    // Submit form
    const submitButton = await page.$(selectors.loginSubmitButton) ||
      await page.$('button[type="submit"]');

    if (!submitButton) {
      throw new Error('Could not find login submit button');
    }

    await submitButton.click();

    // Wait for navigation to dashboard or onboarding
    await page.waitForURL(
      (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/onboarding'),
      { timeout: 30000 }
    );

    // Wait for page to be ready
    await this.waitForPageReady(page);
  }

  async logout(page: Page): Promise<void> {
    const selectors = this.getSelectors();

    // Try to find and click logout button
    const logoutButton = await page.$(selectors.logoutButton);

    if (logoutButton) {
      await logoutButton.click();
    } else {
      // Clear local storage and navigate to login
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${this.baseUrl}/login`);
    }

    // Wait for login page
    await page.waitForURL(new RegExp('/login'), { timeout: 10000 });
  }

  async isLoggedIn(page: Page): Promise<boolean> {
    const selectors = this.getSelectors();
    try {
      await page.waitForSelector(selectors.sidebarNav, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // E2E API Endpoints (Persona Management)
  // ===========================================================================

  /**
   * Bootstrap a persona via E2E API
   * Creates user, organization, and persona profile if they don't exist.
   */
  async bootstrapPersona(persona: Persona): Promise<PersonaProfile> {
    const client = getE2EClient();

    // Map seed profile to backend format
    const seedProfileMap: Record<SeedProfile, 'EMPTY' | 'MINIMAL' | 'STANDARD' | 'LARGE_DATASET'> = {
      'empty': 'EMPTY',
      'minimal': 'MINIMAL',
      'standard': 'STANDARD',
      'large_dataset': 'LARGE_DATASET',
    };

    const response = await client.bootstrapPersona({
      personaId: persona.id,
      email: persona.email,
      password: persona.password,
      firstName: persona.displayName.split(' ')[0],
      lastName: persona.displayName.split(' ').slice(1).join(' ') || 'Test',
      seedProfile: seedProfileMap[persona.seedProfile],
    });

    // Map response to PersonaProfile
    return this.mapToPersonaProfile(response);
  }

  /**
   * Reset a persona to initial state or specific stage
   */
  async resetPersona(personaId: string, options?: ResetOptions): Promise<PersonaProfile> {
    const client = getE2EClient();

    const response = await client.resetPersona({
      personaId,
      fullReset: options?.fullReset,
      targetStage: options?.targetStage,
    });

    return {
      personaId: response.personaId,
      userId: response.userId,
      workspaceId: response.orgId,
      lifecycleStage: this.mapLifecycleStage(response.lifecycleStage),
      lastCompletedJourney: response.lastCompletedJourney,
      lastSeenReleaseNoteId: response.lastSeenReleaseNoteId,
      updatedAt: new Date(response.updatedAt),
    };
  }

  /**
   * Get persona profile from database
   */
  async getPersonaProfile(personaId: string): Promise<PersonaProfile | null> {
    const client = getE2EClient();

    try {
      const response = await client.getPersonaProfile(personaId);

      return {
        personaId: response.personaId,
        userId: response.userId,
        workspaceId: response.orgId,
        lifecycleStage: this.mapLifecycleStage(response.lifecycleStage),
        lastCompletedJourney: response.lastCompletedJourney,
        lastSeenReleaseNoteId: response.lastSeenReleaseNoteId,
        updatedAt: new Date(response.updatedAt),
      };
    } catch {
      return null;
    }
  }

  /**
   * Seed test data for a persona's organization
   */
  async seedData(personaId: string, profile?: SeedProfile): Promise<SeedDataResponse> {
    const client = getE2EClient();

    const seedProfileMap: Record<SeedProfile, 'EMPTY' | 'MINIMAL' | 'STANDARD' | 'LARGE_DATASET'> = {
      'empty': 'EMPTY',
      'minimal': 'MINIMAL',
      'standard': 'STANDARD',
      'large_dataset': 'LARGE_DATASET',
    };

    return client.seedData({
      personaId,
      profile: profile ? seedProfileMap[profile] : undefined,
    });
  }

  /**
   * Update persona lifecycle stage after completing a journey
   */
  async updatePersonaStage(personaId: string, stage: LifecycleStage, journey: string): Promise<void> {
    const client = getE2EClient();

    const stageMap: Record<LifecycleStage, 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER'> = {
      'signup': 'SIGNUP',
      'onboarded': 'ONBOARDED',
      'activated': 'ACTIVATED',
      'power_user': 'POWER_USER',
    };

    await client.updateJourneyProgress({
      personaId,
      journeyName: journey,
      newStage: stageMap[stage],
    });
  }

  /**
   * Seed a release note for testing "What's New" features
   */
  async seedReleaseNote(title: string, body: string): Promise<string> {
    // Note: Release notes table doesn't exist yet, backend returns stub
    console.log(`[PiroAdapter] seedReleaseNote: ${title} (stub - table not implemented)`);
    return `stub-release-${Date.now()}`;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private mapToPersonaProfile(response: BootstrapResponse): PersonaProfile {
    return {
      personaId: response.profile.personaId,
      userId: response.profile.userId,
      workspaceId: response.profile.orgId,
      lifecycleStage: this.mapLifecycleStage(response.profile.lifecycleStage),
      lastCompletedJourney: response.profile.lastCompletedJourney,
      lastSeenReleaseNoteId: response.profile.lastSeenReleaseNoteId,
      updatedAt: new Date(response.profile.updatedAt),
    };
  }

  private mapLifecycleStage(stage: string): LifecycleStage {
    const stageMap: Record<string, LifecycleStage> = {
      'SIGNUP': 'signup',
      'ONBOARDED': 'onboarded',
      'ACTIVATED': 'activated',
      'POWER_USER': 'power_user',
    };
    return stageMap[stage] || 'signup';
  }
}

// =============================================================================
// Export singleton instance
// =============================================================================

export const piroAdapter = new PiroAdapter();
