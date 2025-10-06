# Runbook: Enabling `dashboard_wave4_real_data`

**Last updated:** 2025-10-06

The Wave 4 dashboard ships with a feature flag that swaps the mock dashboard service for the real API adapter. This runbook describes how to validate backend readiness, enable the flag across environments, and verify the rollout end-to-end.

---

## 1. Prerequisites

- Backend `PFMP-API` deployment exposes `GET /api/dashboard/summary` and returns the contract documented in `docs/api/dashboard-contract.md`.
- MSAL tenant/application is configured for the `pfmp-frontend` SPA and issues access tokens for the dashboard scopes (final scope name TBD).
- Frontend build artifacts include the Wave 4 dashboard (any commit on or after 2025-10-06).
- QA has seeded at least one test user with onboarding progress completed (or knows how to simulate completion through the Dev Flags panel).

### Optional tooling
- `PFMP-API.http` in the repo can be used to smoke-test the dashboard endpoint once scopes are determined.
- The in-app Dev Flags panel (bottom-right corner in dev builds) allows runtime toggling for manual verification without code changes.

---

## 2. Backend verification checklist

1. **Endpoint health** – `curl https://<env-domain>/api/dashboard/summary -H "Authorization: Bearer <token>" -H "Accept: application/json"`
   - Expect `200 OK` with `netWorth` payload present.
2. **Auth scopes** – confirm the SPA client obtains a token that includes the dashboard scope (e.g., `api://pfmp-api/dashboard.read`). Update `appsettings.*.json` and Azure app registrations as needed.
3. **CORS** – ensure the frontend origin for the target environment is whitelisted so the browser fetch succeeds.
4. **Error handling** – simulate `5xx` or empty payload to confirm the frontend surfaces the fallback error alert (optional but recommended).

---

## 3. Frontend enablement paths

### 3.1 Local / QA sessions (temporary)
1. Launch the frontend with `npm run dev`.
2. Open the Dev Flags panel and toggle `dashboard_wave4_real_data` to `true` (the setting lasts for the current session).
3. Navigate to `/dashboard` – `DashboardService` should issue a real fetch; check browser dev tools for the network call.

### 3.2 Staging / Production (code-backed change)
1. Edit `src/flags/featureFlags.ts` and set the default flag:
   ```ts
   const defaultFlags: FeatureFlagsState = {
     // ...existing flags...
-    dashboard_wave4_real_data: false,
+    dashboard_wave4_real_data: true,
   };
   ```
2. Commit the change on a release branch and trigger the CI/CD pipeline.
3. Once deployed, smoke-test `/dashboard` with a production-like account.

> **Note:** A remote configuration service is planned but not yet available. Until then the default flag change is the source of truth for higher environments.

---

## 4. Post-enable verification

- [ ] Load `/dashboard` and confirm the welcome banner and overview panel render real account totals (non-zero, match backend response).
- [ ] Inspect network tab – `GET /api/dashboard/summary` returns `200` and finishes within acceptable latency.
- [ ] Toggle to a user with incomplete onboarding to ensure redirect behavior still works.
- [ ] Force an API failure (temporarily block the request or simulate 500) and confirm the error alert appears without crashing the page.
- [ ] Run `npm run test -- src/tests/dashboardServiceSelection.test.ts src/tests/dashboardService.test.ts` locally; both suites must pass before promoting.

---

## 5. Rollback procedure

1. Revert the flag in `featureFlags.ts` to `false` and redeploy.
2. Clear CDN caches (if applicable) so clients fetch the updated bundle.
3. Verify the dashboard falls back to mock data (overview totals revert to seeded values, no network call to `/api/dashboard/summary`).

---

## 6. Follow-up actions

- Wire MSAL token acquisition into `createApiDashboardService` once scopes are live so requests include `Authorization` automatically.
- Add MSW-powered Vitest coverage for the API adapter (happy path, empty payload, and error state).
- Update `docs/api/dashboard-contract.md` with any realized schema deviations encountered during rollout.
