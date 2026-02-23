/**
 * Piro E2E API Client
 *
 * Centralized HTTP client for calling Piro's E2E test endpoints.
 * Handles authentication, error handling, and response parsing.
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Header name for E2E secret authentication.
 * Must match the backend guard: @nestjs/common X-E2E-Secret header check.
 */
const E2E_SECRET_HEADER = 'X-E2E-Secret';

/**
 * E2E API path prefix (relative to API base URL)
 */
const E2E_PATH_PREFIX = 'e2e';

// =============================================================================
// Types
// =============================================================================

export interface BootstrapRequest {
  personaId: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  orgName?: string;
  seedProfile?: 'EMPTY' | 'MINIMAL' | 'STANDARD' | 'LARGE_DATASET';
}

export interface BootstrapResponse {
  success: boolean;
  profile: {
    id: string;
    personaId: string;
    userId: string | null;
    orgId: string | null;
    lifecycleStage: string;
    seedProfile: string;
    lastCompletedJourney: string | null;
    lastSeenReleaseNoteId: string | null;
    lastJourneyRun: string | null;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  organization: {
    id: string;
    name: string;
  };
  isNew: boolean;
}

export interface ResetRequest {
  personaId: string;
  targetStage?: 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER';
  fullReset?: boolean;
}

export interface PersonaProfileResponse {
  id: string;
  personaId: string;
  userId: string | null;
  orgId: string | null;
  lifecycleStage: string;
  seedProfile: string;
  lastCompletedJourney: string | null;
  lastSeenReleaseNoteId: string | null;
  lastJourneyRun: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeedDataRequest {
  personaId: string;
  profile?: 'EMPTY' | 'MINIMAL' | 'STANDARD' | 'LARGE_DATASET';
}

export interface SeedDataResponse {
  success: boolean;
  counts: {
    customers: number;
    vendors: number;
    invoices: number;
    bills: number;
    expenses: number;
  };
}

export interface UpdateJourneyRequest {
  personaId: string;
  journeyName: string;
  newStage?: 'SIGNUP' | 'ONBOARDED' | 'ACTIVATED' | 'POWER_USER';
}

export interface E2EHealthResponse {
  status: string;
  e2eEnabled: boolean;
  timestamp: string;
}

// =============================================================================
// E2E Client
// =============================================================================

export class PiroE2EClient {
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor() {
    const apiBaseUrl = process.env.API_BASE_URL;
    const secret = process.env.E2E_BOOTSTRAP_SECRET;

    if (!apiBaseUrl) {
      throw new Error(
        'API_BASE_URL environment variable is required.\n' +
        'Set it in your .env file (e.g., API_BASE_URL=http://localhost:3001/api)'
      );
    }

    if (!secret) {
      throw new Error(
        'E2E_BOOTSTRAP_SECRET environment variable is required.\n' +
        'Set it in your .env file to match your backend E2E_BOOTSTRAP_SECRET.'
      );
    }

    // Normalize base URL - handles both:
    // - http://localhost:3001/api (includes /api)
    // - http://localhost:3001 (needs /api added)
    let normalizedUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (!normalizedUrl.endsWith('/api')) {
      normalizedUrl = `${normalizedUrl}/api`;
    }
    this.baseUrl = normalizedUrl;
    this.secret = secret;
  }

  /**
   * Make an authenticated request to the E2E API
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/${E2E_PATH_PREFIX}/${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        [E2E_SECRET_HEADER]: this.secret,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorBody = await response.text();
        errorMessage = errorBody || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }

      if (response.status === 404) {
        throw new Error(
          `E2E endpoint not found: ${path}\n` +
          'Make sure E2E_ENABLED=true is set on the backend and the E2E module is loaded.'
        );
      }

      if (response.status === 403) {
        throw new Error(
          `E2E authentication failed for: ${path}\n` +
          'Check that E2E_BOOTSTRAP_SECRET matches between qa-kit and backend.'
        );
      }

      throw new Error(
        `E2E API error [${response.status}] ${method} ${path}: ${errorMessage}`
      );
    }

    return response.json();
  }

  // ===========================================================================
  // API Methods
  // ===========================================================================

  /**
   * Bootstrap a test persona
   * Creates user, organization, and persona profile if they don't exist.
   * Idempotent - safe to call multiple times.
   */
  async bootstrapPersona(req: BootstrapRequest): Promise<BootstrapResponse> {
    return this.request<BootstrapResponse>('POST', 'bootstrap-persona', req);
  }

  /**
   * Get persona profile by ID
   */
  async getPersonaProfile(personaId: string): Promise<PersonaProfileResponse> {
    return this.request<PersonaProfileResponse>('GET', `persona-profile/${personaId}`);
  }

  /**
   * Reset a persona to a specific lifecycle stage
   */
  async resetPersona(req: ResetRequest): Promise<PersonaProfileResponse> {
    return this.request<PersonaProfileResponse>('POST', 'reset-persona', req);
  }

  /**
   * Seed test data for a persona's organization
   */
  async seedData(req: SeedDataRequest): Promise<SeedDataResponse> {
    return this.request<SeedDataResponse>('POST', 'seed-data', req);
  }

  /**
   * Update journey progress for a persona
   */
  async updateJourneyProgress(req: UpdateJourneyRequest): Promise<PersonaProfileResponse> {
    return this.request<PersonaProfileResponse>('POST', 'update-journey', req);
  }

  /**
   * Health check - verify E2E endpoints are available
   */
  async healthCheck(): Promise<E2EHealthResponse> {
    return this.request<E2EHealthResponse>('GET', 'health');
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

let clientInstance: PiroE2EClient | null = null;

/**
 * Get or create the E2E client instance.
 * Validates environment variables on first call.
 */
export function getE2EClient(): PiroE2EClient {
  if (!clientInstance) {
    clientInstance = new PiroE2EClient();
  }
  return clientInstance;
}
