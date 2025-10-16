# SignalR Rollout Plan for Dashboard Obligations

_Last updated: 2025-10-12_

## Context
- Wave 4 introduced a polling-based subscription (`subscribeToLongTermObligations`) refreshing every 45 seconds.
- Architecture already exposes a service-level observable and merges updates through `useDashboardData`.
- Goal: swap polling for SignalR without disrupting consumers, providing near-real-time updates across dashboard metrics.

## Objectives
1. Deliver live obligation updates via SignalR hub with graceful fallback to polling.
2. Extend hub payload to support future quick glance tiles (alerts, tasks) with unified message format.
3. Maintain test coverage and MSW mocks to simulate hub messages.

## Phases
### Phase A – Backend Preparation
- Implement `DashboardHub` in PFMP-API with endpoints:
  - `LongTermObligationsUpdated` broadcast with payload `{ userId, obligationsSummary, nextDueDate, totalEstimate, updatedAt }`.
  - Reserve channels for `AlertsUpdated`, `TasksUpdated` (future).
- Add `IDashboardSubscriptionService` abstraction; polling service wraps existing cron job until hub live.
- Authenticate connections using dev bypass token initially; plan for Entra ID when auth re-enabled.

### Phase B – Frontend Integration
- Add SignalR client library (official @microsoft/signalr) with connection manager singleton.
- Extend dashboard service to detect SignalR availability (feature flag `dashboard_wave4_signalr_enabled`).
- Implement subscription shim:
  - Prefer SignalR stream when connected.
  - Fallback to existing polling if connection fails or flag disabled.
  - Expose connection status for telemetry.
- Update `useDashboardData` to handle reconnect/backoff events and avoid duplicate emissions.

### Phase C – Testing & Telemetry
- MSW: add mock SignalR server or use lightweight websocket mock to emit obligation updates during tests.
- Vitest: cover connection fallback scenarios, reconnection after forced drop, and dedupe logic.
- Telemetry: log connection open/close, fallback events, and message latency; wire to placeholder `/api/telemetry` endpoint.

## Rollout Strategy
1. Toggle-driven rollout: enable flag in dev after smoke testing, then staging, then prod.
2. Maintain polling as safety net; consider configurable interval increase once SignalR stable.
3. Monitor connection health via console telemetry (later Application Insights).

## Migration Tasks
- [ ] Add SignalR packages and build configuration to PFMP-API.
- [ ] Create `DashboardHub` with obligation broadcast methods.
- [ ] Modify obligation background job to push hub messages post-refresh.
- [ ] Introduce frontend connection manager and integrate with dashboard service.
- [ ] Write automated tests (Vitest + integration) covering hub updates and fallback.
- [ ] Update documentation (`docs/history/changelog.md`, dashboard docs) once feature ships.

## Risks & Mitigations
- **Connection instability:** keep polling fallback, exponential backoff, and user-facing warning if connection disabled.
- **Auth integration:** plan for Entra tokens during Phase 5; keep dev bypass for now.
- **Test flakiness:** isolate SignalR mocking utilities; prefer deterministic message sequences.

## Definition of Done
- Dashboard reflects obligation updates within seconds via SignalR when flag enabled.
- Polling fallback verified by integration tests.
- Documentation and changelog updated; release plan ready.
