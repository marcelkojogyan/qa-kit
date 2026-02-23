# Storybook + Loki Visual Regression Testing

This guide explains how to use Loki for component-level visual regression testing with Storybook.

## Prerequisites

1. **Storybook** must be configured in your frontend project
2. **Docker** must be running (Loki uses Chrome in Docker for consistent screenshots)

## Quick Start

```bash
# From qa-kit directory

# 1. Start Storybook (in another terminal)
pnpm qa:storybook

# 2. Run visual regression tests
pnpm qa:loki:test

# 3. If changes are intentional, update baselines
pnpm qa:loki:update

# 4. Approve specific changes
pnpm qa:loki:approve
```

## How It Works

1. **Loki** connects to your running Storybook instance
2. It captures screenshots of each story at multiple viewports
3. Screenshots are compared against baseline images
4. Differences are highlighted in diff images

## Directory Structure

```
.loki/
├── reference/       # Baseline screenshots (committed to git)
│   ├── chrome.laptop/
│   ├── chrome.iphone14/
│   └── chrome.ipad/
├── current/         # Current test screenshots
├── diff/            # Difference images (red highlighting)
└── report.html      # Visual diff report
```

## Configuration

Edit `qa-kit/storybook/loki.config.js` to customize:

- **Viewports**: Desktop (1440x900), Mobile (390x844), Tablet (834x1112)
- **Skip patterns**: Stories to exclude from testing
- **Difference threshold**: How much pixel difference is acceptable

## Recommended Workflow

### Development

1. Make UI changes in your components
2. Run `pnpm qa:loki:test` to see visual differences
3. Review the diff report in `.loki/report.html`
4. If changes are intentional: `pnpm qa:loki:update`
5. Commit updated reference images

### Code Review

1. Run `pnpm qa:loki:test` on the PR branch
2. Review any visual differences
3. Approve if changes are expected

### CI/CD

Add to your CI pipeline:

```yaml
- name: Visual Regression Tests
  run: |
    cd qa-kit
    pnpm qa:storybook &
    sleep 30
    pnpm qa:loki:test
```

## Tips

### Reducing Flakiness

1. **Disable animations** in Storybook stories:
   ```tsx
   // .storybook/preview.tsx
   export const parameters = {
     disableAnimations: true,
   };
   ```

2. **Use consistent data** in stories (avoid dates, random IDs)

3. **Wait for fonts** - Loki waits by default, but ensure fonts are loaded

### Focusing Tests

Test specific stories:

```bash
# Test only Button stories
pnpm qa:loki:test -- --storiesFilter="**/Button/**"

# Test a single story
pnpm qa:loki:test -- --storiesFilter="**/Button/Primary"
```

### Debugging Failures

1. Open `.loki/report.html` in a browser
2. Click on failed tests to see:
   - Reference (expected)
   - Current (actual)
   - Diff (highlighted differences)

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect to Storybook" | Ensure Storybook is running on port 6006 |
| "Docker not found" | Install and start Docker Desktop |
| Font differences | Add font-rendering flags to Chrome config |
| Scrollbar differences | Loki hides scrollbars by default |

## Stories to Test

Focus on components that:
- Have specific visual designs
- Render user data
- Have multiple states (hover, active, disabled)
- Are reused across the application

### Example Story Structure

```tsx
// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = {
  args: { variant: 'primary', children: 'Click me' },
};

export const Secondary = {
  args: { variant: 'secondary', children: 'Click me' },
};

export const Disabled = {
  args: { variant: 'primary', disabled: true, children: 'Disabled' },
};

// Skip animation stories from visual testing
export const Loading = {
  args: { loading: true, children: 'Loading...' },
  parameters: { loki: { skip: true } },
};
```

## Integration with VRT Dashboard

For team-wide visual regression approval:

1. Screenshots from Loki can be uploaded to the VRT dashboard
2. Use the Playwright VRT integration for E2E visual tests
3. Reserve Loki for component-level (Storybook) testing

## References

- [Loki Documentation](https://loki.js.org/)
- [Storybook Visual Testing](https://storybook.js.org/docs/react/writing-tests/visual-testing)
- [Pixelmatch](https://github.com/mapbox/pixelmatch) - Diff algorithm used by Loki
