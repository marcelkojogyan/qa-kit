/**
 * Piro Project Configuration
 * 
 * Extracted Piro-specific configuration from bug-sweep.ts to make QA Kit portable.
 * This preserves all existing Piro functionality while making it configurable.
 */

import type { ProjectConfig } from './project.config';

/**
 * Piro project configuration
 * Contains all selectors, pages, and test data specific to Piro HQ
 */
const piroConfig: ProjectConfig = {
  name: 'piro',
  
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  
  apiUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
  
  auth: {
    loginPath: '/login',
    emailSelector: '[data-testid="input-login-email"]',
    passwordSelector: '[data-testid="input-login-password"]',
    submitSelector: '[data-testid="btn-login-submit"]',
    successUrlPattern: /\/(dashboard|customers|invoices)/,
  },
  
  pages: [
    {
      path: '/invoices',
      name: 'invoices',
      hasCreate: true,
      createButton: '[data-testid="btn-invoice-create"]',
      formSelector: '[data-testid="modal-invoice"], [role="dialog"]',
      submitButton: '[data-testid="btn-invoice-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [
        {
          selector: '[data-testid="select-customer"], [data-testid*="customer"], select[name="customer"], input[name="customer"]',
          value: 'Test Corp',
          type: 'select',
          selectBy: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-line-item-description"], [data-testid*="description"], input[name="description"], textarea[name="description"]',
          value: 'Consulting',
          type: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-quantity"], [data-testid*="qty"], input[name="quantity"], input[name="qty"]',
          value: 1,
          type: 'number',
          required: true,
        },
        {
          selector: '[data-testid="input-unit-price"], [data-testid*="price"], input[name="unitPrice"], input[name="price"]',
          value: 500,
          type: 'number',
          required: true,
        },
        {
          selector: '[data-testid="input-tax-rate"], [data-testid*="tax"], input[name="taxRate"], input[name="tax"]',
          value: 15,
          type: 'number',
          required: false,
        },
      ],
    },
    
    {
      path: '/bills',
      name: 'bills',
      hasCreate: true,
      createButton: '[data-testid="btn-bill-create"]',
      formSelector: '[data-testid="modal-bill"], [role="dialog"]',
      submitButton: '[data-testid="btn-bill-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [
        {
          selector: '[data-testid="select-vendor"], [data-testid*="vendor"], select[name="vendor"]',
          value: 'Office Supply Co',
          type: 'select',
          selectBy: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-line-item-description"], [data-testid*="description"], input[name="description"]',
          value: 'Paper',
          type: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-quantity"], input[name="quantity"]',
          value: 10,
          type: 'number',
          required: true,
        },
        {
          selector: '[data-testid="input-unit-price"], input[name="unitPrice"]',
          value: 25,
          type: 'number',
          required: true,
        },
      ],
    },
    
    {
      path: '/expenses',
      name: 'expenses',
      hasCreate: true,
      createButton: '[data-testid="btn-expense-create"]',
      formSelector: '[data-testid="modal-expense"], [role="dialog"]',
      submitButton: '[data-testid="btn-expense-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [
        {
          selector: '[data-testid="select-vendor"], [data-testid*="vendor"], select[name="vendor"]',
          value: 'Uber',
          type: 'select',
          selectBy: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-amount"], [data-testid*="amount"], input[name="amount"]',
          value: 45.50,
          type: 'number',
          required: true,
        },
        {
          selector: '[data-testid="select-category"], [data-testid*="category"], select[name="category"]',
          value: 'Transport',
          type: 'select',
          selectBy: 'text',
          required: true,
        },
      ],
    },
    
    {
      path: '/customers',
      name: 'customers',
      hasCreate: true,
      createButton: '[data-testid="btn-customer-create"]',
      formSelector: '[data-testid="modal-customer"], [role="dialog"]',
      submitButton: '[data-testid="btn-customer-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [
        {
          selector: '[data-testid="input-customer-name"], [data-testid*="name"], input[name="name"]',
          value: 'Bug Sweep Corp',
          type: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-customer-email"], [data-testid*="email"], input[name="email"]',
          value: 'sweep@test.com',
          type: 'email',
          required: true,
        },
      ],
    },
    
    {
      path: '/vendors',
      name: 'vendors',
      hasCreate: true,
      createButton: '[data-testid="btn-vendor-create"]',
      formSelector: '[data-testid="modal-vendor"], [role="dialog"]',
      submitButton: '[data-testid="btn-vendor-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [
        {
          selector: '[data-testid="input-vendor-name"], [data-testid*="name"], input[name="name"]',
          value: 'Sweep Vendor LLC',
          type: 'text',
          required: true,
        },
        {
          selector: '[data-testid="input-vendor-email"], [data-testid*="email"], input[name="email"]',
          value: 'vendor@sweep.com',
          type: 'email',
          required: true,
        },
      ],
    },
    
    {
      path: '/payments',
      name: 'payments',
      hasCreate: true,
      createButton: '[data-testid="btn-payment-create"], [data-testid*="create"], button:has-text("Create"), button:has-text("New"), button:has-text("Add")' +
                   ', [aria-label*="Create"], [aria-label*="Add"]',
      formSelector: '[data-testid="modal-payment"], [role="dialog"]',
      submitButton: '[data-testid="btn-payment-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [], // Will use generic form filling
    },
    
    {
      path: '/accounts',
      name: 'accounts',
      hasCreate: true,
      createButton: '[data-testid="btn-account-create"], [data-testid*="create"], button:has-text("Create"), button:has-text("New"), button:has-text("Add")' +
                   ', [aria-label*="Create"], [aria-label*="Add"]',
      formSelector: '[data-testid="modal-account"], [role="dialog"]',
      submitButton: '[data-testid="btn-account-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [], // Will use generic form filling
    },
    
    {
      path: '/recurring',
      name: 'recurring',
      hasCreate: true,
      createButton: '[data-testid="btn-recurring-create"], [data-testid*="create"], button:has-text("Create"), button:has-text("New"), button:has-text("Add")' +
                   ', [aria-label*="Create"], [aria-label*="Add"]',
      formSelector: '[data-testid="modal-recurring"], [role="dialog"]',
      submitButton: '[data-testid="btn-recurring-save"], [data-testid*="save"], [data-testid*="submit"], button[type="submit"]',
      fields: [], // Will use generic form filling
    },
    
    // Non-CRUD pages (read-only)
    {
      path: '/journal',
      name: 'journal',
      hasCreate: false,
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
    
    {
      path: '/dashboard',
      name: 'dashboard',
      hasCreate: false,
    },
    
    {
      path: '/audit-log',
      name: 'audit-log',
      hasCreate: false,
    },
    
    {
      path: '/bank-reconciliation',
      name: 'bank-reconciliation',
      hasCreate: false,
    },
  ],
};

export default piroConfig;