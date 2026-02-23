import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext, Page } from '@playwright/test';
import type { Persona } from '../../adapters/base.adapter.js';
import { getAdapter } from '../../adapters/index.js';

// =============================================================================
// Storage State Management
// =============================================================================

const STORAGE_STATE_DIR = path.resolve(__dirname, '../../artifacts/.auth');

/**
 * Get storage state file path for a persona
 */
export function getStorageStatePath(personaId: string): string {
  return path.join(STORAGE_STATE_DIR, `${personaId}.json`);
}

/**
 * Check if storage state exists for a persona
 */
export function hasStorageState(personaId: string): boolean {
  const statePath = getStorageStatePath(personaId);
  return fs.existsSync(statePath);
}

/**
 * Save storage state for a persona
 */
export async function saveStorageState(
  context: BrowserContext,
  personaId: string
): Promise<string> {
  // Ensure directory exists
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
  }

  const statePath = getStorageStatePath(personaId);
  await context.storageState({ path: statePath });

  console.log(`[StorageState] Saved for ${personaId}: ${statePath}`);
  return statePath;
}

/**
 * Load storage state for a persona
 * Returns the path if it exists, null otherwise
 */
export function loadStorageStatePath(personaId: string): string | null {
  const statePath = getStorageStatePath(personaId);
  if (fs.existsSync(statePath)) {
    return statePath;
  }
  return null;
}

/**
 * Clear storage state for a persona
 */
export function clearStorageState(personaId: string): void {
  const statePath = getStorageStatePath(personaId);
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    console.log(`[StorageState] Cleared for ${personaId}`);
  }
}

/**
 * Clear all storage states
 */
export function clearAllStorageStates(): void {
  if (fs.existsSync(STORAGE_STATE_DIR)) {
    const files = fs.readdirSync(STORAGE_STATE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(STORAGE_STATE_DIR, file));
      }
    }
    console.log(`[StorageState] Cleared all (${files.length} files)`);
  }
}

/**
 * Check if storage state is still valid (not expired)
 */
export async function isStorageStateValid(
  personaId: string,
  maxAgeMs: number = 3600000 // 1 hour default
): Promise<boolean> {
  const statePath = getStorageStatePath(personaId);

  if (!fs.existsSync(statePath)) {
    return false;
  }

  // Check file age
  const stats = fs.statSync(statePath);
  const ageMs = Date.now() - stats.mtimeMs;

  if (ageMs > maxAgeMs) {
    console.log(`[StorageState] ${personaId} expired (age: ${Math.round(ageMs / 1000)}s)`);
    return false;
  }

  // TODO: Optionally validate token expiry from the storage state file

  return true;
}

/**
 * Get or create storage state for a persona
 * This will login and save the state if it doesn't exist or is invalid
 */
export async function getOrCreateStorageState(
  page: Page,
  persona: Persona,
  options?: { forceRefresh?: boolean; maxAgeMs?: number }
): Promise<string> {
  const personaId = persona.id;
  const forceRefresh = options?.forceRefresh ?? false;
  const maxAgeMs = options?.maxAgeMs ?? 3600000;

  // Check if valid storage state exists
  if (!forceRefresh && await isStorageStateValid(personaId, maxAgeMs)) {
    console.log(`[StorageState] Using existing for ${personaId}`);
    return getStorageStatePath(personaId);
  }

  // Login and save new storage state
  console.log(`[StorageState] Creating new for ${personaId}`);
  const adapter = getAdapter();
  await adapter.login(page, persona);

  const statePath = await saveStorageState(page.context(), personaId);
  return statePath;
}

/**
 * Setup authenticated session from storage state
 * Call this at the start of tests that need authentication
 */
export async function setupAuthenticatedSession(
  page: Page,
  persona: Persona
): Promise<void> {
  const storagePath = loadStorageStatePath(persona.id);

  if (storagePath) {
    // Storage state is already set in context from fixture
    // Just navigate to ensure we're on the app
    const adapter = getAdapter();
    await page.goto(`${adapter.getBaseUrl()}/dashboard`);
    await adapter.waitForPageReady(page);
  } else {
    // No storage state, need to login
    const adapter = getAdapter();
    await adapter.login(page, persona);
    await saveStorageState(page.context(), persona.id);
  }
}
