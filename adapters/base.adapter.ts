import type { Page, Locator } from '@playwright/test';

// =============================================================================
// Types
// =============================================================================

/**
 * Persona definition for test users
 */
export interface Persona {
  id: string;
  email: string;
  password: string;
  displayName: string;
  traits: string[];
  targetLifecycle: LifecycleStage;
  seedProfile: SeedProfile;
}

/**
 * Lifecycle stages for persona progression
 */
export type LifecycleStage =
  | 'signup'
  | 'onboarded'
  | 'activated'
  | 'power_user';

/**
 * Seed profile types for data generation
 */
export type SeedProfile =
  | 'empty'
  | 'minimal'
  | 'standard'
  | 'large_dataset';

/**
 * Persona profile stored in database
 */
export interface PersonaProfile {
  personaId: string;
  userId: string | null;
  workspaceId: string | null;
  lifecycleStage: LifecycleStage;
  lastCompletedJourney: string | null;
  lastSeenReleaseNoteId: string | null;
  updatedAt: Date;
}

/**
 * Selector map for UI elements
 */
export interface SelectorMap {
  // Auth
  loginEmailInput: string;
  loginPasswordInput: string;
  loginSubmitButton: string;
  signupEmailInput: string;
  signupPasswordInput: string;
  signupFirstNameInput: string;
  signupLastNameInput: string;
  signupSubmitButton: string;
  logoutButton: string;

  // Navigation
  sidebarNav: string;
  navDashboard: string;
  navCustomers: string;
  navInvoices: string;
  navVendors: string;
  navBills: string;
  navExpenses: string;
  navAccounts: string;
  navJournal: string;
  navReports: string;
  navSettings: string;
  mobileMenuButton: string;

  // Dashboard
  dashboardMain: string;
  dashboardMetrics: string;
  dashboardCharts: string;
  onboardingBanner: string;

  // Notifications
  notificationBadge: string;
  notificationDrawer: string;
  notificationItem: string;
  releaseNoteBadge: string;
  releaseNoteDrawer: string;

  // Common UI
  modal: string;
  modalClose: string;
  toast: string;
  loadingSpinner: string;
  emptyState: string;

  // Tables
  dataTable: string;
  tableRow: string;
  tableHeader: string;
  pagination: string;

  // Forms
  formSubmit: string;
  formCancel: string;
  formError: string;

  // Allow additional custom selectors
  [key: string]: string;
}

/**
 * Route map for application URLs
 */
export interface RouteMap {
  home: string;
  login: string;
  signup: string;
  forgotPassword: string;
  resetPassword: string;
  verifyEmail: string;
  dashboard: string;
  customers: string;
  invoices: string;
  vendors: string;
  bills: string;
  expenses: string;
  accounts: string;
  journal: string;
  reports: string;
  settings: string;
  onboarding: string;
  // Allow additional custom routes
  [key: string]: string;
}

// =============================================================================
// Base Adapter Interface
// =============================================================================

/**
 * Base adapter interface for app-specific implementations.
 * Implement this interface to adapt the QA kit to your application.
 */
export interface AppAdapter {
  /**
   * Application name (used for reports and VRT)
   */
  readonly appName: string;

  /**
   * Get the base URL for the application
   */
  getBaseUrl(): string;

  /**
   * Get the API base URL
   */
  getApiUrl(): string;

  /**
   * Get selector map for UI elements
   */
  getSelectors(): SelectorMap;

  /**
   * Get route map for application URLs
   */
  getRoutes(): RouteMap;

  /**
   * Login with a persona
   * @param page Playwright page
   * @param persona Persona to login as
   * @returns Promise that resolves when login is complete
   */
  login(page: Page, persona: Persona): Promise<void>;

  /**
   * Logout the current user
   * @param page Playwright page
   */
  logout(page: Page): Promise<void>;

  /**
   * Check if user is logged in
   * @param page Playwright page
   */
  isLoggedIn(page: Page): Promise<boolean>;

  /**
   * Navigate to a route
   * @param page Playwright page
   * @param route Route key from RouteMap
   */
  navigateTo(page: Page, route: keyof RouteMap): Promise<void>;

  /**
   * Wait for page to be fully loaded (no spinners, data loaded)
   * @param page Playwright page
   * @param options Optional timeout and additional selectors to wait for
   */
  waitForPageReady(page: Page, options?: { timeout?: number; additionalSelectors?: string[] }): Promise<void>;

