# PFMP Frontend – Personal Financial Management Platform

Modern React 19 + TypeScript + Vite application delivering the user-facing orchestration for PFMP: onboarding experience, advisory interaction surfaces, future intelligence dashboards, and dual-AI pipeline integration.

## Documentation Links
- Root Project Overview: `../README.md`
- Wave Design Docs: `../docs/waves/`
- Persistence Design: `../docs/waves/WAVE-3-PERSISTENCE-DESIGN.md`
- Changelog: `../CHANGELOG.md`

## Authentication Modes (Simulated vs Real Azure AD)
During early waves we optimize iteration speed using a simulated auth path while keeping the codebase MSAL‑ready.

| Mode | How It Works | When To Use | Trigger |
|------|--------------|-------------|---------|
| Simulated (default) | Local dev flag returns a mock signed-in user without MSAL redirect / popup. | Fast UI iteration, onboarding flows, offline demos. | Feature flag `use_simulated_auth=true` (default) |
| Real MSAL | Uses `@azure/msal-browser` to perform real Azure Entra ID login and acquire tokens. | Pre‑production drill, validating protected API calls, integration tests with real tenant. | Set `use_simulated_auth=false` + provide env vars |

### Switching to Real Authentication
1. Provide the following Vite env vars (create / edit `.env.local` in `pfmp-frontend/`):
   ```dotenv
   VITE_AZURE_AD_CLIENT_ID=your-app-client-id
   VITE_AZURE_AD_TENANT_ID=your-tenant-id-or-common
   # Optional: override authority explicitly (normally derived)
   VITE_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
   ```
2. Disable simulated auth at runtime:
   ```ts
   import { updateFlags } from './src/flags/featureFlags';
   updateFlags({ use_simulated_auth: false });
   ```
   Or temporarily toggle via the Dev Flags Panel (if exposed in a dev-only route/component).
3. Restart the dev server if you changed env variables so Vite picks them up.
4. Perform a fresh load — MSAL will initialize and present the login UX.

### Reverting to Simulated Auth
Call `updateFlags({ use_simulated_auth: true })` or refresh after re‑enabling the flag. No additional cleanup required.

### Common Issues
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Blank screen after disabling simulation | Missing / incorrect env vars | Verify values in `.env.local`; restart `npm run dev` |
| Continuous redirect loop | Authority / tenant mismatch | Ensure tenant ID matches app registration; remove custom authority to derive automatically |
| 401 from API | Backend not yet accepting bearer tokens in this wave | Keep using simulated auth until backend JWT wiring is enabled |

---

## Status (Wave Model)

| Wave | Focus | Status |
|------|-------|--------|
| 0 | Baseline cleanup, routing plan, feature flag infra, test harness seed | ✅ Complete |
| 1 | Core routing, protected routes, layout, dev flag panel | ✅ Complete |
| 2 | Onboarding scaffold (context, steps UI, auth simulation control) | 🚧 In Progress |
| 3 | Data persistence & onboarding validation | Planned |
| 4 | Intelligence dashboards (exp_intelligence_dashboards) & static routing refactor | 🚧 In Progress |
| 5 | Dual AI pipeline (exp_dual_ai_pipeline) | Planned |
| 6 | Performance, accessibility, visual regression hardening | Planned |

### Current Wave (2) – Onboarding
Delivered so far:
- `OnboardingContext` reducer + hook (progress, completion tracking)
- Interactive `OnboardingPage` (steps list, progress bar, navigation controls)
- Feature flag `use_simulated_auth` gating simulated MSAL shortcut
- Expanded test coverage: routing, protected route, not-found, flags panel, onboarding state

Upcoming within Wave 2:
- Validation layer (schema placeholders)
- Potential per-step component extraction
- Persisted progress design notes (prep for Wave 3)

### Feature Flags Snapshot
| Flag | Default | Purpose |
|------|---------|---------|
| routing_enabled | true | Base router enable switch |
| onboarding_enabled | false | External exposure toggle (flip when polish complete) |
| onboarding_persistence_enabled | true | Enables onboarding hydration + persistence (Wave 3 milestone) |
| use_simulated_auth | true | Simulated auth for velocity |
| enableDashboardWave4 | false | Flags static Wave 4 dashboard route |
| storybook_docs_enabled | false | Reserved (deferred) |
| exp_intelligence_dashboards | false | Future dashboards |
| exp_dual_ai_pipeline | false | Future dual-AI engine |

### Storybook (Deferred)
Storybook installation is deferred: currently published addon sets for 9.x did not fully align with `vite@7` at time of Wave 2 kickoff. We will install once a coherent 9.x release set (framework + addons) is available without forcing peer overrides. Until then, component review occurs inline or via temporary sandbox routes.

## Tech Stack
- React 19 + TypeScript
- Vite 7
- MUI 7
- MSAL Browser (real auth path off by default – toggle when needed)
- Axios
- Vitest + Testing Library + jsdom
- Custom feature flag store (`useSyncExternalStore`)

## Quick Start
```bash
npm install
npm run dev
```
Generate OpenAPI types (backend running on :5052):
```bash
npm run generate:api
```
Run tests:
```bash
npm test
```

## Project Structure (Current)
```
src/
  api/              # HTTP client + generated OpenAPI types (after generate:api)
  components/       # Reusable UI + dev utilities (DevFlagsPanel, etc.)
  contexts/         # Auth + future domain contexts
  flags/            # Feature flag store & hooks
  layout/           # App shell, header bar
  onboarding/       # Wave 2 onboarding context & step defs
   routes/           # Static route definitions (lazy elements, feature-flag gating helpers)
  tests/            # Vitest specs
  views/            # Page-level components
```

### Routing architecture
- `routes/staticRoutes.tsx` contains the lazily-loaded route elements used by the production `AppRouter`. Each element exposes a `preload()` helper via `lazyWithPreload`, allowing Vitest to eagerly resolve modules when necessary.
- `AppRouter.tsx` consumes `staticChildRoutes`, applies feature-flag + onboarding gating, wraps protected entries with `ProtectedRoute`, and injects a redirect stub for `/dashboard` when `enableDashboardWave4` is disabled.
- The integration test `src/tests/appRouterWave4Gating.test.tsx` renders `AppRouter` inside the usual providers using `createMemoryRouter` with `initialEntries`. This validates the flag-on/flag-off behavior without custom harness hacks.
- For lighter weight assertions, `src/tests/dashboardFlagGating.test.tsx` keeps a dedicated MemoryRouter harness that exercises the same flag snapshot directly.

## Testing Philosophy
Lightweight unit + integration tests focusing on: routing assurances, guarded navigation, context reducers, and critical developer affordances (feature flags). The Wave 4 work adds an `AppRouter` integration spec in addition to the harness test to ensure lazy routes hydrate correctly. Visual & interaction regression will be layered in a later wave.

## Contributing (Frontend Scope)
1. Open small PRs aligned with an active wave.
2. Gate experimental UI with a feature flag.
3. Update or add tests for changed behavior.
4. Reference or author a wave doc for material architectural decisions.

## Roadmap Highlights (Frontend Slice)
- Complete Wave 2: validation integration & UX polish; flip `onboarding_enabled`.
- Wave 3: enable `onboarding_persistence_enabled` after backend endpoints land.
- Wave 4+: intelligence dashboards behind `exp_intelligence_dashboards`.
- Later: Storybook + visual regression harness.

---
Legacy build error remediation notes and React 18 references removed (superseded by current stack state). ESLint + type checks enforced via pre-commit hook.
