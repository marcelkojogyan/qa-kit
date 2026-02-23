/**
 * Loki Configuration for Component Visual Regression Testing
 *
 * Loki captures screenshots of Storybook stories and compares them against baselines.
 * https://loki.js.org/
 *
 * Usage:
 *   pnpm qa:loki:test     - Run visual regression tests
 *   pnpm qa:loki:update   - Update baselines
 *   pnpm qa:loki:approve  - Approve changes
 */

module.exports = {
  // ==========================================================================
  // General Configuration
  // ==========================================================================

  // Storybook URL (assumes storybook is running)
  storybookUrl: 'http://localhost:6006',

  // Output directory for screenshots
  outputDir: '.loki',

  // Reference directory for baselines
  referenceDir: '.loki/reference',

  // Diff directory
  diffDir: '.loki/diff',

  // Current screenshots directory
  currentDir: '.loki/current',

  // ==========================================================================
  // Chrome Configuration (Primary)
  // ==========================================================================

  configurations: {
    // Desktop Chrome - Primary testing target
    'chrome.laptop': {
      target: 'chrome.docker',
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    },

    // Mobile Chrome
    'chrome.iphone14': {
      target: 'chrome.docker',
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    },

    // Tablet Chrome
    'chrome.ipad': {
      target: 'chrome.docker',
      width: 834,
      height: 1112,
      deviceScaleFactor: 2,
      mobile: true,
    },
  },

  // ==========================================================================
  // Test Options
  // ==========================================================================

  // Stories to skip (glob patterns)
  // Skip stories with known issues or that shouldn't be visually tested
  skipStories: [
    '**/Docs',           // Skip Storybook docs pages
    '**/*--loading',     // Skip loading state stories (animated)
    '**/*--animating',   // Skip animation stories
  ],

  // Stories to include (if empty, all non-skipped stories are included)
  // storiesFilter: ['**/Button/**', '**/Card/**'],

  // ==========================================================================
  // Comparison Options
  // ==========================================================================

  // Difference threshold (0-1, 0 = no difference allowed)
  diffingEngine: 'pixelmatch',
  diffingOptions: {
    threshold: 0.1,       // Color difference threshold
    includeAA: true,      // Include anti-aliasing differences
  },

  // Maximum allowed pixel difference
  // If more pixels differ than this, test fails
  // maxDiffPixels: 50,

  // Maximum allowed difference ratio
  // If more than this percentage of pixels differ, test fails
  maxDiffRatio: 0.01,  // 1%

  // ==========================================================================
  // Timing Options
  // ==========================================================================

  // Wait for fonts to load
  waitForFontsLoaded: true,

  // Wait for images to load
  waitForImagesLoaded: true,

  // Additional wait time after page load (ms)
  waitBeforeScreenshot: 500,

  // Page load timeout
  pageLoadTimeout: 30000,

  // ==========================================================================
  // Browser Preparation
  // ==========================================================================

  // CSS to inject before screenshots (disable animations)
  chromeEnableAnimations: false,

  // Additional styles to inject
  injectStyles: `
    *,
    *::before,
    *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }

    /* Hide blinking cursor */
    * {
      caret-color: transparent !important;
    }

    /* Stabilize scrollbars */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
  `,

  // ==========================================================================
  // Docker Configuration (for chrome.docker target)
  // ==========================================================================

  // Docker image for Chrome
  chromeDockerImage: 'yukinying/chrome-headless-browser-stable:latest',

  // Chrome flags
  chromeFlags: [
    '--hide-scrollbars',
    '--disable-gpu',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
  ],

  // ==========================================================================
  // CI/CD Integration
  // ==========================================================================

  // Fail on missing reference images (set to true in CI)
  requireReference: process.env.CI === 'true',

  // Update references automatically (set to false in CI)
  updateReference: process.env.CI !== 'true',

  // Enable verbose logging
  verboseLogging: process.env.DEBUG === 'true',
};
