# Wave 4 – Dashboard Orchestration Rebuild

## Objective
Reintroduce the higher-order frontend orchestration layer (authenticated shell, onboarding gating, dashboard surface) in a structured, incremental manner without destabilizing existing backend domains.

## Progress Update (2025-10-06)
- `AppRouter` now runs inside `OnboardingProvider`; the dev user switcher is available in the layout so each backend test account hydrates its own progress on demand.
- Wave 4 dashboard renders a welcome banner with onboarding completion summary (step counts + percent) before the overview/accounts/insights panels.
- Onboarding persistence reacts to dev user switching/reset calls, ensuring `/dashboard` reflects the correct profile before mock data loads.
- Immediate priorities split into three tracks (see below) so we can land backend connectivity, verify onboarding persistence end-to-end, and stand up alert-driven task handoffs in parallel.

### Immediate Action Tracks (Owner Triage 2025-10-06)
1. **Onboarding persistence validation**
  - Exercise the full GET/PUT/PATCH/RESET flow through `OnboardingProvider` against `OnboardingProgressController`.
  - Add Vitest coverage (MSW) for hydrate success, 404 → fresh state, network retry, and dev-user switching querystring handling.
  - Document a manual QA checklist in `docs/testing/onboarding-persistence.md` (new) once verified.
2. **Dashboard data service integration**
  - Finalize `DashboardService` contract with the API team (document schema in `docs/api/dashboard-contract.md`).
  - Implement a real service adapter (flagged), retaining the current mock as a dev fallback.
  - Extend unit tests to assert loading/error/empty flows with both mock and real adapters.
3. **Alerts → Tasks interaction**
  - Design alert list UI states (empty, loading, error) and optimistic task-creation flow.
  - Wire to existing Alerts/Tasks endpoints behind `enableDashboardWave4`.
  - Capture telemetry stub (`console.debug('[telemetry]', ...)`) for conversion latency pending Wave 6 instrumentation.

## Scope Inclusions
- Routing shell (React Router v6) with protected layout
- Onboarding gating wrapper (redirect to onboarding if incomplete)
- Minimal Dashboard landing module (accounts summary + placeholder panels)
- Reinstated Context Providers:
  - Auth (existing dev bypass respected)
  - Onboarding (client cache + backend sync)
  - UserSelection / DevUserSwitcher integration
- Responsive layout grid (MUI Grid v2) + baseline theme tokens
- Error boundary + suspense skeletons

## Scope Exclusions (Deferred to Later Waves)
- Advanced analytics & intelligence panels
- Real-time websockets / streaming updates
- Alerts visual layer rehydration
- Portfolio performance charts (requires valuation batching improvements)
- Preferences UI editor

## Deliverables
1. `AppRouter.tsx` updated with:
  - `/onboarding` route
  - `/dashboard` protected route (default redirect target post-completion)
  - Static route registry (`routes/staticRoutes.tsx`) consumed inside the router
2. `OnboardingProvider` with shape:
```ts
interface OnboardingState {
  loading: boolean;
  snapshot: OnboardingProgress | null; // null means fresh (not fetched yet or 404 interpreted)
  refresh(): Promise<void>;
  patchStep(stepId: string, payload: any, completed?: boolean): Promise<void>;
  reset(): Promise<void>;
}
```
3. Hook `useOnboarding()` throwing if provider absent.
4. Client adapter in `onboardingService.ts` using existing backend endpoints with 404→fresh translation.
5. Basic dashboard page: shows user nickname (if set) + counts of completed steps + stub tiles.
6. Updated feature flag: `enableDashboardWave4` gating new routes until stable.
7. Integration + harness tests verifying flag gating and lazy route hydration.
8. E2E happy-path manual checklist documented.
9. Dashboard service contract doc + real adapter implementation plan recorded.
10. Onboarding persistence QA checklist capturing backend verification steps.

## Phased Implementation
| Phase | Goal | Exit Criteria |
|-------|------|--------------|
| 1 | Routing Skeleton | /onboarding & /dashboard navigable, placeholder content |
| 2 | Provider + Fetch | Initial GET + 404 handling, state exposes snapshot |
| 3 | Step Patch Wiring | Patch updates UI state locally then re-syncs |
| 4 | Gating Logic | Incomplete onboarding → force /onboarding; complete → /dashboard |
| 5 | Dashboard Stub | Nickname + step progress summary rendered |
| 6 | Flag & Docs | Feature flag toggles entire flow; docs + tests updated |

## API Usage Contracts
- GET /api/onboarding/progress (404 => treat as { currentStepId: 'welcome', completedStepIds: [] })
- PATCH /api/onboarding/progress/step/{stepId}
- POST /api/onboarding/progress/reset (dev/testing only)

## Client Caching Strategy
- Keep a single in-memory snapshot; optimistic patch merges `stepPayloads[stepId]` and toggles completion.
- On navigation or manual refresh, re-fetch; debounce multiple rapid requests.

## Error Handling
- 404 → fresh state (no toast)
- Network / 5xx → surface inline retry region, preserve last good snapshot
- Patch conflict (rare) → refetch and reapply local intent (simple last-write-wins for now)

## Testing Strategy (Incremental)
- Unit: Reducer/state transitions (if extracted)
- Integration: Mock fetch (MSW) for onboarding adapter + dashboard service adapters
- Manual: Postman + Browser checklist (documented) + onboarding persistence QA checklist

## Metrics / Telemetry (Deferred)
Add lightweight timing logs around fetch & patch once stable.

## Open Questions
- Do we need partial step dependency ordering enforced client-side? (Deferred)
- Should dashboard wait for portfolio valuation summary slice? (Out of scope this wave)

## Success Criteria
- Can create a test user, complete onboarding steps via UI, and automatically land on dashboard.
- Refresh retains state (matches backend snapshot).
- No uncaught provider errors in console.

## Task Tracker (Wave 4 Execution)
- [ ] Validate onboarding persistence end-to-end (see `docs/testing/onboarding-persistence.md`).
- [ ] Draft & sign off dashboard contract doc (`docs/api/dashboard-contract.md`) with backend.
- [ ] Implement real dashboard adapter behind `enableDashboardWave4` and add MSW fixtures.
- [ ] Design and wire alert → task optimistic flow with telemetry stub.
- [ ] Update README Wave tracker once dashboard feature flag defaults to on.

## Rollout Plan
1. Implement behind flag `enableDashboardWave4 = false` initially.
2. Merge incremental PRs per phase.
3. After Phase 5 validated, set flag true by default.
4. Remove flag after one stabilization iteration.

---
_This plan keeps vertical slices thin, enabling rapid feedback while avoiding a monolithic reintroduce._
