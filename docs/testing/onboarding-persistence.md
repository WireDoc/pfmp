# Onboarding Persistence QA Checklist (Wave 4)

**Status:** Draft – initial scenarios enumerated 2025-10-06

## Purpose
Ensure the rebuilt onboarding flow persists progress accurately across dev-user switches and backs the Wave 4 dashboard gating logic.

## Test Matrix
| Scenario | Steps | Expected Result | Notes |
|----------|-------|-----------------|-------|
| Fresh user hydrate | Reset progress → load `/dashboard` | Provider hydrates empty snapshot, redirects to `/onboarding` | Exercise 404 → fresh handling |
| Complete onboarding | Progress through all steps → revisit dashboard | `completedStepIds` persists, dashboard unlocks | Verify PUT writes via API logs |
| Dev user switch | Switch via DevUserSwitcher → refresh | New user hydrates separate snapshot | Query string `?userId=` appended |
| Patch failure retry | Simulate network error (MSW) on PATCH | UI keeps optimistic state, logs retry prompt | Document manual retry steps |
| Reset endpoint | Click reset action → refresh | Snapshot cleared, user returned to first step | Confirm POST `/progress/reset` invoked |

## Automation Backlog
- [ ] Add MSW handlers to Vitest suite covering GET 200/404, PATCH success, PATCH 500.
- [ ] Expand `onboardingPersistence.test.tsx` to assert querystring user IDs and optimistic `markComplete` behaviour.
- [ ] Create smoke script using `node scripts/onboarding-smoke.ts` (placeholder) to hit API endpoints directly.

## Manual QA Steps
1. Run backend + frontend locally (`start-dev-servers.bat`).
2. Load `/dashboard` with `enableDashboardWave4=true`; confirm redirect to onboarding.
3. Complete each step, watching console for `putProgress` success messages.
4. Open `PFMP-API.http` and execute `GET /api/onboarding/progress` to validate payload stored.
5. Use DevUserSwitcher to change to another fixture user; ensure onboarding state resets appropriately.
6. Trigger reset from UI and confirm API response + UI state clearing.

## Telemetry & Logging
- Enable temporary `console.debug('[onboarding-hydrate]', dto)` logging while validating.
- Capture timestamps for hydrate/start/complete to feed into Wave 6 performance metrics later.

## Follow-ups
- [ ] Decide whether to persist `stepPayloads` now or defer until Wave 5 dual-AI integration.
- [ ] Evaluate retry/backoff strategy vs. current fire-and-forget `putProgress` call.