  /**
   * Get a locator for a selector key
   * @param page Playwright page
   * @param selectorKey Key from SelectorMap
   */
  getLocator(page: Page, selectorKey: keyof SelectorMap): Locator;

  /**
   * Bootstrap a persona (create user, seed data)
   * @param persona Persona to bootstrap
   * @returns PersonaProfile with created IDs
   */
  bootstrapPersona(persona: Persona): Promise<PersonaProfile>;

  /**
   * Reset a persona to initial state or specific stage
   * @param personaId Persona ID to reset
   * @param options Optional reset configuration
   */
  resetPersona(personaId: string, options?: {
    fullReset?: boolean;
    targetStage?: 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER';
  }): Promise<PersonaProfile>;

  /**
   * Seed test data for a persona's organization
   * @param personaId Persona ID
   * @param profile Optional seed profile override
   */
  seedData(personaId: string, profile?: SeedProfile): Promise<{ success: boolean; counts: Record<string, number> }>;

  /**
   * Get persona profile from database
   * @param personaId Persona ID
   */
  getPersonaProfile(personaId: string): Promise<PersonaProfile | null>;

  /**
   * Update persona lifecycle stage
   * @param personaId Persona ID
   * @param stage New lifecycle stage
   * @param journey Journey that was completed
   */
  updatePersonaStage(personaId: string, stage: LifecycleStage, journey: string): Promise<void>;

  /**
   * Seed release note for testing
   * @param title Release note title
   * @param body Release note body
   * @returns Created release note ID
   */
  seedReleaseNote(title: string, body: string): Promise<string>;
}

// =============================================================================
// Abstract Base Adapter
// =============================================================================

/**
 * Abstract base adapter with common implementations.
 * Extend this class to create app-specific adapters.
 */
export abstract class BaseAdapter implements AppAdapter {
  abstract readonly appName: string;

  abstract getBaseUrl(): string;
  abstract getApiUrl(): string;
  abstract getSelectors(): SelectorMap;
  abstract getRoutes(): RouteMap;
  abstract login(page: Page, persona: Persona): Promise<void>;
  abstract bootstrapPersona(persona: Persona): Promise<PersonaProfile>;
  abstract resetPersona(personaId: string, options?: {
    fullReset?: boolean;
    targetStage?: 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER';
  }): Promise<PersonaProfile>;
  abstract getPersonaProfile(personaId: string): Promise<PersonaProfile | null>;
  abstract updatePersonaStage(personaId: string, stage: LifecycleStage, journey: string): Promise<void>;
  abstract seedData(personaId: string, profile?: SeedProfile): Promise<{ success: boolean; counts: Record<string, number> }>;
  abstract seedReleaseNote(title: string, body: string): Promise<string>;

  /**
   * Default logout implementation
   */
  async logout(page: Page): Promise<void> {
    const selectors = this.getSelectors();
    await page.click(selectors.logoutButton);
    await page.waitForURL(new RegExp(this.getRoutes().login));
  }

  /**
   * Default isLoggedIn check
   */
  async isLoggedIn(page: Page): Promise<boolean> {
    const selectors = this.getSelectors();
    try {
      await page.waitForSelector(selectors.sidebarNav, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Default navigation implementation
   */
  async navigateTo(page: Page, route: keyof RouteMap): Promise<void> {
    const routes = this.getRoutes();
    const url = routes[route];
    if (!url) {
      throw new Error(`Unknown route: ${String(route)}`);
    }
    await page.goto(`${this.getBaseUrl()}${url}`);
    await this.waitForPageReady(page);
  }

  /**
   * Default wait for page ready
   */
  async waitForPageReady(page: Page, options?: { timeout?: number; additionalSelectors?: string[] }): Promise<void> {
    const timeout = options?.timeout ?? 30000;
    const selectors = this.getSelectors();

    // Wait for loading spinner to disappear
    await page.waitForSelector(selectors.loadingSpinner, { state: 'hidden', timeout }).catch(() => {});

    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout });

    // Wait for additional selectors if provided
    if (options?.additionalSelectors) {
      for (const selector of options.additionalSelectors) {
        await page.waitForSelector(selector, { timeout });
      }
    }
  }

  /**
   * Get locator for a selector key
   */
  getLocator(page: Page, selectorKey: keyof SelectorMap): Locator {
    const selectors = this.getSelectors();
    const selector = selectors[selectorKey];
    if (!selector) {
      throw new Error(`Unknown selector: ${String(selectorKey)}`);
    }
    return page.locator(selector);
  }
}
