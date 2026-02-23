import { definePersona } from './personas.js';

/**
 * Peter - Power User Persona
 *
 * Peter is an experienced user with high expectations.
 * He's used to polished products like Apple, Google, Notion, and Microsoft apps.
 * He needs a large dataset to test advanced features and performance.
 *
 * Lifecycle target: power_user
 * Seed profile: large_dataset (lots of transactions, categories, rules)
 */
export const peter = definePersona()
  .id('peter')
  .displayName('Peter')
  .email('E2E_PETER_EMAIL', 'peter.power+e2e@piro.test')
  .password('E2E_PETER_PASSWORD')
  .traits([
    'advanced',
    'power_user',
    'high_expectations',
    'detail_oriented',
    'keyboard_shortcuts',
    'bulk_operations',
    'reporting_heavy',
    'multi_currency',
  ])
  .targetLifecycle('power_user')
  .seedProfile('large_dataset')
  .build();

/**
 * Peter's journey expectations:
 *
 * 1. Signup:
 *    - Account created
 *    - Organization created
 *    - Initial welcome shown
 *
 * 2. Onboarding:
 *    - Business details configured
 *    - Currency set (GHS)
 *    - Fiscal year configured
 *    - Initial accounts created
 *
 * 3. Activation:
 *    - Sample data imported (large_dataset)
 *    - First invoice created
 *    - First report generated
 *    - Dashboard populated
 *
 * 4. Power User:
 *    - Custom account categories
 *    - Recurring invoices set up
 *    - Advanced filters used
 *    - Bulk operations performed
 *    - Multiple reports generated
 *    - Keyboard shortcuts tested
 *    - Export functionality used
 */

export default peter;
