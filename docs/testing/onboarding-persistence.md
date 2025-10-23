# Onboarding Persistence QA Checklist (Wave 4)

**Status:** Complete – automated regression suite updated 2025-10-08 with transient failure retry coverage; manual checklist available for spot checks

## Purpose
Ensure the rebuilt onboarding flow persists progress accurately across dev-user switches and backs the Wave 4 dashboard gating logic.

## Test Matrix
| Scenario | Steps | Expected Result | Coverage Notes |
|----------|-------|-----------------|----------------|
| Fresh user hydrate | Reset progress → load `/dashboard` | Provider hydrates empty snapshot, redirects to `/onboarding` | ✅ Automated (`onboardingPersistence.test.tsx` – GET 404 path) |
| Complete onboarding | Progress through all steps → revisit dashboard | `completedStepIds` persists, dashboard unlocks | ✅ Automated (debounced PATCH + PUT assertions) + manual verification below |
| Dev user switch | Switch via DevUserSwitcher → refresh | New user hydrates separate snapshot | ✅ Automated (dev user swap test) |
| Patch failure retry | Simulate network error (MSW) on PATCH | UI keeps optimistic state, logs retry prompt | ✅ Automated (`supports manual refresh after transient fetch failures`) + optional manual override |
| Reset endpoint | Click reset action → refresh | Snapshot cleared, user returned to first step | ✅ Automated (reset test) + manual spot check |

## Automation Backlog
- [x] Add MSW handlers to Vitest suite covering GET 200/404, PATCH success, PATCH failure responses.
- [x] Expand `onboardingPersistence.test.tsx` to assert querystring user IDs, dev user switching, reset flows, optimistic `markComplete` behaviour, and transient failure retries.
- [x] Add CLI smoke script `node scripts/onboarding-smoke.mjs` to hit API endpoints directly.

### Automated Regression

- Unit/integration: `npm run test -- src/tests/onboardingPersistence.test.tsx`
- Onboarding UI coverage: `npm run test -- onboardingLongTermObligations.integration.test.tsx` (long-term obligations section added 2025-10-11)
- Last run: 2025-10-08 (persistence suite) / 2025-10-11 (long-term obligations integration) – both passing locally.
- CI hook: add to Wave 4 dashboard pipeline once smoke script exists.

## Manual QA Steps
1. Run backend + frontend locally (`start-dev-servers.bat`). Optionally execute `node scripts/onboarding-smoke.mjs http://localhost:5052 1` from `pfmp-frontend/` to validate API readiness before UI checks.
2. Ensure flags `enableDashboardWave4` and `onboarding_persistence_enabled` are true (use `/flags` dev panel or `featureFlags.json`).
3. Load `/dashboard`; confirm redirect to onboarding occurs after hydrate spinner clears.
4. Complete each data section in sequence — Household → Risk & Goals → TSP → Cash → Investments → Real Estate → Liabilities → Expenses → Tax → Insurance → Benefits → Long-Term Obligations → Income → Equity placeholder. After each completion, verify the corresponding POST call succeeds (network tab) and the dashboard unlocks when finished.
5. Open `PFMP-API.http` and execute `GET /api/onboarding/progress` for the active dev user to confirm the snapshot matches UI state.
6. Use DevUserSwitcher to select a different dev user; confirm onboarding resets to the first step and the API GET shows that user’s independent snapshot.
7. Trigger reset from the onboarding UI, reload `/dashboard`, and confirm the API `POST /progress/reset` logs plus fresh hydrate.
8. Optional resilience check: inject a temporary MSW override (Dev Tools → “Fail next PATCH”) to observe optimistic UI and retry messaging, then clear override and confirm recovery.

## Telemetry & Logging
- Enable temporary `console.debug('[onboarding-hydrate]', dto)` logging while validating.
- Capture timestamps for hydrate/start/complete to feed into Wave 6 performance metrics later.

## Recent Fixes (2025-10-21/22)
- **Sidebar status real-time updates**: Fixed `useAutoSaveForm` hook to properly reset `mountedRef.current = true` on component remount, resolving issue where status callbacks were being aborted in React StrictMode development environment.
- **Risk & Goals liquidity buffer persistence**: Added missing `LiquidityBufferMonths` database column and service logic. Field now persists correctly and hydrates on re-navigation (see `onboardingRiskGoals.integration.test.tsx` for automated coverage).
- **PascalCase API mapping**: Fixed all 11 onboarding sections (Income, Equity, Liabilities, Investments, Cash, Properties, Expenses, Long-Term Obligations, Tax, Insurance, Benefits) to properly map camelCase frontend payloads to PascalCase backend DTOs. Added default values for required fields to prevent 400 Bad Request errors during autosave.
- **Dev user reset**: Updated `OnboardingProgressService.ResetAsync` to comprehensively clear all financial profile data (accounts, investments, properties, liabilities, expenses, income, insurance, TSP, obligations) and reset User profile fields to defaults while preserving authentication. Frontend now triggers page reload after reset for immediate visual feedback.
- **Cash accounts UX**: Changed account type from free text to dropdown with common types (Checking, Savings, Money Market, CD, High-Yield Savings, Other).
- **Tax section redesign**: Completely redesigned to focus on W-4 withholding information. Added US states dropdown for state of residence. Removed confusing fields (marginal rate, effective rate, expected refund/payment). Consolidated CPA toggles into single option. Added helper text for federal withholding percentage.
- **Equity section auto-complete**: Section now auto-persists on first visit when default "Yes, let me know when this launches" option is selected, marking section as completed immediately.

## Follow-ups
- [ ] Decide whether to persist `stepPayloads` now or defer until Wave 5 dual-AI integration.
- [ ] Evaluate retry/backoff strategy vs. current fire-and-forget `putProgress` call.
