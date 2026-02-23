# QA Kit - Reusable Visual Regression & E2E Testing

A drop-in QA and Visual Regression testing kit with persistent personas, lifecycle journeys, and a self-hosted dashboard.

## Features

- **Persistent Personas**: Test users like "Peter" that maintain state across test runs
- **Lifecycle Journeys**: Idempotent test flows (signup → onboarding → activation → power user)
- **Cross-Browser Testing**: Playwright with Chrome, Firefox, and WebKit
- **Responsive Testing**: Desktop, tablet, and mobile viewports
- **Visual Regression**: Self-hosted VRT dashboard + Playwright screenshots
- **Component Testing**: Storybook + Loki integration
- **Reusable**: Adapter pattern for any web application

## Prerequisites

- **Node.js** 18+ (or 20+)
- **pnpm** 8+
- **Docker Desktop** (for VRT and Loki)
- Running instance of your application

## Quick Start

```bash
# 1. Install dependencies
cd qa-kit
pnpm qa:install

# 2. Copy environment file
cp .env.example .env
# Edit .env with your credentials

# 3. Start VRT dashboard (optional)
pnpm qa:vrt:up

# 4. Bootstrap a persona
pnpm qa:bootstrap peter

# 5. Run journey tests
pnpm qa:run peter
```

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `pnpm qa:install` | Install dependencies and Playwright browsers |
| `pnpm qa:bootstrap <persona>` | Create/seed a test persona |
| `pnpm qa:run <persona>` | Run journeys to target lifecycle |
| `pnpm qa:run:headed <persona>` | Run with visible browser |
| `pnpm qa:run:ci <persona>` | Run in CI mode (headless, strict) |
| `pnpm qa:visual <persona>` | Run visual smoke tests |
| `pnpm qa:reset <persona>` | Reset persona to initial state |

### VRT Dashboard

| Command | Description |
|---------|-------------|
| `pnpm qa:vrt:up` | Start VRT services (Docker) |
| `pnpm qa:vrt:down` | Stop VRT services |
| `pnpm qa:vrt:logs` | View VRT logs |

### Storybook + Loki

| Command | Description |
|---------|-------------|
| `pnpm qa:storybook` | Start Storybook |
| `pnpm qa:loki:test` | Run component visual tests |
| `pnpm qa:loki:update` | Update baseline screenshots |
| `pnpm qa:loki:approve` | Approve visual changes |

### Reports

| Command | Description |
|---------|-------------|
| `pnpm qa:report` | Open Playwright HTML report |
| `pnpm qa:trace` | Open Playwright trace viewer |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Application
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001/api

# Test Personas
E2E_PETER_EMAIL=peter.power+e2e@piro.test
E2E_PETER_PASSWORD=your-secure-password

# VRT (Visual Regression Tracker)
VRT_API_URL=http://localhost:4200
VRT_UI_URL=http://localhost:8080
VRT_PROJECT=piro
VRT_API_KEY=your-api-key

# E2E Test Endpoints
E2E_BOOTSTRAP_SECRET=your-bootstrap-secret
```

## Personas

Personas are test users with defined characteristics and lifecycle stages.

### Built-in Personas

| Persona | Description | Target Lifecycle |
|---------|-------------|------------------|
| `peter` | Power user with high expectations | `power_user` |

### Creating a New Persona

```bash
pnpm qa:persona:create --id mary --name "Mary"
```

Then edit `personas/mary.persona.ts` to customize traits and settings.

### Lifecycle Stages

1. **signup**: User account created
2. **onboarded**: Initial setup completed
3. **activated**: First meaningful action (data created)
4. **power_user**: Advanced features used

## Journeys

Journeys are test suites that progress a persona through lifecycle stages.

### Available Journeys

| Journey | Description | Target Stage |
|---------|-------------|--------------|
| `signup` | Create account, verify email | `signup` |
| `onboarding` | Complete initial setup | `onboarded` |
| `activation` | Create first data, view reports | `activated` |
| `power-user` | Advanced features, filters, export | `power_user` |
| `whats-new` | Test release notes notification | - |

### Running Specific Journeys

```bash
# Run all journeys to target lifecycle
pnpm qa:run peter

# Run specific journey
pnpm qa:run peter --journey signup

