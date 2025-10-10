# Storybook Setup Plan (Planned Post Wave 1)

Storybook will be introduced after routing (Wave 1) and before large UI reintegration (Wave 2/3) to provide isolated component development and visual baselines.

## Objectives
- Isolate leaf + orchestration components (layout, onboarding steps, dashboards stubs)
- Provide interaction playground for feature-flagged experimental modules
- Establish initial visual regression reference (paired with planned harness)

## Proposed Tooling
- `@storybook/react-vite` (fast startup aligning with existing Vite stack)
- MDX stories for richer documentation (especially onboarding step reasoning)
- Use `preview.js` to inject global MUI theme + CSS baseline

## Flag Integration
Leverage `featureFlags.ts` overrides in a Storybook decorator to toggle experimental flows (e.g., dashboards, dual AI mock panels).

## Initial Story Targets
| Component | Story Types |
|-----------|-------------|
| `AppLayout` | default, withNavCollapsed |
| `ProtectedRoute` | authenticated, unauthenticated redirect |
| `PageSpinner` | default |
| Onboarding Step (placeholder) | empty state, validation error |
| Intelligence Dashboard Placeholder | loading, data mock |

## Add Later (Deferred until after Wave 3)
- AuthHeader (token present vs bypass mode)
- UserProfileCard (complete vs partial profile)
- SmartAlertsSystem list states (empty, populated, loading)

## Not In Scope Yet
- Full mock service worker integration (consider MSW after core routes stable)
- Automated screenshot diffing (handled by separate visual regression harness plan)

## Installation Steps (Deferred)
```
npm install --save-dev @storybook/react-vite @storybook/addon-essentials @storybook/addon-interactions @storybook/testing-library
npx storybook init --type react-vite
```
(Will be executed in a future wave once routing is merged.)

## Risks
| Risk | Mitigation |
|------|------------|
| Early setup slows Wave 1 delivery | Defer actual install until routing merged |
| Divergent mock data shapes | Centralize mock factories under `src/test/mocks` |

## Success Criteria
- Stories load under 3s startup locally
- No story imports internal unstable APIs directly (use public exports)
- Flag toggling decorator works without rebuild

---
Tracking reference so AI assistants can locate Storybook plan: `docs/storybook-setup.md`.
