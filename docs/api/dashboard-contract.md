# Dashboard Service Contract (Wave 4)

**Status:** Ready for sign-off – client adapter + MSW contract tests landed 2025-10-08; demo-user auth path active (see "Demo auth checklist" below)

## Purpose
Define the shared payload structure for the Wave 4 dashboard service so the frontend can switch from mocks to live data without further schema churn.

## Endpoint Overview

Wave 4 front-end currently calls (or plans to call) the following endpoints:

| Feature slice | Endpoint | Notes |
|---------------|----------|-------|
| Summary (net worth, accounts, insights) | `GET /api/dashboard/summary` | Aggregated response consumed by `DashboardService.load()` when the real-data flag is enabled. Client verified against MSW fixtures covering success, empty, and error paths. Backend composite endpoint contract needs payload parity confirmation. |
| Alerts panel | `GET /api/alerts?userId={id}&isActive=true` | Uses existing `AlertsController`; provides actionable + informational alerts. Severity and category map directly to UI badges. Contract validated via `mockDashboardAlerts` MSW fixtures. |
| Alerts → Tasks | `POST /api/alerts/{alertId}/dismiss`, `POST /api/Advice/generate/{userId}`, `POST /api/Advice/{adviceId}/accept`, `POST /api/Tasks` | Legacy convert endpoint deprecated; accepting advice or manual task creation will replace it. Vitest coverage (`dashboardAlertsToTasks.integration.test.tsx`) exercises optimistic flows and error handling. |
| Advice feed | `GET /api/Advice/user/{id}?status=Proposed&includeDismissed=false` | Returns proposed advice items that can be accepted (spawning tasks) or dismissed. MSW fixtures ensure required fields (`confidenceScore`, `sourceAlertId`) stay present. |
| Tasks list | `GET /api/Tasks?userId={id}&status=Pending` | Surfaces actionable tasks; extend query parameters as needed for completed/history views. Integration tests validate pending-task renders and telemetry. |

> ✅ Alerts/Advice/Tasks endpoints already exist in PFMP-API; Wave 4 dashboard will orchestrate them client-side until a consolidated dashboard gateway is introduced.

## Proposed Response Shapes & Headers

Unless otherwise noted, requests should include:

```
Authorization: Bearer {MSAL access token}
Accept: application/json
```

The frontend adapter currently attempts the call without an auth header; wiring the token retrieval will follow once API scopes are confirmed. When real data is enabled, PFMP-API must accept MSAL access tokens scoped for `Dashboard.Read.All` (pending backend confirmation).

### `GET /api/dashboard/summary`
```json
{
  "netWorth": {
    "totalAssets": { "amount": 250000, "currency": "USD" },
    "totalLiabilities": { "amount": 67500, "currency": "USD" },
    "netWorth": { "amount": 182500, "currency": "USD" },
    "change1dPct": 0.42,
    "change30dPct": 2.05,
    "lastUpdated": "2025-10-06T16:42:12Z"
  },
  "accounts": [
    {
      "id": "acct_broker_1",
      "name": "Brokerage - Core",
      "institution": "Fidelity",
      "type": "brokerage",
      "balance": { "amount": 123400, "currency": "USD" },
      "syncStatus": "ok",
      "lastSync": "2025-10-06T16:42:12Z"
    }
  ],
  "insights": [
    {
      "id": "insight_alloc_1",
      "category": "allocation",
      "title": "Equity allocation slightly high",
      "body": "Current equity exposure is 73% vs target 70%. Consider incremental rebalance.",
      "severity": "info",
      "generatedAt": "2025-10-06T16:42:12Z"
    }
  ]
}
```

### Alerts (`GET /api/alerts`)

Example payload returned directly from `AlertsController`:

```json
[
  {
    "alertId": 42,
    "userId": 1,
    "title": "High credit utilization",
    "message": "Visa Rewards utilization is 43% of limit.",
    "severity": "High",
    "category": "Portfolio",
    "isActionable": true,
    "portfolioImpactScore": 68,
    "createdAt": "2025-10-06T12:00:00Z",
    "isRead": false,
    "isDismissed": false,
    "expiresAt": null,
    "actionUrl": null
  }
]
```

The dashboard adapter should translate these records into lightweight cards, using `portfolioImpactScore` and `isActionable` to determine whether to show "Create task" affordances.

### Advice (`GET /api/Advice/user/{id}`)

```json
[
  {
    "adviceId": 101,
    "userId": 1,
    "theme": "General",
    "status": "Proposed",
    "consensusText": "Your equity allocation is slightly above target.",
    "confidenceScore": 60,
    "sourceAlertId": null,
    "linkedTaskId": null,
    "createdAt": "2025-10-06T12:15:00Z"
  }
]
```

