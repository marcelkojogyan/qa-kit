# QA Kit - Intelligent Testing Framework

A portable QA testing framework that combines automated testing capabilities with intelligent failure analysis. QA Kit provides bug sweep automation, persona lifecycle management, visual regression testing, and Ralph-enhanced error analysis to deliver comprehensive quality assurance for web applications.

## Overview

QA Kit is designed to be a comprehensive testing solution that works with any web project through configuration files. It combines traditional testing approaches with intelligent analysis modules inspired by the Ralph QA Agent, providing developers and QA engineers with powerful tools for automated testing and failure analysis.

**Key capabilities:**
- Bug sweep automation with comprehensive error detection
- Persona lifecycles for user journey testing
- Visual regression testing with screenshot comparison
- Ralph-enhanced error analysis and evidence collection

**Target audience:**
- Developers seeking automated quality assurance
- QA engineers managing complex testing workflows  
- Product teams ensuring consistent user experiences

## Features

### **Bug Sweep Automation**
Automated CRUD form testing across web applications with comprehensive error detection, intelligent retry logic, and detailed reporting of form validation issues and user flow breakages.

### **Intelligent Error Analysis**
Ralph-inspired modules for failure classification and evidence collection that automatically analyze test failures, categorize issues by root cause, and provide actionable insights for faster resolution.

### **Portable Configuration** 
Works with any web project through configuration files, allowing teams to adapt QA Kit to their specific application architecture and testing requirements without code changes.

### **Visual Regression Testing**
Screenshot comparison and UI change detection that automatically captures visual differences between test runs, helping teams catch unintended UI changes before they reach production.

### **Persona Management**
User journey testing across different lifecycle stages with persistent test users that maintain state between runs, enabling comprehensive end-to-end testing scenarios.

## Installation & Setup

```bash
git clone https://github.com/marcelkojogyan/qa-kit.git
cd qa-kit
pnpm install
pnpm run doctor  # Environment validation
```

### Prerequisites

- Node.js 18+ (or 20+)
- pnpm 8+
- Docker Desktop (for VRT dashboard)
- Running instance of your target application

## Quick Start - Bug Sweep

```bash
# Basic usage
E2E_SWEEP_EMAIL=test@example.com E2E_SWEEP_PASSWORD=password pnpm qa:sweep

# Headless mode
pnpm qa:sweep:headless

# Custom target
APP_BASE_URL=https://your-app.com pnpm qa:sweep

# With specific configuration
pnpm qa:sweep --config=./config/your-project.config.ts
```

## Configuration

### Project Configuration

QA Kit uses TypeScript configuration files to adapt to your specific application:

**config/piro.config.ts** - Example configuration for Piro project:
```typescript
export default {
  baseUrl: 'https://app.piro.com',
  auth: {
    loginPath: '/login',
    signupPath: '/signup'
  },
  selectors: {
    forms: '.form-container',
    buttons: '[data-testid*="button"]'
  }
}
```

**config/template.config.ts** - Template for new projects:
```typescript
export default {
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  auth: {
    loginPath: '/auth/login',
    signupPath: '/auth/signup'
  },
  // Add your application-specific selectors and configuration
}
```

### Environment Variables

Required environment variables for bug sweep testing:

```bash
# Authentication
E2E_SWEEP_EMAIL=test@example.com
E2E_SWEEP_PASSWORD=your-test-password

# Application
APP_BASE_URL=https://your-app.com

# Optional
HEADED=false                    # Run in headed mode
CI=true                        # CI environment optimizations
SCREENSHOT_ON_FAILURE=true     # Capture screenshots on test failure
```

## Folder Structure

