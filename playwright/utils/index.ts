/**
 * Playwright Utilities
 *
 * This module exports all utility functions for Playwright tests.
 */

// Authentication utilities
export {
  loginAs,
  logout,
  isLoggedIn,
  ensureLoggedIn,
  getCurrentUser,
  getCurrentOrganization,
  clearAuth,
} from './auth.js';

// Storage state utilities
export {
  getStorageStatePath,
  hasStorageState,
  saveStorageState,
  loadStorageStatePath,
  clearStorageState,
  clearAllStorageStates,
  isStorageStateValid,
  getOrCreateStorageState,
  setupAuthenticatedSession,
} from './storage-state.js';

// Stable UI utilities
export {
  disableAnimations,
  hideDynamicContent,
  freezeTime,
  waitForImages,
  waitForFonts,
  waitForVisualStability,
  prepareForScreenshot,
  scrollIntoViewStable,
  setStableViewport,
} from './stable-ui.js';

// Screenshot utilities
export {
  type ScreenshotOptions,
  generateScreenshotFilename,
  takeScreenshot,
  COMMON_MASKS,
  getMaskSelectors,
  screenshotElement,
  screenshotFullPage,
  screenshotViewport,
  compareScreenshots,
} from './screenshot.js';

// VRT utilities
export {
  type VrtCaptureOptions,
  type VrtTestInfo,
  vrtClient,
  vrtCapture,
  vrtInit,
  vrtFinalize,
  isVrtEnabled,
  getVrtDashboardUrl,
} from './vrt.js';

// Retry utilities
export {
  type RetryOptions,
  retry,
  sleep,
  waitFor,
  waitForNetworkIdle,
  waitForAnimations,
  retryOnPage,
  clickWithRetry,
  fillWithRetry,
  expectWithRetry,
  debounce,
  throttle,
} from './retry.js';
