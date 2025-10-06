# Dashboard Service Contract (Wave 4)

**Status:** Draft – backend alignment pending; frontend adapter implemented behind `dashboard_wave4_real_data` flag (2025-10-06)

## Purpose
Define the shared payload structure for the Wave 4 dashboard service so the frontend can switch from mocks to live data without further schema churn.

## Endpoints Under Consideration
- `GET /api/dashboard/summary`
  - Returns consolidated net worth, account snapshots, and high-level insights used by `DashboardWave4`.
- `GET /api/dashboard/alerts`
  - Lists actionable alerts with metadata required for the alert → task flow.
- `POST /api/dashboard/alerts/{id}/convert`
  - Creates a task from an alert, returning the resulting task payload (optimistic UI relies on this shape).

> ✅ Existing backend routes (`AccountsController`, `AlertsController`, `TasksController`) may already cover pieces of this data. Part of this work is confirming whether to wrap them or expose a new composite endpoint.

## Proposed Response Shapes & Headers

Unless otherwise noted, requests should include:

```
Authorization: Bearer {MSAL access token}
Accept: application/json
```

The frontend adapter currently attempts the call without an auth header; wiring the token retrieval will follow once API scopes are confirmed.

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

### `GET /api/dashboard/alerts`
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "severity": "warn",
      "title": "High credit utilization",
      "body": "Visa Rewards utilization is 43% of limit.",
      "createdAt": "2025-10-06T12:00:00Z",
      "actions": [
        { "type": "convertToTask", "taskTemplateId": "task_reduce_utilization" }
      ]
    }
  ]
}
```

### `POST /api/dashboard/alerts/{id}/convert`
```json
{
  "task": {
    "id": "task_987",
    "title": "Lower credit utilization",
    "status": "open",
    "createdAt": "2025-10-06T12:01:00Z",
    "sourceAlertId": "alert_123"
  }
}
```

## Open Questions
1. Should the summary endpoint include portfolio performance sparkline data now or defer to Wave 6?
2. Can alerts/tasks reuse existing DTOs, or do we need dedicated projections to keep payloads light?
3. What auth scopes are required for dashboard endpoints in staging/prod?

## Action Items
- [ ] Backend: confirm endpoint availability, auth scopes, and payload alignment (owner: API team)
- [x] Frontend: update `DashboardService` to choose between mock and live endpoints behind the feature flag (owner: Wave 4 squad)
- [ ] Frontend: attach MSAL bearer token to real-data requests once scopes finalized (owner: Wave 4 squad)
- [ ] QA: add contract validation tests (MSW fixtures) covering success, empty, and error payloads (owner: QA/dev pairing)
- [ ] DX: document sample responses in `PFMP-API.http` for local debugging (owner: dev rel)
- [ ] Ops: follow rollout runbook for enabling `dashboard_wave4_real_data` in higher environments (runbook TBD)

## Next Checkpoint
Review with backend lead once initial payload drafts are validated against current EF models and stored procs. Target date: **2025-10-08**.
