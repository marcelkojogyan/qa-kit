import type { Page, Locator } from '@playwright/test';
import { prepareForScreenshot } from './stable-ui.js';
import { getMaskSelectors } from './screenshot.js';

// =============================================================================
// Visual Regression Tracker (VRT) Integration
// =============================================================================

/**
 * VRT configuration from environment
 */
const VRT_CONFIG = {
  apiUrl: process.env.VRT_API_URL || 'http://localhost:4200',
  apiKey: process.env.VRT_API_KEY || '',
  project: process.env.VRT_PROJECT || 'piro',
  branch: process.env.VRT_BRANCH || getCurrentBranch(),
  buildId: process.env.VRT_CI_BUILD_ID || generateLocalBuildId(),
  ciBuildNumber: process.env.CI_BUILD_NUMBER,
  enabled: process.env.VRT_ENABLED !== 'false',
};

/**
 * Get current git branch name
 */
function getCurrentBranch(): string {
  try {
    const { execSync } = require('child_process');
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

/**
 * Generate a local build ID for non-CI environments
 */
function generateLocalBuildId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `local-${timestamp}`;
}

/**
 * VRT capture options
 */
export interface VrtCaptureOptions {
  /** Name for this visual test */
  name: string;

  /** Specific element to capture */
  selector?: string;

  /** Selectors to mask in the screenshot */
  maskSelectors?: string[];

  /** Viewport tag for organization */
  viewportTag?: string;

  /** Additional tags/metadata */
  tags?: string[];

  /** Tolerance threshold (0-1) */
  tolerance?: number;

  /** Prepare UI before capture */
  prepareUI?: boolean;

  /** Ignore anti-aliasing differences */
  ignoreAntialiasing?: boolean;
}

/**
 * VRT test info for tracking
 */
export interface VrtTestInfo {
  name: string;
  status: 'unresolved' | 'new' | 'ok' | 'autoApproved' | 'failed';
  diffPercent?: number;
  baselineId?: string;
  testId?: string;
  url?: string;
}

/**
 * VRT client for managing visual regression tests
 */
class VrtClient {
  private buildId: string;
  private isInitialized: boolean = false;

  constructor() {
    this.buildId = VRT_CONFIG.buildId;
  }

  /**
   * Check if VRT is enabled and configured
   */
  isEnabled(): boolean {
    return VRT_CONFIG.enabled && !!VRT_CONFIG.apiKey;
  }

  /**
   * Initialize VRT build (call once per test run)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.isEnabled()) {
      return;
    }

    try {
      const response = await fetch(`${VRT_CONFIG.apiUrl}/builds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': VRT_CONFIG.apiKey,
        },
        body: JSON.stringify({
          project: VRT_CONFIG.project,
          branchName: VRT_CONFIG.branch,
          ciBuildId: VRT_CONFIG.ciBuildNumber || this.buildId,
        }),
      });

      if (!response.ok) {
        throw new Error(`VRT init failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.buildId = data.id || this.buildId;
      this.isInitialized = true;

      console.log(`[VRT] Build initialized: ${this.buildId}`);
    } catch (error) {
      console.error('[VRT] Failed to initialize:', error);
    }
  }

  /**
   * Capture and upload screenshot to VRT
   */
  async capture(page: Page, options: VrtCaptureOptions): Promise<VrtTestInfo | null> {
    if (!this.isEnabled()) {
      console.log(`[VRT] Disabled - skipping capture: ${options.name}`);
      return null;
    }

    await this.initialize();

    // Prepare page for consistent screenshots
    if (options.prepareUI !== false) {
      await prepareForScreenshot(page);
    }

    // Build mask locators
    const masks: Locator[] = [];
    const maskSelectors = [
      ...(options.maskSelectors || []),
      ...getMaskSelectors('timestamps', 'notifications'),
    ];

    for (const selector of maskSelectors) {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        masks.push(locator);
      }
    }

    // Take screenshot
    let imageBuffer: Buffer;

    if (options.selector) {
      const element = page.locator(options.selector);
      imageBuffer = await element.screenshot({
        mask: masks,
        animations: 'disabled',
      });
    } else {
      imageBuffer = await page.screenshot({
        fullPage: false,
        mask: masks,
        animations: 'disabled',
      });
    }

    // Generate test name with viewport tag
    const testName = options.viewportTag
      ? `${options.name} [${options.viewportTag}]`
      : options.name;

    // Upload to VRT
    try {
      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'screenshot.png');
      formData.append('name', testName);
      formData.append('buildId', this.buildId);
      formData.append('branchName', VRT_CONFIG.branch);
      formData.append('project', VRT_CONFIG.project);

      if (options.tolerance !== undefined) {
        formData.append('diffTollerancePercent', String(options.tolerance * 100));
      }

      if (options.ignoreAntialiasing) {
        formData.append('ignoreAntialiasing', 'true');
      }

      const response = await fetch(`${VRT_CONFIG.apiUrl}/test-runs`, {
        method: 'POST',
        headers: {
          'apiKey': VRT_CONFIG.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`VRT upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      console.log(`[VRT] Captured: ${testName} -> ${result.status}`);

      return {
        name: testName,
        status: result.status,
        diffPercent: result.diffPercent,
        baselineId: result.baselineId,
        testId: result.testRunId,
        url: `${VRT_CONFIG.apiUrl.replace(/\/api$/, '')}/test/${result.testRunId}`,
      };
    } catch (error) {
      console.error(`[VRT] Failed to upload ${testName}:`, error);
      return null;
    }
  }

  /**
   * Finalize the build (call at end of test run)
   */
  async finalize(): Promise<void> {
    if (!this.isInitialized || !this.isEnabled()) {
      return;
    }

    try {
      await fetch(`${VRT_CONFIG.apiUrl}/builds/${this.buildId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': VRT_CONFIG.apiKey,
        },
        body: JSON.stringify({
          isRunning: false,
        }),
      });

      console.log(`[VRT] Build finalized: ${this.buildId}`);
    } catch (error) {
      console.error('[VRT] Failed to finalize:', error);
    }
  }

  /**
   * Get VRT dashboard URL for the current build
   */
  getDashboardUrl(): string {
    const baseUrl = VRT_CONFIG.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/builds/${this.buildId}`;
  }
}

// Singleton VRT client
export const vrtClient = new VrtClient();

/**
 * Capture visual regression snapshot
 * Convenience function that uses the singleton client
 */
export async function vrtCapture(
  page: Page,
  options: VrtCaptureOptions
): Promise<VrtTestInfo | null> {
  return vrtClient.capture(page, options);
}

/**
 * Initialize VRT for test run
 */
export async function vrtInit(): Promise<void> {
  return vrtClient.initialize();
}

/**
 * Finalize VRT build
 */
export async function vrtFinalize(): Promise<void> {
  return vrtClient.finalize();
}

/**
 * Check if VRT is enabled
 */
export function isVrtEnabled(): boolean {
  return vrtClient.isEnabled();
}

/**
 * Get VRT dashboard URL
 */
export function getVrtDashboardUrl(): string {
  return vrtClient.getDashboardUrl();
}
