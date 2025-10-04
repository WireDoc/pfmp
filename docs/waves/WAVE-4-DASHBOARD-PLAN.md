# Wave 4 – Dashboard Orchestration Rebuild

## Objective
Reintroduce the higher-order frontend orchestration layer (authenticated shell, onboarding gating, dashboard surface) in a structured, incremental manner without destabilizing existing backend domains.

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
7. E2E happy-path manual checklist documented.

## Phased Implementation
| Phase | Goal | Exit Criteria |
|-------|------|--------------|
| 1 | Routing Skeleton | /onboarding & /dashboard navigable, placeholder content |
| 2 | Provider + Fetch | Initial GET + 404 handling, state exposes snapshot |
| 3 | Step Patch Wiring | Patch updates UI state locally then re-syncs |
| 4 | Gating Logic | Incomplete onboarding → force /onboarding; complete → /dashboard |
| 5 | Dashboard Stub | Nickname + step progress summary rendered |
| 6 | Flag & Docs | Feature flag toggles entire flow; docs updated |

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
- Integration: Mock fetch (MSW) for onboarding adapter
- Manual: Postman + Browser checklist (documented)

## Metrics / Telemetry (Deferred)
Add lightweight timing logs around fetch & patch once stable.

## Open Questions
- Do we need partial step dependency ordering enforced client-side? (Deferred)
- Should dashboard wait for portfolio valuation summary slice? (Out of scope this wave)

## Success Criteria
- Can create a test user, complete onboarding steps via UI, and automatically land on dashboard.
- Refresh retains state (matches backend snapshot).
- No uncaught provider errors in console.

## Rollout Plan
1. Implement behind flag `enableDashboardWave4 = false` initially.
2. Merge incremental PRs per phase.
3. After Phase 5 validated, set flag true by default.
4. Remove flag after one stabilization iteration.

---
_This plan keeps vertical slices thin, enabling rapid feedback while avoiding a monolithic reintroduce._
