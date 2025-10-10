# Dashboard Wave 4 Manual Smoke (Mock Data)

**Last updated:** 2025-10-08

These steps help you exercise the current Wave 4 dashboard experience with mock data before enabling the real-data adapter.

## Prerequisites
- Backend (`PFMP-API`) running locally at `http://localhost:5052`: `dotnet run --project PFMP-API/PFMP-API.csproj`
- Frontend running in dev mode at `http://localhost:3000`: `npm install` (first time) then `npm run dev` from `pfmp-frontend`
- Feature flags: `enableDashboardWave4 = true`, `dashboard_wave4_real_data = false`, `onboarding_persistence_enabled = true`
- Dev user seeded (use Dev User Switcher or `POST /api/DevUsers/seed-basic` if needed)

## Happy-path tour
1. Navigate to `http://localhost:3000/dashboard`
2. The onboarding gate should redirect you to `/onboarding` if the selected dev user is incomplete. Complete the steps using the UI buttons.
3. Once onboarding is complete, you should land on the Wave 4 dashboard:
   - Welcome banner shows completed step count
   - Overview card displays mock net worth totals
   - Alerts list shows actionable alert seeded by mocks
   - Tasks list contains at least one pending item
4. Open browser dev tools → Network. Confirm dashboard requests hit `/_msw` mocks (no real API calls).
5. Click an alert "Create Task" button:
   - A toast appears indicating task creation
   - Task is added to the list with optimistic status update
6. Move the progress slider for a task to 50%:
   - UI shows status `In Progress`
   - Console logs include `[telemetry][dashboard-wave4] task_progress_update_success`

## Negative testing
- In Dev Tools (MSW tab), force `dashboard/tasks` request to fail and retry the slider action. Expect rollback toast and telemetry failure log.
- Toggle `use_simulated_auth = false` in feature flags and reload; you should be redirected to login (mock) since auth is required.

## Regression quick-check
Run the focused Vitest suites when you finish manual testing:

```powershell
npm test -- src/tests/dashboardService.msw.integration.test.ts src/tests/dashboardAlertsToTasks.integration.test.tsx
```

## Next steps before real data
- Complete the "Auth scope self-check" in `docs/api/dashboard-contract.md`
- Follow the rollout runbook in `docs/runbooks/ENABLE-DASHBOARD-REAL-DATA.md`
- Update `enableDashboardWave4` and `dashboard_wave4_real_data` defaults once real data is ready
