/**
 * Template Project Configuration
 * 
 * Copy this file to create configuration for your own project.
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to `yourproject.config.ts` (replace "yourproject" with your project name)
 * 2. Update all the configuration values below for your application
 * 3. Run: QA_PROJECT=yourproject pnpm qa:sweep
 * 
 * EXAMPLE USAGE:
 * - Copy to `myapp.config.ts`
 * - Configure your auth flow and pages
 * - Run: QA_PROJECT=myapp pnpm qa:sweep
 */

import type { ProjectConfig } from './project.config';

/**
 * Template configuration - customize all values for your project
 */
const templateConfig: ProjectConfig = {
  // =============================================================================
  // Basic Project Information
  // =============================================================================
  
  // Your project name (used in reports and artifacts)
  name: 'template',
  
  // Base URL of your application
  // This can be overridden with APP_BASE_URL environment variable
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  
  // API base URL (optional - only if you need it for your application)
  apiUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
  
  // =============================================================================
  // Authentication Configuration
  // =============================================================================
  
  auth: {
    // Path to your login page (e.g., "/login", "/auth/signin")
    loginPath: '/login',
    
    // Selector for email/username input field
    // Try data-testid first, then fall back to generic selectors
    emailSelector: '[data-testid="email-input"]',
    
    // Selector for password input field
    passwordSelector: '[data-testid="password-input"]',
    
    // Selector for login submit button
    submitSelector: '[data-testid="login-button"]',
    
    // Regular expression pattern that matches URLs after successful login
    // Examples: 
    // - /\/dashboard/ (matches "/dashboard")
    // - /\/(dashboard|home|app)/ (matches "/dashboard", "/home", or "/app")
    successUrlPattern: /\/dashboard/,
  },
  
  // =============================================================================
  // Pages to Test
  // =============================================================================
  
  pages: [
    // =============================================================================
    // CRUD Pages (with create functionality)
    // =============================================================================
    
    {
      // URL path of the page (e.g., "/users", "/products")
      path: '/users',
      
      // Display name for reporting (usually plural)
      name: 'users',
      
      // Does this page have create/add functionality?
      hasCreate: true,
      
      // Selector for the "Create" or "Add" button
      // You can provide multiple selectors separated by commas as fallbacks
      createButton: '[data-testid="create-user-button"], button:has-text("Add User"), button:has-text("Create")',
      
      // Optional: Selector for the form container (modal, dialog, etc.)
      // Helps scope the form fields to avoid conflicts
      formSelector: '[data-testid="user-modal"], [role="dialog"]',
      
      // Optional: Selector for the submit button in the form
      // If not provided, will use generic submit selectors
      submitButton: '[data-testid="save-user"], button[type="submit"]',
      
      // Fields to fill in the create form
      fields: [
        {
          // CSS selector for the field - try multiple selectors as fallbacks
          selector: '[data-testid="user-name"], input[name="name"]',
          // Value to enter in the field
          value: 'Test User',
          // Field type - affects how the field is filled
          type: 'text',
          // Whether this field is required (affects error handling)
          required: true,
        },
        {
          selector: '[data-testid="user-email"], input[name="email"]',
          value: 'testuser@example.com',
          type: 'email',
          required: true,
        },
        {
          selector: '[data-testid="user-role"], select[name="role"]',
          value: 'User', // For selects, this will match option text
          type: 'select',
          selectBy: 'text', // 'text' or 'value' - how to match select options
          required: false,
        },
        // Add more fields as needed...
      ],
    },
    
    // Another CRUD page example
    {
      path: '/products',
      name: 'products',
      hasCreate: true,
      createButton: '[data-testid="create-product"]',
      fields: [
        {
          selector: '[data-testid="product-name"]',
          value: 'Test Product',
          type: 'text',
          required: true,
        },
        {
          selector: '[data-testid="product-price"]',
          value: 29.99,
          type: 'number',
          required: true,
        },
        {
          selector: '[data-testid="product-category"]',
          value: 'Electronics',
          type: 'select',
          required: true,
        },
      ],
    },
    
    // =============================================================================
    // Read-Only Pages (no create functionality)
    // =============================================================================
    
    {
      path: '/dashboard',
      name: 'dashboard',
      hasCreate: false, // Just test that the page loads without errors
    },
    
    {
      path: '/reports',
      name: 'reports',
      hasCreate: false,
    },
    
    {
      path: '/settings',
      name: 'settings',
      hasCreate: false,
    },
    
    // =============================================================================
    // Add more pages here...
    // =============================================================================
    
    // Examples of other common page types:
    /*
    {
      path: '/orders',
      name: 'orders',
      hasCreate: true,
      createButton: '[data-testid="create-order"]',
      fields: [
        {
          selector: '[data-testid="customer-select"]',
          value: 'Test Customer',
          type: 'select',
          required: true,
        },
        {
          selector: '[data-testid="order-date"]',
          value: '2024-01-01',
          type: 'date',
          required: true,
        },
      ],
    },
    
    {
      path: '/inventory',
      name: 'inventory',
      hasCreate: false,
    },
    
    {
      path: '/analytics',
      name: 'analytics', 
      hasCreate: false,
    },
    */
  ],
};

// =============================================================================
// COMMON SELECTOR PATTERNS
// =============================================================================

/**
 * Common CSS selector patterns you might find useful:
 * 
 * DATA-TESTID (recommended):
 * - '[data-testid="element-name"]'
 * 
 * BY ATTRIBUTE:
 * - 'input[type="email"]'
 * - 'button[type="submit"]'
 * - 'select[name="category"]'
 * 
 * BY TEXT CONTENT:
 * - 'button:has-text("Save")'
 * - 'button:has-text("Create")'
 * 
 * BY ARIA ATTRIBUTES:
 * - '[aria-label="Close"]'
 * - '[role="dialog"]'
 * 
 * MULTIPLE SELECTORS (fallbacks):
 * - '[data-testid="submit"], button[type="submit"], button:has-text("Save")'
 * 
 * CLASS-BASED (less stable):
 * - '.btn-primary'
 * - '.modal-dialog'
 */

// =============================================================================
// FIELD TYPE REFERENCE
// =============================================================================

/**
 * Field types and their behavior:
 * 
 * 'text': Simple text input - fills with string value
 * 'email': Email input - validates email format
 * 'number': Numeric input - converts value to number
 * 'date': Date input - expects YYYY-MM-DD format
 * 'select': Dropdown/select - matches by text or value
 * 
 * For select fields, use 'selectBy' option:
 * - 'text': Match by option text content (default)
 * - 'value': Match by option value attribute
 */

// =============================================================================
// TESTING YOUR CONFIGURATION
// =============================================================================

/**
 * Once you've configured your project:
 * 
 * 1. Make sure your app is running on the configured baseUrl
 * 2. Set environment variables:
 *    E2E_SWEEP_EMAIL=your-test-user@example.com
 *    E2E_SWEEP_PASSWORD=your-test-password
 * 3. Run the bug sweep:
 *    QA_PROJECT=yourproject pnpm qa:sweep
 * 
 * The script will:
 * - Log in with your test credentials
 * - Visit each configured page
 * - Try to create new records using your form configuration
 * - Report any errors found
 * - Generate a detailed JSON report in the artifacts folder
 */

export default templateConfig;