# Wave 2 Kickoff – Onboarding & Auth Simulation Control

Date: 2025-10-03
Status: In Progress
Version Baseline: v0.7.x (alpha)

## Objectives
- Replace placeholder onboarding route with functional progressive wizard scaffold.
- Centralize onboarding state (steps, progress %, completion) with future extensibility for validation, persistence, and conditional branching.
- Introduce feature flag `use_simulated_auth` to allow toggling between simulated and real auth flows without code churn.
- Defer Storybook introduction until a fully compatible Storybook + Vite 7 release set is published, avoiding destabilizing downgrades.

## Deliverables (Wave 2 Scope)
- OnboardingContext + hook (done)
- OnboardingPage UI: step list, progress bar, navigation (done)
- Feature flags extended with `use_simulated_auth` (done)
- Auth provider respects `use_simulated_auth` (done)
- Tests: onboarding state transitions, protected route, not found, flags panel (partial – complete for initial scope)
- Documentation: this kickoff doc + README update (in progress)

## Deferred / Out of Scope
- Persisting onboarding progress server-side
- Validation schemas for each step
- Real MSAL interaction in tests (still simulated)
- Storybook component catalog (deferred until Storybook 9 addons are fully published with Vite 7 peer compatibility)

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Storybook delay slows UI review cycles | Medium | Provide lightweight playground routes or dedicated gallery if review pressure increases |
| Simulated auth drift from real MSAL config | Medium | Keep `AuthProvider` path separation clean; add integration test once real auth enabled |
| Onboarding step expansion causing state refactor | Low | Context reducer already additive; IDs typed; future validation hooks reserved |

## Feature Flags Snapshot
- `routing_enabled`: true
- `onboarding_enabled`: (still false until we decide to expose externally; internal dev using direct route)
- `use_simulated_auth`: true (default for velocity)
- `storybook_docs_enabled`: false (tooling deferred)

## Next Milestones
1. Add persistence contract outline (Wave 3 candidate)
2. Add validation scaffolding & per-step components
3. Flip `onboarding_enabled` when UX ready for exposure
4. Revisit Storybook installation once 9.x addon matrix supports Vite 7 stable

## Acceptance Criteria (Wave 2 Done)
- Navigating to `/onboarding` shows step list and progress bar.
- Can mark steps complete and advance without errors; cannot pass final step.
- Feature flag panel displays new `use_simulated_auth` flag and toggling it affects future sessions (in-memory for now).
- Documentation updated (this file + README) reflecting active wave and deferral decisions.

---

Author: Automated assistant
