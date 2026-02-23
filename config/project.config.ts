/**
 * Project Configuration Schema
 * 
 * Type definitions for making QA Kit portable across any web project.
 * Projects implement these interfaces to configure their specific selectors,
 * pages, forms, and test data.
 */

// =============================================================================
// Core Configuration Interfaces
// =============================================================================

/**
 * Main project configuration interface
 * Every project should implement this to work with QA Kit
 */
export interface ProjectConfig {
  /** Project name (used for reporting) */
  name: string;
  
  /** Base URL of the application */
  baseUrl: string;
  
  /** API base URL (optional) */
  apiUrl?: string;
  
  /** Authentication configuration */
  auth: AuthConfig;
  
  /** Pages to test during bug sweep */
  pages: PageConfig[];
}

/**
 * Authentication flow configuration
 */
export interface AuthConfig {
  /** Login page path (e.g., "/login") */
  loginPath: string;
  
  /** Email input selector */
  emailSelector: string;
  
  /** Password input selector */
  passwordSelector: string;
  
  /** Submit button selector */
  submitSelector: string;
  
  /** Regex pattern to match successful login URL */
  successUrlPattern: RegExp;
}

/**
 * Page configuration for bug sweep testing
 */
export interface PageConfig {
  /** URL path (e.g., "/invoices") */
  path: string;
  
  /** Display name for reporting */
  name: string;
  
  /** Whether this page has create/CRUD functionality */
  hasCreate: boolean;
  
  /** Create button selector (required if hasCreate is true) */
  createButton?: string;
  
  /** Form/modal container selector (optional - helps with scoping) */
  formSelector?: string;
  
  /** Fields to fill during create testing */
  fields?: FieldConfig[];
  
  /** Submit button selector for forms */
  submitButton?: string;
}

/**
 * Form field configuration
 */
export interface FieldConfig {
  /** CSS selector or data-testid for the field */
  selector: string;
  
  /** Value to fill into the field */
  value: string | number;
  
  /** Field type for appropriate handling */
  type: 'text' | 'number' | 'select' | 'date' | 'email';
  
  /** For select fields: whether to match by text content vs value attribute */
  selectBy?: 'text' | 'value';
  
  /** Whether this field is required (affects error handling) */
  required?: boolean;
}

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Runtime environment configuration
 */
export interface EnvironmentConfig {
  /** Test user email */
  email: string;
  
  /** Test user password */
  password: string;
  
  /** Optional: override base URL from config */
  baseUrlOverride?: string;
  
  /** Optional: override API URL from config */
  apiUrlOverride?: string;
}

// =============================================================================
// Bug Sweep Configuration
// =============================================================================

/**
 * Bug sweep specific configuration options
 */
export interface BugSweepConfig {
  /** Timeout for page loads (ms) */
  pageTimeout?: number;
  
  /** Timeout for form submissions (ms) */
  formTimeout?: number;
  
  /** Whether to take screenshots on errors */
  captureScreenshots?: boolean;
  
  /** Directory for artifacts (relative to qa-kit root) */
  artifactsDir?: string;
  
  /** Additional selectors to check for errors */
  errorSelectors?: string[];
  
  /** Selectors that indicate loading states */
  loadingSelectors?: string[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type for project configuration with all optional overrides applied
 */
export type ResolvedProjectConfig = ProjectConfig & {
  resolvedBaseUrl: string;
  resolvedApiUrl?: string;
  environment: EnvironmentConfig;
  bugSweep: Required<BugSweepConfig>;
};

/**
 * Supported project names for built-in configurations
 */
export type SupportedProject = 'piro' | 'template';

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Load project configuration by name
 * @param projectName - Name of the project configuration to load
 * @returns Promise resolving to the project configuration
 */
export async function loadProjectConfig(projectName: string = 'piro'): Promise<ProjectConfig> {
  try {
    // Dynamic import based on project name
    const configModule = await import(`./${projectName}.config`);
    
    if (!configModule.default && !configModule.config) {
      throw new Error(`Configuration file ${projectName}.config.ts must export a default config or named 'config' export`);
    }
    
    return configModule.default || configModule.config;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot resolve')) {
      throw new Error(`Project configuration '${projectName}' not found. Available configs: piro, template`);
    }
    throw error;
  }
}

/**
 * Load environment configuration from process.env
 * @returns Environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const email = process.env.E2E_SWEEP_EMAIL;
  const password = process.env.E2E_SWEEP_PASSWORD;
  
  if (!email || !password) {
    throw new Error('E2E_SWEEP_EMAIL and E2E_SWEEP_PASSWORD environment variables are required');
  }
  
  return {
    email,
    password,
    baseUrlOverride: process.env.APP_BASE_URL,
    apiUrlOverride: process.env.API_BASE_URL,
  };
}

/**
 * Resolve project configuration with environment overrides
 * @param config - Base project configuration
 * @param environment - Environment configuration
 * @returns Resolved configuration with all defaults and overrides applied
 */
export function resolveProjectConfig(
  config: ProjectConfig,
  environment: EnvironmentConfig
): ResolvedProjectConfig {
  const defaultBugSweepConfig: Required<BugSweepConfig> = {
    pageTimeout: 30000,
    formTimeout: 10000,
    captureScreenshots: true,
    artifactsDir: 'artifacts',
    errorSelectors: [
      '[role="alert"]',
      '.toast-error',
      '[data-sonner-toast]',
      '[data-testid^="alert-"]',
      '.error-message',
      '.form-error'
    ],
    loadingSelectors: [
      '.animate-spin',
      '[data-testid="loading"]',
      '.loading'
    ]
  };
  
  return {
    ...config,
    resolvedBaseUrl: environment.baseUrlOverride || config.baseUrl,
    resolvedApiUrl: environment.apiUrlOverride || config.apiUrl,
    environment,
    bugSweep: defaultBugSweepConfig,
  };
}