```
qa-kit/
├── core/                    # Ralph-inspired intelligent modules
│   ├── resource-guard.ts    # Memory monitoring & circuit breaker
│   ├── failure-classifier.ts # Error classification with confidence scoring
│   ├── evidence-collector.ts # Comprehensive failure evidence
│   └── page-health.ts       # Page quality scoring (0-100)
├── scripts/
│   ├── bug-sweep.ts         # Main CRUD testing automation
│   └── doctor.ts            # Environment validation
├── config/
│   ├── piro.config.ts       # Piro project configuration
│   └── template.config.ts   # Template for new projects
├── adapters/                # Project-specific adapters
│   ├── base.adapter.ts      # Base adapter interface
│   └── piro.adapter.ts      # Piro-specific implementation
├── journeys/                # User lifecycle test journeys
│   ├── signup.journey.ts    # User registration flows
│   ├── onboarding.journey.ts # Post-signup onboarding
│   └── activation.journey.ts # Feature activation tests
└── playwright/              # Playwright configuration & utilities
    ├── fixtures.ts          # Custom test fixtures
    └── utils/               # Testing utilities
```

## Ralph Modules (Enhanced Intelligence)

QA Kit incorporates four key modules inspired by the Ralph QA Agent, providing intelligent analysis and monitoring capabilities:

### **ResourceGuard**
Prevents runaway tests through memory monitoring and circuit breaker protection. Automatically terminates tests that exceed resource limits and provides detailed resource usage analytics.

### **FailureClassifier** 
Analyzes test failures and categorizes them with confidence scoring:
- **TestFlake**: Intermittent failures due to timing or external factors
- **AppRegression**: Genuine application bugs or regressions
- **EnvironmentIssue**: Infrastructure or environment-related problems
- **DataProblem**: Test data inconsistencies or database issues

### **EvidenceCollector**
Captures comprehensive evidence bundles for failed tests including:
- Screenshots at point of failure
- DOM snapshots for debugging
- Performance metrics and timing data
- Accessibility scan results
- Network request logs
- Console error messages

### **PageHealthScorer**
Evaluates page quality with scores from 0-100 based on:
- JavaScript errors and console warnings
- Performance metrics (Core Web Vitals)
- Accessibility compliance
- Visual stability and layout shifts

## Reports & Output

QA Kit generates comprehensive reports and evidence for every test run:

### **Bug Reports**
- **Location**: `artifacts/bug-sweep-report.json`
- **Contents**: Test results, failure classifications, page health scores
- **Format**: Structured JSON with timestamps and confidence scores

### **Evidence Bundles**
- **Location**: `artifacts/evidence/{evidenceId}/`
- **Contents**: Screenshots, DOM snapshots, performance data
- **Organization**: One bundle per test failure with unique evidence ID

### **Screenshots**
- **Location**: `artifacts/screenshots/`
- **Naming**: `{test-name}-{timestamp}-{viewport}.png`
- **Capture**: Automatic on failure, manual on demand

### **Page Health Reports**
Page quality scores (0-100) are included in all test reports, helping teams track application quality trends over time.

## Advanced Usage

### Custom Personas

Create application-specific test personas:

```bash
pnpm qa:persona:create --name="power-user" --email="power@test.com"
```

### Visual Regression Testing

```bash
# Start VRT dashboard
pnpm qa:vrt:up

# Run visual tests
pnpm qa:visual

# Update baseline images
pnpm qa:loki:update
```

### CI/CD Integration

```bash
# Optimized for CI environments
CI=true pnpm qa:sweep

# Generate JUnit reports
pnpm qa:test --reporter=junit
```

## Contributing

### Branch Naming Conventions
- `feature/` - New features and enhancements
- `fix/` - Bug fixes and patches  
- `chore/` - Maintenance tasks
- `docs/` - Documentation updates

### Adding New Project Configurations

1. Copy `config/template.config.ts` to `config/your-project.config.ts`
2. Update selectors and URLs for your application
3. Create corresponding adapter in `adapters/your-project.adapter.ts`
4. Add test journeys in `journeys/` directory
5. Update documentation with project-specific examples

### Testing Guidelines

- All new features require corresponding tests
- Maintain >90% code coverage for core modules
- Include both unit and integration tests
- Document any new configuration options

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for reliable web application testing. For questions and support, please visit our [GitHub Issues](https://github.com/marcelkojogyan/qa-kit/issues).