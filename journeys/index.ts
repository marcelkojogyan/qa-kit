/**
 * Journey Exports
 *
 * Journeys are test suites that represent user lifecycle stages.
 * They are idempotent and can be run multiple times safely.
 */

// Re-export journey modules for programmatic use
export * from './signup.journey.js';
export * from './onboarding.journey.js';
export * from './activation.journey.js';
export * from './power-user.journey.js';
export * from './whats-new.journey.js';

// =============================================================================
// Journey Registry
// =============================================================================

import type { LifecycleStage } from '../personas/personas.js';

/**
 * Journey definition
 */
export interface Journey {
  /** Journey ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /** Lifecycle stage this journey targets */
  targetStage: LifecycleStage;

  /** File path relative to journeys folder */
  file: string;

  /** Prerequisites (journey IDs that must be completed first) */
  prerequisites: string[];
}

/**
 * All available journeys
 */
export const JOURNEYS: Journey[] = [
  {
    id: 'signup',
    name: 'Signup Journey',
    description: 'Create user account and verify email',
    targetStage: 'signup',
    file: 'signup.journey.ts',
    prerequisites: [],
  },
  {
    id: 'onboarding',
    name: 'Onboarding Journey',
    description: 'Complete initial onboarding flow',
    targetStage: 'onboarded',
    file: 'onboarding.journey.ts',
    prerequisites: ['signup'],
  },
  {
    id: 'activation',
    name: 'Activation Journey',
    description: 'Create first data and view reports',
    targetStage: 'activated',
    file: 'activation.journey.ts',
    prerequisites: ['signup', 'onboarding'],
  },
  {
    id: 'power-user',
    name: 'Power User Journey',
    description: 'Test advanced features and workflows',
    targetStage: 'power_user',
    file: 'power-user.journey.ts',
    prerequisites: ['signup', 'onboarding', 'activation'],
  },
  {
    id: 'whats-new',
    name: "What's New Journey",
    description: 'Test release notes notification feature',
    targetStage: 'activated', // Can run at any stage after activation
    file: 'whats-new.journey.ts',
    prerequisites: ['signup', 'onboarding'],
  },
];

/**
 * Get journey by ID
 */
export function getJourney(id: string): Journey | undefined {
  return JOURNEYS.find(j => j.id === id);
}

/**
 * Get journeys for reaching a lifecycle stage
 */
export function getJourneysForStage(stage: LifecycleStage): Journey[] {
  const stageOrder: Record<LifecycleStage, number> = {
    signup: 0,
    onboarded: 1,
    activated: 2,
    power_user: 3,
  };

  const targetOrder = stageOrder[stage];

  return JOURNEYS.filter(j => {
    const journeyOrder = stageOrder[j.targetStage];
    return journeyOrder <= targetOrder;
  }).sort((a, b) => {
    return stageOrder[a.targetStage] - stageOrder[b.targetStage];
  });
}

/**
 * Get remaining journeys from current stage to target
 */
export function getRemainingJourneys(
  currentStage: LifecycleStage,
  targetStage: LifecycleStage
): Journey[] {
  const stageOrder: Record<LifecycleStage, number> = {
    signup: 0,
    onboarded: 1,
    activated: 2,
    power_user: 3,
  };

  const currentOrder = stageOrder[currentStage];
  const targetOrder = stageOrder[targetStage];

  if (currentOrder >= targetOrder) {
    return [];
  }

  return JOURNEYS.filter(j => {
    const journeyOrder = stageOrder[j.targetStage];
    return journeyOrder > currentOrder && journeyOrder <= targetOrder;
  }).sort((a, b) => {
    return stageOrder[a.targetStage] - stageOrder[b.targetStage];
  });
}