# Run with visible browser
pnpm qa:run:headed peter --journey onboarding
```

## Visual Regression Testing

### VRT Dashboard

The Visual Regression Tracker provides a Percy-like experience locally:

1. Start VRT: `pnpm qa:vrt:up`
2. Open dashboard: http://localhost:8080
3. Run tests: `pnpm qa:run peter`
4. Review and approve diffs in the dashboard

### Playwright Screenshots

Screenshots are saved to `artifacts/screenshots/` and include:
- Journey progress screenshots
- VRT captures for comparison
- Failure screenshots

### Masking Dynamic Content

Use mask selectors to hide timestamps, random IDs, etc.:

```typescript
await vrtCapture(page, {
  name: 'dashboard',
  maskSelectors: ['[data-testid*="timestamp"]', '.time-ago'],
});
```

## Using QA Kit with Your Own Project

QA Kit now supports **any web project** through a simple configuration system! No need to modify core files.

### Quick Setup

1. **Copy the configuration template**:
   ```bash
   cp config/template.config.ts config/yourproject.config.ts
   ```

2. **Configure your project** by editing `yourproject.config.ts`:
   ```typescript
   const yourProjectConfig: ProjectConfig = {
     name: 'yourproject',
     baseUrl: 'http://localhost:3000',
     
     auth: {
       loginPath: '/login',
       emailSelector: '[data-testid="email-input"]',
       passwordSelector: '[data-testid="password-input"]',
       submitSelector: '[data-testid="login-button"]',
       successUrlPattern: /\/dashboard/,
     },
     
     pages: [
       {
         path: '/users',
         name: 'users',
         hasCreate: true,
         createButton: '[data-testid="create-user"]',
         fields: [
           {
             selector: '[data-testid="user-name"]',
             value: 'Test User',
             type: 'text',
             required: true,
           },
           // ... more fields
         ],
       },
       // ... more pages
     ],
   };
   ```

3. **Set up environment variables**:
   ```bash
   E2E_SWEEP_EMAIL=your-test-user@example.com
   E2E_SWEEP_PASSWORD=your-test-password
   ```

4. **Run bug sweep on your project**:
   ```bash
   QA_PROJECT=yourproject pnpm qa:sweep
   ```

### Configuration Guide

#### Basic Project Information

```typescript
{
  name: 'yourproject',                    // Used in reports
  baseUrl: 'http://localhost:3000',       // Your app's base URL
  apiUrl: 'http://localhost:3001/api',    // Optional API URL
}
```

#### Authentication Flow

```typescript
auth: {
  loginPath: '/login',                               // Your login page path
  emailSelector: '[data-testid="email-input"]',     // Email input selector
  passwordSelector: '[data-testid="password-input"]', // Password input selector
  submitSelector: '[data-testid="login-button"]',   // Submit button selector
  successUrlPattern: /\/dashboard/,                  // Regex for success URL
}
```

#### Page Configuration

For **CRUD pages** (with create functionality):

```typescript
{
  path: '/users',
  name: 'users',
  hasCreate: true,
  createButton: '[data-testid="create-user"]',
  formSelector: '[data-testid="user-modal"]',     // Optional: form container
  submitButton: '[data-testid="save-user"]',      // Optional: submit button
  fields: [
    {
      selector: '[data-testid="user-name"]',
      value: 'Test User',
      type: 'text',
      required: true,
    },
    {
      selector: '[data-testid="user-email"]',
      value: 'test@example.com',
      type: 'email',
      required: true,
    },
    {
      selector: '[data-testid="user-role"]',
      value: 'Admin',
      type: 'select',
      selectBy: 'text',    // 'text' or 'value'
    },
  ],
}
```

For **read-only pages** (no create functionality):

```typescript
{
  path: '/dashboard',
  name: 'dashboard',
  hasCreate: false,    // Just tests that page loads without errors
}
```

#### Field Types

| Type | Description | Example Value |
|------|-------------|---------------|
| `text` | Text input | `"Test User"` |
| `email` | Email input | `"test@example.com"` |
| `number` | Numeric input | `42` |
| `date` | Date input | `"2024-01-01"` |
| `select` | Dropdown | `"Option Text"` |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `QA_PROJECT` | No | Project config to use (default: `piro`) |
| `E2E_SWEEP_EMAIL` | Yes | Test user email |
| `E2E_SWEEP_PASSWORD` | Yes | Test user password |
| `APP_BASE_URL` | No | Override base URL from config |

### Running Tests

```bash
# Default (uses Piro configuration)
pnpm qa:sweep

# Use your project configuration
QA_PROJECT=yourproject pnpm qa:sweep

# Run in headless mode
QA_PROJECT=yourproject pnpm qa:sweep:headless

# Override base URL
APP_BASE_URL=https://staging.yourapp.com QA_PROJECT=yourproject pnpm qa:sweep
```

### Common Selector Patterns

Use these patterns in your configuration:

```typescript
// Data-testid (recommended)
'[data-testid="element-name"]'

// Multiple selectors as fallbacks (comma-separated)
'[data-testid="submit"], button[type="submit"], button:has-text("Save")'

// By attribute
'input[type="email"]'
'button[type="submit"]'

// By text content
'button:has-text("Create")'
'button:has-text("Save")'

