import type { Page } from '@playwright/test';

// =============================================================================
// Stable UI Utilities
// =============================================================================

/**
 * CSS to inject for disabling animations and transitions
 */
const DISABLE_ANIMATIONS_CSS = `
  *,
  *::before,
  *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }

  /* Disable specific animation classes */
  .animate-spin,
  .animate-pulse,
  .animate-bounce,
  .animate-ping {
    animation: none !important;
  }

  /* Disable loading skeletons */
  .skeleton,
  [data-loading] {
    animation: none !important;
    background: #e5e7eb !important;
  }

  /* Hide cursor blinking */
  * {
    caret-color: transparent !important;
  }
`;

/**
 * CSS to inject for hiding dynamic content during screenshots
 */
const HIDE_DYNAMIC_CONTENT_CSS = `
  /* Hide timestamps that change */
  [data-testid*="timestamp"],
  [data-testid*="time"],
  .timestamp,
  .time-ago {
    visibility: hidden !important;
  }

  /* Hide live badges/indicators */
  .live-indicator,
  [data-live] {
    visibility: hidden !important;
  }
`;

/**
 * Disable all CSS animations and transitions
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
}

/**
 * Hide dynamic content for consistent screenshots
 */
export async function hideDynamicContent(page: Page): Promise<void> {
  await page.addStyleTag({ content: HIDE_DYNAMIC_CONTENT_CSS });
}

/**
 * Freeze time via JavaScript
 * This mocks Date to return a consistent timestamp
 */
export async function freezeTime(
  page: Page,
  frozenDate: Date = new Date('2026-01-28T12:00:00.000Z')
): Promise<void> {
  await page.addInitScript((timestamp: number) => {
    const OriginalDate = Date;

    // @ts-expect-error - we're intentionally replacing Date
    window.Date = class extends OriginalDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(timestamp);
        } else {
          // @ts-expect-error - spread args
          super(...args);
        }
      }

      static now() {
        return timestamp;
      }
    };
  }, frozenDate.getTime());
}

/**
 * Wait for all images to load
 */
export async function waitForImages(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every(img => img.complete && img.naturalWidth > 0);
    },
    { timeout }
  );
}

/**
 * Wait for all fonts to load
 */
export async function waitForFonts(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForFunction(
    () => document.fonts.ready.then(() => true),
    { timeout }
  );
}

/**
 * Wait for page to be visually stable (no layout shifts)
 */
export async function waitForVisualStability(page: Page, options?: {
  timeout?: number;
  stableTime?: number;
}): Promise<void> {
  const timeout = options?.timeout ?? 10000;
  const stableTime = options?.stableTime ?? 500;

  // Wait for no layout shifts for stableTime milliseconds
  await page.waitForFunction(
    (stableMs: number) => {
      return new Promise(resolve => {
        let lastShift = Date.now();
        let resolved = false;

        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift') {
              lastShift = Date.now();
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });

        const checkStability = () => {
          if (resolved) return;
          if (Date.now() - lastShift >= stableMs) {
            resolved = true;
            observer.disconnect();
            resolve(true);
          } else {
            setTimeout(checkStability, 100);
          }
        };

        checkStability();
      });
    },
    stableTime,
    { timeout }
  );
}

/**
 * Prepare page for screenshots (all-in-one)
 */
export async function prepareForScreenshot(page: Page, options?: {
  disableAnimations?: boolean;
  hideDynamic?: boolean;
  freezeTime?: Date;
  waitForImages?: boolean;
  waitForFonts?: boolean;
  waitForStability?: boolean;
}): Promise<void> {
  const opts = {
    disableAnimations: true,
    hideDynamic: true,
    freezeTime: undefined,
    waitForImages: true,
    waitForFonts: true,
    waitForStability: true,
    ...options,
  };

  const tasks: Promise<void>[] = [];

  if (opts.disableAnimations) {
    tasks.push(disableAnimations(page));
  }

  if (opts.hideDynamic) {
    tasks.push(hideDynamicContent(page));
  }

  // Run style injections in parallel
  await Promise.all(tasks);

  // Wait for visual assets
  if (opts.waitForImages) {
    await waitForImages(page).catch(() => {});
  }

  if (opts.waitForFonts) {
    await waitForFonts(page).catch(() => {});
  }

  if (opts.waitForStability) {
    await waitForVisualStability(page).catch(() => {});
  }
}

/**
 * Scroll element into view with consistent positioning
 */
export async function scrollIntoViewStable(
  page: Page,
  selector: string
): Promise<void> {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, selector);

  // Small delay for scroll to settle
  await page.waitForTimeout(100);
}

/**
 * Set a consistent viewport size
 */
export async function setStableViewport(
  page: Page,
  width: number = 1440,
  height: number = 900
): Promise<void> {
  await page.setViewportSize({ width, height });
}
