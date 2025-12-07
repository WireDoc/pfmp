# Runbook: Enable Dashboard Real Data (Wave 4)

**Last updated:** 2025-10-08  
**Feature flags:**
- `dashboard_wave4_real_data`
- `enableDashboardWave4`

The Wave 4 dashboard ships with a feature flag that swaps the mock dashboard service for the real API adapter. Follow this runbook to validate readiness, enable the flag in higher environments, verify success, and roll back if needed.

---

## Preconditions

- Backend `GET /api/dashboard/summary` endpoint deployed and returning the schema in `docs/api/dashboard-contract.md`.
- Alerts, advice, and tasks endpoints reachable with MSAL-issued tokens (target scope `Dashboard.Read.All`, confirm with API team).
- Frontend build `>= 2025-10-08` containing Wave 4 regression coverage (`dashboardService.msw.integration.test.ts`, `dashboardAlertsToTasks.integration.test.tsx`).
- QA has seeded users with onboarding completed and representative dashboard data.
- Ops/QA has access to the environment-specific feature flag store (App Configuration, LaunchDarkly, or config repository).

### Helpful tooling
- `PFMP-API.http` for quick contract smoke tests.
- Dev Flags panel in lower environments for manual toggles.
- Application Insights / Grafana to monitor backend telemetry post-change.

---

## Step 1 – Preflight validation (lower environment)

1. Deploy latest PFMP-API build; confirm swagger includes `/api/dashboard/summary`.
2. From `pfmp-frontend`, run: `npm test -- src/tests/dashboardService.msw.integration.test.ts src/tests/dashboardAlertsToTasks.integration.test.tsx`.
3. Using `PFMP-API.http` or `curl`, request `GET /api/dashboard/summary` with a valid token; compare payload to contract doc.
4. Verify alerts/advice/tasks endpoints respond for the same user.
5. Document any deviations and resolve with API team before proceeding.

---

## Step 2 – Enable the flag

1. Confirm `enableDashboardWave4` is already `true`. If not, enable it first and smoke-test the mock dashboard.
2. Set `dashboard_wave4_real_data = true` via the environment flag store (or override file).
3. Redeploy / restart frontend pods or purge CDN cache if the configuration is read at start-up.
4. Announce the change window in `#pfmp-wave4` with ETA and owners.

---

## Step 3 – Post-change verification

- [ ] Load `/dashboard`; ensure summary totals match backend response (no mock banner).
- [ ] Confirm alerts/advice/tasks lists populate and actions succeed.
- [ ] Accept an actionable alert → generate advice → accept advice → verify task creation and telemetry log `task_create_success`.
- [ ] Update task progress; confirm persistence via API and UI refresh.
- [ ] Inspect browser console for `[telemetry][dashboard-wave4]` logs with real IDs.
- [ ] Monitor API logs and dashboards for error spikes during first 30 minutes.
- [ ] Re-test onboarding redirect by switching to an incomplete user (flag should not bypass gating).

---

## Rollback

1. Set `dashboard_wave4_real_data = false` to revert to mock data.
2. If instability continues, disable `enableDashboardWave4` to fall back to legacy dashboard shell.
3. Purge CDN / restart pods to ensure new flag state propagates.
4. Communicate rollback in `#pfmp-wave4`, open an incident ticket, and capture root-cause notes.

---

## Validation checklist

- [ ] Flag flipped to `true` in target environment.
- [ ] Summary, alerts, advice, and tasks requests succeed with expected payloads.
- [ ] Task creation and progress updates persist across reload.
- [ ] Telemetry observed in console and forwarded to monitoring pipeline.
- [ ] No new errors in Application Insights / Grafana within first hour.

---

## Communications

- **Primary owner:** Wave 4 squad on-call engineer
- **Stakeholders:** Product dashboard lead, QA rotation, API team
- Announce start/finish in `#pfmp-wave4`; update release tracker spreadsheet.

---

## References

- Contract doc: `docs/api/dashboard-contract.md`
- Wave tracker: `docs/waves/WAVE-4-DASHBOARD-PLAN.md`
- Tests: `src/tests/dashboardService.msw.integration.test.ts`, `src/tests/dashboardAlertsToTasks.integration.test.tsx`, `src/tests/dashboardWave4Direct.test.tsx`
- Telemetry source: `src/views/DashboardWave4.tsx`
