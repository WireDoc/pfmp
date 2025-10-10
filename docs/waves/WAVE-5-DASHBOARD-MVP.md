# Wave 5 – Dashboard MVP Hardening

**Goal:** Transition the Wave 4 dashboard from mock/demo state to a user-ready experience that surfaces real financial data, supports basic task workflows, and feels navigable as an application rather than a test harness.

## Milestone Overview

1. **Demo Session Readiness**
   - Keep dev/test in bypass mode (`Development:BypassAuthentication = true`) with switchable demo users.
   - Add a lightweight signed-in header (avatar + email or user label) so users know which profile they are viewing.
   - OPTIONAL (deferred): Reintroduce bearer/MSAL tokens and `[Authorize]` enforcement once demo flows stabilize.

2. **Real Data Enablement**
   - Follow `docs/runbooks/ENABLE-DASHBOARD-REAL-DATA.md` to flip `dashboard_wave4_real_data` on in dev.
   - Seed meaningful accounts/alerts/advice/tasks in the database for at least one test user.
   - Replace Wave 1 banner copy with a real welcome message and a last-updated timestamp sourced from API payloads.

3. **Dashboard UX Polish**
   - Swap placeholder copy (“Wave 1 routine skeleton active”) for production-ready content.
   - Introduce quick-glance tiles (Net worth delta, outstanding tasks count, latest alert) using existing API data.
   - Add empty/error states with call to action (e.g., “Connect an account” when no accounts returned).

4. **Actionable Tasks Flow**
   - Provide controls to accept/dismiss advice from the dashboard (mirrors API integration already tested via Vitest).
   - Allow status updates beyond the slider (e.g., mark task complete with confirmation).
   - Persist optimistic updates via `TasksController` and show toast feedback.

5. **Navigation & Layout**
   - Add a left navigation shell that links to: Dashboard, Onboarding history, Accounts, Settings.
   - Highlight current route and provide a sign-out entry.
   - Ensure mobile/tablet breakpoints keep the layout usable.

6. **Telemetry & Observability**
   - Promote existing `[telemetry][dashboard-wave4]` console logs into a real logging hook (e.g., send to backend `/api/telemetry` or Application Insights).
   - Capture key interactions: alert → advice conversions, task completion, onboarding resets.

7. **Docs & Checklists**
   - Update `README.md` and `docs/waves/WAVE-4-DASHBOARD-PLAN.md` with MVP status once milestones close.
   - Add manual QA flows for real data in `docs/testing/dashboard-wave4-manual-checks.md` (append real-data section).
   - Prepare a short release note to announce MVP availability.

## Exit Criteria

- User can sign in (or bypass in dev), complete onboarding, land on dashboard with real account data.
- Alerts/advice/tasks reflect backend state and can be acted upon via the UI.
- Dashboard no longer references “Wave” copy; messaging is user-friendly.
- Feature flags default to real data in development environment.
- Automated tests cover auth token injection, real-data happy path, and regression edge cases (empty/error states).
- Manual QA checklist for real data executed and passing.

## Suggested Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Auth + real data wiring | Token injection, `[Authorize]` endpoints, seed data, toggle flag on in dev |
| 2 | UX polish + tasks flow | Updated banner/tiles, actionable advice/task controls, responsive QA |
| 3 | Navigation + telemetry | Shell nav, sign-out, telemetry endpoint, doc updates, release note |

---
_Prepared 2025-10-08 to guide the transition from Wave 4 scaffolding to a tangible MVP._
