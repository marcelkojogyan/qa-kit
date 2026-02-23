import type { Page } from '@playwright/test';

// =============================================================================
// Retry and Resilience Utilities
// =============================================================================

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of attempts */
  maxAttempts?: number;

  /** Delay between attempts in milliseconds */
  delayMs?: number;

  /** Exponential backoff multiplier */
  backoffMultiplier?: number;

  /** Maximum delay between attempts */
  maxDelayMs?: number;

  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /** Callback on each retry */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'signal' | 'onRetry'>> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  let currentDelay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Check if cancelled
      if (opts.signal?.aborted) {
        throw new Error('Retry cancelled');
      }

      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this was the last attempt
      if (attempt >= opts.maxAttempts) {
        break;
      }

      // Call retry callback
      opts.onRetry?.(attempt, lastError);

      // Wait before next attempt
      await sleep(currentDelay);

      // Apply exponential backoff
      currentDelay = Math.min(
        currentDelay * opts.backoffMultiplier,
        opts.maxDelayMs
      );
    }
  }

  throw lastError;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
    message?: string;
  }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const interval = options?.interval ?? 100;
  const message = options?.message ?? 'Condition not met';

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(
  page: Page,
  options?: {
    timeout?: number;
    idleTime?: number;
  }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const idleTime = options?.idleTime ?? 500;

  await page.waitForLoadState('networkidle', { timeout });

  // Extra buffer for any pending requests
  await sleep(idleTime);
}

/**
 * Wait for no pending animations
 */
export async function waitForAnimations(page: Page, timeout: number = 5000): Promise<void> {
  await page.evaluate((timeoutMs: number) => {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();

      const checkAnimations = () => {
        const animations = document.getAnimations();
        const pendingAnimations = animations.filter(
          anim => anim.playState === 'running' || anim.playState === 'pending'
        );

        if (pendingAnimations.length === 0 || Date.now() - startTime > timeoutMs) {
          resolve();
        } else {
          requestAnimationFrame(checkAnimations);
        }
      };

      checkAnimations();
    });
  }, timeout);
}

/**
 * Retry action on page until successful
 */
export async function retryOnPage<T>(
  page: Page,
  action: (page: Page) => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return retry(
    () => action(page),
    {
      ...options,
      onRetry: (attempt, error) => {
        console.log(`[Retry] Attempt ${attempt} failed: ${error.message}`);
        options?.onRetry?.(attempt, error);
      },
    }
  );
}

/**
 * Click with retry (handles stale elements, overlays, etc.)
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  options?: {
    maxAttempts?: number;
    force?: boolean;
  }
): Promise<void> {
  await retryOnPage(
    page,
    async (p) => {
      const element = p.locator(selector);
      await element.click({ force: options?.force });
    },
    { maxAttempts: options?.maxAttempts ?? 3 }
  );
}

/**
 * Fill with retry
 */
export async function fillWithRetry(
  page: Page,
  selector: string,
  value: string,
  options?: {
    maxAttempts?: number;
    clear?: boolean;
  }
): Promise<void> {
  await retryOnPage(
    page,
    async (p) => {
      const element = p.locator(selector);
      if (options?.clear) {
        await element.clear();
      }
      await element.fill(value);
    },
    { maxAttempts: options?.maxAttempts ?? 3 }
  );
}

/**
 * Expect with retry (for flaky assertions)
 */
export async function expectWithRetry(
  condition: () => Promise<void>,
  options?: RetryOptions
): Promise<void> {
  await retry(condition, options);
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      fn(...args);
    }
  };
}
