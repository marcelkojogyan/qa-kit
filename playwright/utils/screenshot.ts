import * as fs from 'fs';
import * as path from 'path';
import type { Page, Locator, PageScreenshotOptions } from '@playwright/test';
import { prepareForScreenshot } from './stable-ui.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Screenshot Utilities
// =============================================================================

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../artifacts/screenshots');

/**
 * Screenshot options for consistent captures
 */
export interface ScreenshotOptions {
  /** Name for the screenshot (without extension) */
  name: string;

  /** Subdirectory within screenshots folder */
  subdir?: string;

  /** Full page screenshot (scrolling) */
  fullPage?: boolean;

  /** Specific element to screenshot */
  selector?: string;

  /** Elements to mask (hide) in screenshot */
  maskSelectors?: string[];

  /** Viewport tag (e.g., "desktop", "mobile") */
  viewportTag?: string;

  /** Prepare page for screenshot (disable animations, etc.) */
  prepareUI?: boolean;

  /** Additional Playwright screenshot options */
  playwrightOptions?: Omit<PageScreenshotOptions, 'path' | 'fullPage' | 'mask'>;
}

/**
 * Generate deterministic screenshot filename
 */
export function generateScreenshotFilename(options: {
  name: string;
  viewportTag?: string;
  browser?: string;
  timestamp?: boolean;
}): string {
  const parts: string[] = [options.name];

  if (options.viewportTag) {
    parts.push(options.viewportTag);
  }

  if (options.browser) {
    parts.push(options.browser);
  }

  if (options.timestamp) {
    parts.push(new Date().toISOString().replace(/[:.]/g, '-'));
  }

  return `${parts.join('_')}.png`;
}

/**
 * Take a screenshot with consistent settings
 */
export async function takeScreenshot(
  page: Page,
  options: ScreenshotOptions
): Promise<string> {
  // Ensure screenshots directory exists
  const screenshotDir = options.subdir
    ? path.join(SCREENSHOTS_DIR, options.subdir)
    : SCREENSHOTS_DIR;

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Prepare UI for consistent screenshots
  if (options.prepareUI !== false) {
    await prepareForScreenshot(page);
  }

  // Generate filename
  const filename = generateScreenshotFilename({
    name: options.name,
    viewportTag: options.viewportTag,
  });
  const screenshotPath = path.join(screenshotDir, filename);

  // Build mask locators
  const masks: Locator[] = [];
  if (options.maskSelectors) {
    for (const selector of options.maskSelectors) {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        masks.push(locator);
      }
    }
  }

  // Take screenshot
  if (options.selector) {
    // Element screenshot
    const element = page.locator(options.selector);
    await element.screenshot({
      path: screenshotPath,
      mask: masks,
      ...options.playwrightOptions,
    });
  } else {
    // Page screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: options.fullPage ?? false,
      mask: masks,
      ...options.playwrightOptions,
    });
  }

  console.log(`[Screenshot] Saved: ${screenshotPath}`);
  return screenshotPath;
}

/**
 * Common mask selectors for dynamic content
 */
export const COMMON_MASKS = {
  timestamps: [
    '[data-testid*="timestamp"]',
    '[data-testid*="time"]',
    '.timestamp',
    '.time-ago',
    'time',
  ],
  avatars: [
    '[data-testid*="avatar"]',
    '.avatar',
    'img[alt*="avatar"]',
  ],
  charts: [
    '[data-testid*="chart"]',
    '.recharts-wrapper',
    'canvas',
  ],
  randomIds: [
    '[data-testid*="id-"]',
    '.invoice-number',
    '.reference-number',
  ],
  notifications: [
    '[data-testid*="notification"]',
    '[data-sonner-toast]',
  ],
};

/**
 * Get mask selectors for a category
 */
export function getMaskSelectors(...categories: (keyof typeof COMMON_MASKS)[]): string[] {
  return categories.flatMap(cat => COMMON_MASKS[cat] || []);
}

/**
 * Take screenshot of a specific element
 */
export async function screenshotElement(
  page: Page,
  selector: string,
  name: string,
  options?: Omit<ScreenshotOptions, 'name' | 'selector'>
): Promise<string> {
  return takeScreenshot(page, {
    name,
    selector,
    ...options,
  });
}

/**
 * Take full-page screenshot
 */
export async function screenshotFullPage(
  page: Page,
  name: string,
  options?: Omit<ScreenshotOptions, 'name' | 'fullPage'>
): Promise<string> {
  return takeScreenshot(page, {
    name,
    fullPage: true,
    ...options,
  });
}

/**
 * Take screenshot of visible viewport
 */
export async function screenshotViewport(
  page: Page,
  name: string,
  options?: Omit<ScreenshotOptions, 'name' | 'fullPage'>
): Promise<string> {
  return takeScreenshot(page, {
    name,
    fullPage: false,
    ...options,
  });
}

/**
 * Compare two screenshots pixel by pixel
 * Returns the difference ratio (0 = identical, 1 = completely different)
 */
export async function compareScreenshots(
  path1: string,
  path2: string
): Promise<number> {
  // This is a placeholder - actual implementation would use pixelmatch or similar
  // For now, just check if files are identical
  const buf1 = fs.readFileSync(path1);
  const buf2 = fs.readFileSync(path2);

  if (buf1.equals(buf2)) {
    return 0;
  }

  // Return a non-zero value to indicate difference
  // A real implementation would calculate pixel-by-pixel difference
  return 0.1;
}