Accepting advice triggers `POST /api/Advice/{adviceId}/accept`, which in turn creates a `UserTask` record (see below). Dismiss flow uses `/dismiss`.

### Tasks (`GET /api/Tasks`)

```json
[
  {
    "taskId": 555,
    "userId": 1,
    "type": "GoalAdjustment",
    "title": "Rebalance equity allocation",
    "description": "Shift 3% from equities into bonds.",
    "priority": "Medium",
    "status": "Pending",
    "createdDate": "2025-10-06T12:16:00Z",
    "dueDate": null,
    "sourceAdviceId": 101,
    "sourceAlertId": null,
    "progressPercentage": 0,
    "confidenceScore": 70
  }
]
```

### Alert → Advice → Task flow (client orchestration)

1. List active alerts via `/api/alerts` (filtered with `isActive=true`).
2. For alerts with `isActionable=true`, offer `Generate advice` (calls `POST /api/Advice/generate/{user}` with `alertId` metadata) or direct `Create task` using `/api/Tasks`.
3. When advice is accepted (`/api/Advice/{id}/accept`), a linked task is created automatically (`sourceAdviceId` + `sourceType="Advice"`).
4. Task completion/dismissal uses the `TasksController` PATCH routes (`/complete`, `/dismiss`, `/progress`).
5. Telemetry hooks emit `[telemetry][dashboard-wave4]` events for `task_create`, `task_progress_update`, and failure paths; ensure backend logs include correlation IDs for parity once API emits telemetry.

## Open Questions
1. Should the summary endpoint include portfolio performance sparkline data now or defer to Wave 6?
2. Can alerts/tasks reuse existing DTOs, or do we need dedicated projections to keep payloads light?
3. What auth scopes are required for dashboard endpoints in staging/prod?

### Verification Checklist (2025-10-08)

- ✅ `DashboardService.load()` validated against MSW contracts (`dashboardService.msw.integration.test.ts`).
- ✅ Alerts/advice/tasks integration covered in `dashboardAlertsToTasks.integration.test.tsx` and `dashboardWave4Direct.test.tsx`.
- ✅ Feature flag fallbacks verified (`dashboardServiceSelection.test.ts`).
- ✅ Error handling (summary 500, task persistence failure) surfaces toasts + telemetry.

### Demo auth checklist (no external scopes)

- ✅ Keep `Development:BypassAuthentication = true` (see `PFMP-API/appsettings.Development.json`) so demo users auto-auth in dev/test.
- ✅ Seed switchable demo users via `/api/DevUsers/*` endpoints and expose the Dev User Switcher in the UI.
- ✅ Ensure `DashboardService` continues to call the API without bearer tokens while bypass mode is on.
- ✅ When ready to revisit Entra ID, restore the token injection steps and remove the bypass flag (deferred to a later wave).

### Open Items

- [ ] Confirm composite `GET /api/dashboard/summary` payload matches contract using bypassed demo auth (owner: you)
- [x] Frontend: update `DashboardService` to choose between mock and live endpoints behind the feature flag (owner: Wave 4 squad)
- [x] Frontend: extend service to fetch alerts/advice/tasks feeds (Wave 4.2) *(verified via `DashboardWave4` alert → task integration tests)*
- [ ] Frontend: attach bearer token to real-data requests once JWT/Azure flow reinstated (deferred)
- [x] QA: add contract validation tests (MSW fixtures) covering success, empty, and error payloads for summary (2025-10-07)
- [x] QA: add MSW fixtures for alerts/advice/tasks endpoints once UI panels are wired (owner: QA/dev pairing)
- [ ] DX: document sample requests in `PFMP-API.http` for quick local smoke checks (owner: you)
- [ ] Ops: follow rollout runbook for enabling `dashboard_wave4_real_data` in higher environments (see runbook)

## MSW Fixtures & Tests
- Summary happy path: `mockDashboardSummary` (see `src/tests/mocks/handlers.ts`).
- Summary error path: handled via custom `http.get` 500 override in `dashboardService.test.ts`.
- Empty summary: tests ensure arrays default empty and UI shows "No accounts/insights" messages.
- Alerts/advice/tasks: covered via `mockDashboardAlerts`, `mockDashboardAdvice`, `mockDashboardTasks` fixtures and exercised in integration suites.

## Next Checkpoint
Review contract with backend lead, confirm summary endpoint payload, and align on alerts/task orchestration plan. Target date: **2025-10-08**.