// By ARIA attributes
'[aria-label="Close"]'
'[role="dialog"]'
```

### What Gets Tested

For each configured page, QA Kit will:

1. **Navigate** to the page and verify it loads
2. **Check for errors** (console errors, UI errors, network failures)
3. **Test create functionality** (if `hasCreate: true`):
   - Click the create button
   - Fill out the form with configured test data
   - Submit the form
   - Check for validation errors
4. **Capture screenshots** of any errors found
5. **Generate a detailed JSON report**

### Advanced Features

#### Custom Error Selectors

```typescript
// In your project config, you can specify additional error selectors
bugSweep: {
  errorSelectors: [
    '.your-custom-error-class',
    '[data-testid="error-banner"]',
  ],
  loadingSelectors: [
    '.your-loading-spinner',
  ],
}
```

#### Multiple Projects

You can maintain configurations for multiple environments:

```bash
# Development
QA_PROJECT=yourproject pnpm qa:sweep

# Staging
QA_PROJECT=yourproject-staging pnpm qa:sweep

# Different product
QA_PROJECT=yourother-app pnpm qa:sweep
```

## Adding to a New Project (Legacy Adapter Method)

For advanced lifecycle testing and persona management, you can still create custom adapters:

### 1. Copy the qa-kit folder

```bash
cp -r qa-kit /path/to/your-project/
```

### 2. Create an adapter

Create `adapters/your-app.adapter.ts`:

```typescript
import { BaseAdapter } from './base.adapter.js';

export class YourAppAdapter extends BaseAdapter {
  readonly appName = 'your-app';

  getBaseUrl() {
    return process.env.APP_BASE_URL || 'http://localhost:3000';
  }

  getSelectors() {
    return {
      // Map your app's selectors
      loginEmailInput: '[data-testid="email-input"]',
      loginPasswordInput: '[data-testid="password-input"]',
      // ... more selectors
    };
  }

  async login(page, persona) {
    // Implement your login flow
  }

  // ... implement other methods
}
```

### 3. Update adapter index

In `adapters/index.ts`:

```typescript
export { YourAppAdapter, yourAppAdapter } from './your-app.adapter.js';

export function getAdapter() {
  const adapterName = process.env.APP_ADAPTER || 'your-app';
  // ...
}
```

### 4. Configure environment

Create `.env` with your app-specific settings.

### 5. Add data-testid attributes

Add stable selectors to your UI components for reliable testing.

## Debugging

### View Test Traces

Playwright records traces for failed tests:

```bash
pnpm qa:trace artifacts/traces/test-failure.zip
```

### Debug Mode

Run tests with Playwright Inspector:

```bash
pnpm qa:test:debug
```

### View HTML Report

```bash
pnpm qa:report
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect to VRT" | Run `pnpm qa:vrt:up` first |
| "Persona not found" | Run `pnpm qa:bootstrap <persona>` |
| "Login failed" | Check E2E_*_PASSWORD in .env |
| "Selector not found" | Add data-testid to your UI |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: cd qa-kit && pnpm qa:install

      - name: Start VRT
        run: cd qa-kit && pnpm qa:vrt:up

      - name: Bootstrap persona
        run: cd qa-kit && pnpm qa:bootstrap peter

      - name: Run tests
        run: cd qa-kit && pnpm qa:run:ci peter

      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-artifacts
          path: qa-kit/artifacts/
```

## Architecture

```
qa-kit/
├── adapters/           # App-specific implementations
│   ├── base.adapter.ts
│   └── piro.adapter.ts
├── personas/           # Test user definitions
│   ├── personas.ts
│   └── peter.persona.ts
├── journeys/           # Lifecycle test suites
│   ├── signup.journey.ts
│   ├── onboarding.journey.ts
│   ├── activation.journey.ts
│   ├── power-user.journey.ts
│   └── whats-new.journey.ts
├── playwright/         # Playwright configuration
│   ├── playwright.config.ts
│   ├── fixtures.ts
│   ├── selectors.ts
│   └── utils/
├── scripts/            # CLI tools
│   ├── bootstrap-persona.ts
│   ├── reset-persona.ts
│   └── run-journey.ts
├── storybook/          # Loki configuration
│   └── loki.config.js
├── docker/             # VRT Docker setup
│   └── vrt/
└── artifacts/          # Test outputs (gitignored)
    ├── screenshots/
    ├── traces/
    └── playwright-report/
```

## Best Practices

### Writing Tests

1. **Use data-testid** for all selectors
2. **Avoid sleeps** - use Playwright's auto-waiting
3. **Make tests idempotent** - safe to run multiple times
4. **Mask dynamic content** in visual tests

### Organizing Journeys

1. **One lifecycle stage per journey**
2. **Check prerequisites** at the start
3. **Update persona profile** at the end
4. **Use screenshots** for debugging

### Visual Regression

1. **Disable animations** for consistent screenshots
2. **Use masks** for timestamps, IDs, avatars
3. **Review all diffs** before approving
4. **Keep baselines in version control**

## License

MIT
