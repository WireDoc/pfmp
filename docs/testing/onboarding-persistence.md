# Onboarding Persistence QA Checklist (Wave 4)

**Status:** In progress – automated regression suite updated 2025-10-07; awaiting manual sign-off

## Purpose
Ensure the rebuilt onboarding flow persists progress accurately across dev-user switches and backs the Wave 4 dashboard gating logic.

## Test Matrix
| Scenario | Steps | Expected Result | Coverage Notes |
|----------|-------|-----------------|----------------|
| Fresh user hydrate | Reset progress → load `/dashboard` | Provider hydrates empty snapshot, redirects to `/onboarding` | ✅ Automated (`onboardingPersistence.test.tsx` – GET 404 path) |
| Complete onboarding | Progress through all steps → revisit dashboard | `completedStepIds` persists, dashboard unlocks | ✅ Automated (debounced PATCH + PUT assertions) + manual verification below |
| Dev user switch | Switch via DevUserSwitcher → refresh | New user hydrates separate snapshot | ✅ Automated (dev user swap test) |
| Patch failure retry | Simulate network error (MSW) on PATCH | UI keeps optimistic state, logs retry prompt | ⏳ Manual / MSW override via devtools; document outcome |
| Reset endpoint | Click reset action → refresh | Snapshot cleared, user returned to first step | ✅ Automated (reset test) + manual spot check |

## Automation Backlog
- [x] Add MSW handlers to Vitest suite covering GET 200/404, PATCH success, PATCH failure responses.
- [x] Expand `onboardingPersistence.test.tsx` to assert querystring user IDs, dev user switching, reset flows, and optimistic `markComplete` behaviour.
- [ ] Create smoke script using `node scripts/onboarding-smoke.ts` (placeholder) to hit API endpoints directly.

### Automated Regression

- Unit/integration: `npm run test -- src/tests/onboardingPersistence.test.tsx`
- Last run: 2025-10-07 (passing; see Vitest output in repo history).
- CI hook: add to Wave 4 dashboard pipeline once smoke script exists.

## Manual QA Steps
1. Run backend + frontend locally (`start-dev-servers.bat`).
2. Ensure flags `enableDashboardWave4` and `onboarding_persistence_enabled` are true (use `/flags` dev panel or `featureFlags.json`).
3. Load `/dashboard`; confirm redirect to onboarding occurs after hydrate spinner clears.
4. Complete each step (Demographics → Risk → TSP → Income). After each completion, verify `debouncedPatchStep` request succeeds (network tab) and the dashboard unlocks when finished.
5. Open `PFMP-API.http` and execute `GET /api/onboarding/progress` for the active dev user to confirm the snapshot matches UI state.
6. Use DevUserSwitcher to select a different dev user; confirm onboarding resets to the first step and the API GET shows that user’s independent snapshot.
7. Trigger reset from the onboarding UI, reload `/dashboard`, and confirm the API `POST /progress/reset` logs plus fresh hydrate.
8. Optional resilience check: inject a temporary MSW override (Dev Tools → “Fail next PATCH”) to observe optimistic UI and retry messaging, then clear override and confirm recovery.

## Telemetry & Logging
- Enable temporary `console.debug('[onboarding-hydrate]', dto)` logging while validating.
- Capture timestamps for hydrate/start/complete to feed into Wave 6 performance metrics later.

## Follow-ups
- [ ] Decide whether to persist `stepPayloads` now or defer until Wave 5 dual-AI integration.
- [ ] Evaluate retry/backoff strategy vs. current fire-and-forget `putProgress` call.
