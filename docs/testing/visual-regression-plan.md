# Visual Regression Testing – Implementation Guide

**Status**: ✅ Infrastructure Complete (October 27, 2025)  
**Tool**: Playwright with built-in screenshot comparison  
**Coverage**: Dashboard views, navigation states, responsive layouts

## Overview

Visual regression testing ensures that UI changes are intentional and don't introduce unintended visual bugs. We use Playwright's built-in screenshot comparison to detect pixel-level differences across different viewports and states.

## Setup Complete

### Installed Dependencies
- ✅ `@playwright/test` - E2E testing framework
- ✅ `@types/node` - Node.js type definitions
- ✅ Configuration: `playwright.config.ts`
- ✅ Test directory: `e2e/`
- ✅ Initial test suite: `e2e/dashboard.visual.spec.ts`

### Running Tests

```bash
# Run all visual tests
npm run test:e2e

# Run with interactive UI mode
npm run test:e2e:ui

# Update baselines after intentional UI changes
npm run test:e2e:update
```

## Test Coverage (Current)

### Dashboard Views
| View | Desktop | Tablet | Mobile | Status |
|------|---------|--------|--------|--------|
| Overview | ✅ | ✅ | ✅ | Implemented |
| Accounts | ✅ | ⏳ | ⏳ | Implemented (desktop only) |
| Insights | ✅ | ⏳ | ⏳ | Implemented (desktop only) |
| Tasks | ✅ | ⏳ | ⏳ | Implemented (desktop only) |

### Navigation States
- ✅ Sidebar expanded
- ✅ Sidebar collapsed
- ⏳ Mobile drawer (planned)

### Viewport Sizes
- Desktop: 1920x1080 (default)
- Tablet: 768x1024
- Mobile: 375x667

## Implementation Details

## Implementation Details

### Test Structure
```typescript
// e2e/dashboard.visual.spec.ts
test('dashboard overview - desktop', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="dashboard-overview"]');
  await page.waitForTimeout(2000); // Wait for animations
  
  await expect(page).toHaveScreenshot('dashboard-overview-desktop.png', {
    fullPage: true,
    maxDiffPixels: 100,
  });
});
```

### Screenshot Comparison Settings
- `maxDiffPixels: 100` - Allows minor anti-aliasing differences
- `maxDiffPixels: 50` - For component-level screenshots
- `fullPage: true` - Captures entire scrollable page

## Next Steps

### Phase 1: Establish Baselines
1. ✅ Install Playwright and configure
2. ✅ Create initial test suite
3. ⏳ Run tests and generate baselines
4. ⏳ Commit baselines to repository

### Phase 2: Expand Coverage
- [ ] Add Profile, Settings, Help views
- [ ] Add mobile viewport tests for all views
- [ ] Add tablet viewport tests for all views
- [ ] Test loading states
- [ ] Test empty states (requires backend mocks)
- [ ] Test error states (requires network mocking)

### Phase 3: CI Integration
- [ ] Add GitHub Actions workflow
- [ ] Configure baseline storage
- [ ] Set up diff artifact uploads
- [ ] Configure failure notifications

### Phase 4: Advanced Scenarios
- [ ] Test dark mode (when implemented)
- [ ] Test high contrast mode
- [ ] Test different zoom levels
- [ ] Add Percy or Chromatic for cloud storage

## Authentication Note

Current tests skip authentication-required states. To enable full testing:
1. Configure dev mode authentication bypass, OR
2. Add Playwright auth setup script, OR
3. Use MSW (Mock Service Worker) for API mocking

## Maintenance

### Updating Baselines
When intentional UI changes are made:
```bash
npm run test:e2e:update
```
Review generated screenshots before committing.

### Debugging Failures
After test failure, check `test-results/` for:
- `*-actual.png` - What was captured
- `*-expected.png` - Baseline
- `*-diff.png` - Highlighted differences

## Resources

- **Playwright Docs**: https://playwright.dev/docs/test-snapshots
- **Configuration**: `playwright.config.ts`
- **Test Suite**: `e2e/dashboard.visual.spec.ts`
- **CI Setup Guide**: https://playwright.dev/docs/ci

---

**Last Updated**: October 27, 2025  
**Status**: Infrastructure complete, ready for baseline generation  
**Wave 6 Phase 5**: Visual regression testing framework established

## Exit Criteria for Initial Adoption
- 3 baseline screenshots stable across two consecutive runs.
- Documented re-baseline process in README section (will add when tool installed).

---
Tracking reference for AI systems: `docs/visual-regression-plan.md`.
