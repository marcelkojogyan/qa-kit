import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from qa-kit/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Default configuration values
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const CI = !!process.env.CI;
const HEADED = process.env.HEADED === 'true';

// Timeout configuration
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000', 10);
const EXPECT_TIMEOUT = 10000;
const ACTION_TIMEOUT = 15000;
const NAVIGATION_TIMEOUT = 30000;

// Video and trace configuration
const VIDEO = (process.env.VIDEO || 'retain-on-failure') as 'on' | 'off' | 'retain-on-failure';
const TRACE = (process.env.TRACE || 'retain-on-failure') as 'on' | 'off' | 'retain-on-failure';

// Workers configuration
const WORKERS = CI ? parseInt(process.env.CI_WORKERS || '4', 10) : 1;

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
} as const;

/**
 * Playwright Test Configuration
 *
 * Projects:
 * - chromium-desktop: Primary desktop testing (1440x900)
 * - firefox-desktop: Firefox cross-browser testing
 * - webkit-desktop: Safari cross-browser testing
 * - chromium-mobile: Mobile responsive testing (iPhone-like)
 * - chromium-tablet: Tablet responsive testing (iPad-like)
 * - visual-smoke: Visual regression smoke tests (chromium only)
 */
const config: PlaywrightTestConfig = {
  // Test directory relative to this config
  testDir: path.resolve(__dirname, '../journeys'),

  // Output directories
  outputDir: path.resolve(__dirname, '../artifacts/test-results'),

  // Global timeout for each test
  timeout: TEST_TIMEOUT,

  // Expect timeout
  expect: {
    timeout: EXPECT_TIMEOUT,
    // Screenshot comparison options
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.05,
    },
  },

  // Fail the build on CI if test.only is left in code
  forbidOnly: CI,

  // Retry failed tests
  retries: CI ? 2 : 0,

  // Parallel workers
  workers: WORKERS,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', {
      outputFolder: path.resolve(__dirname, '../artifacts/playwright-report'),
      open: CI ? 'never' : 'on-failure',
    }],
    // JSON reporter for CI integration
    ...(CI ? [['json', { outputFile: path.resolve(__dirname, '../artifacts/test-results.json') }] as const] : []),
  ],

  // Global setup and teardown
  globalSetup: path.resolve(__dirname, './global-setup.ts'),

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: BASE_URL,

    // Action timeouts
    actionTimeout: ACTION_TIMEOUT,
    navigationTimeout: NAVIGATION_TIMEOUT,

    // Collect trace on failure
    trace: TRACE,

    // Record video on failure
    video: VIDEO,

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Browser context options
    ignoreHTTPSErrors: true,

    // Locale and timezone for consistency
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Geolocation (optional, for location-aware features)
    // geolocation: { longitude: -73.935242, latitude: 40.730610 },

    // Permissions
    permissions: ['clipboard-read', 'clipboard-write'],

    // Accept downloads
    acceptDownloads: true,

    // Headed mode for local debugging
    headless: !HEADED,

    // Slow down actions for debugging (0 in CI)
    launchOptions: {
      slowMo: CI ? 0 : (HEADED ? 50 : 0),
    },
  },

  // Project configurations
  projects: [
    // ==========================================================================
    // Desktop Projects
    // ==========================================================================
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        // Storage state for authenticated tests
        // storageState: path.resolve(__dirname, '../artifacts/.auth/user.json'),
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: VIEWPORTS.desktop,
      },
    },

    // ==========================================================================
    // Responsive Projects
    // ==========================================================================
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 14'],
        viewport: VIEWPORTS.mobile,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro 11'],
        viewport: VIEWPORTS.tablet,
        isMobile: true,
        hasTouch: true,
      },
    },

    // ==========================================================================
    // Visual Regression Projects
    // ==========================================================================
    {
      name: 'visual-smoke',
      testMatch: /.*\.visual\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: 'visual-smoke-mobile',
      testMatch: /.*\.visual\.ts$/,
      use: {
        ...devices['iPhone 14'],
        viewport: VIEWPORTS.mobile,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Web server configuration (if you want Playwright to start the app)
  // Uncomment if needed:
  // webServer: {
  //   command: 'cd ../piro/frontend && pnpm dev',
  //   url: BASE_URL,
  //   reuseExistingServer: !CI,
  //   timeout: 120000,
  // },
};

export default defineConfig(config);
