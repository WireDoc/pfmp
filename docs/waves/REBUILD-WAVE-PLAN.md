# PFMP Rebuild Wave Plan

> Status: Wave 0 (Documentation Alignment) IN PROGRESS – This document defines scope, acceptance criteria, risks, metrics, and guardrails for each rebuild wave.

## Purpose
Reconstruct missing frontend orchestration layers (routing shell, onboarding, intelligence dashboards, alerts UI, auth presentation) in controlled, auditable increments while preserving a stable backend and existing leaf feature components. Enables dual-AI evolution without uncontrolled scope creep.

## Guiding Principles
1. Stability First – Backend untouched unless explicitly required by a wave.
2. Wave Isolation – No cross-wave feature leakage; defer extras to next wave.
3. Mock Before Spend – AI consensus & advanced calls mocked before enabling real usage.
4. Acceptance Discipline – A wave closes only when all criteria are satisfied & documented.
5. Observability – Introduce minimal telemetry hooks early (Wave 1+) for state & timing.
6. Idempotent Onboarding – Setup steps can be retried/replayed safely.
7. Feature Flags – Experimental or cost-bearing features behind flags.

## Shared Non-Functional Requirements (Apply to All Waves)
- No new TypeScript build errors (warnings allowed only if documented & intentional).
- Components must avoid prop drilling beyond 2 levels (use context/hooks instead).
- All new context providers: clear interface + default fallback state + minimal JSDoc.
- Error boundaries or defensive guards around async/AI operations.
- Lazy-load heavy dashboard/intelligence modules (>= 40kb estimated bundle size).

---
## Wave 0 – Documentation Alignment (CURRENT)
**Goal:** Establish canonical record of current vs missing state + plan.

| Item | Acceptance Criteria |
|------|---------------------|
| README Update | Contains rebuild banner, current vs missing features, wave table |
| pfmp-log Entry | Incident + rationale + high-level plan recorded |
| pfmp.txt Interlude | Rebuild interlude appended with wave outline |
| Wave Plan Doc | This file created with all waves scoped |
| Migration Note | `MIGRATION_STATUS.md` annotated referencing rebuild pivot |

Exit Signal: Single atomic commit containing all documentation updates.

---
## Wave 1 – Routing & Protection
**Goal:** Reinstate foundational navigation, protected gating, and layout skeleton.

Scope:
- Install/reactivate React Router (v6+)
- `ProtectedRoute` component (auth + optional setup gating hook)
- `AppLayout` (header placeholder, nav zone, content outlet, error boundary, suspense fallback)
- Navigation skeleton (flat or minimal hierarchical) with placeholder routes
- Suspense boundaries for lazy modules (Investment, Banking, Intelligence placeholders)
- Feature flag infra (simple config object + hook)

Acceptance Criteria:
- Direct navigation to protected path w/o auth → redirected to placeholder auth screen
- Unknown route → NotFound component (lightweight)
- No unhandled promise rejections when lazy routes fail
- Bundle diff: < +60kb initial (excluding lazy chunks)
- ManualChunks unaffected or adjusted with updated router chunk

Out of Scope:
- Onboarding logic, profile rendering, intelligence data fetching

---
## Wave 2 – User Setup Layer
**Goal:** Reintroduce onboarding & persistent setup progression.

Scope:
- `UserSetupContext` (tracks: steps array, completed map, percentage, next actionable)
- Step registry (demographics, risk, TSP allocation, income) – metadata-driven
- Wizard container: next/back/jump gating + validation guard
- Persistence: optimistic save to backend endpoints (mock if missing)
- Resume logic: direct visit returns user to first incomplete step

Acceptance Criteria:
- Refresh mid-step → state restored (from backend or local fallback cache)
- Completing final step toggles `profileSetupComplete` flag through API (or mock)
- Partial completion (e.g., only demographics) reproducible using test user ID
- Steps idempotent: repeated submission does not duplicate or corrupt server data
- Max step render baseline < 50ms (excluding network)

Out of Scope:
- Advanced analytics, AI-driven step hints

---
## Wave 3 – Auth & Profile UX
**Goal:** Provide user-facing identity affordances + dev diagnostics.

Scope:
- AuthHeader (user name / status / menu stub)
- SignInPrompt (dev bypass aware, environment badge)
- UserProfileCard (basic demographics + setup status pill)
- AuthDebugPanel (tokens state, bypass indicator, feature flags)
- DebugComponent (aggregated system state: auth, setup, flags, build info)

Acceptance Criteria:
- Dev bypass clearly indicated (visual badge)
- ProfileCard hides sensitive or unset fields gracefully
- Debug panels mount only in non-production builds (tree-shaken in prod build config)
- No token access attempt triggers unhandled exception in bypass mode

Out of Scope:
- Full MSAL UI flows (kept minimal until re-enabled later)

---
## Wave 4 – Intelligence Dashboards
**Goal:** Reintroduce domain dashboards and alert interaction UI.

Scope:
- MarketOverview (indices summary, volatility placeholder, lazy)
- MarketIntelligencePanel (AI summary placeholder + stub data)
- FinancialIntelligenceCenter (aggregated KPIs grid with skeleton loaders)
- SmartAlertsSystem UI: list, filter (active/read/dismissed), convert to task action
- Task creation from alert triggers optimistic UI update
- Basic retry & empty states
- Back-end dashboard data adapter (flagged) replacing mocks once contracts agreed
- Onboarding persistence verification (GET/PUT/PATCH/RESET) feeding dashboard gating

Acceptance Criteria:
- All new dashboard routes lazy-loaded (individual chunking confirmed via build analysis)
- Alert → Task conversion updates UI within < 500ms (optimistic) even if backend slower
- Dismissing and restoring (if planned) produce consistent state
- No alert list fetch results in clear “No alerts” UI, not silent blank
- Real dashboard adapter can be toggled on for dev/staging once smoke-tested against API contract doc
- Onboarding persistence suite validated (automated + manual checklist linked)

Out of Scope:
- Advanced charting or streaming updates

Execution Notes (2025-10-06):
- Draft `docs/api/dashboard-contract.md` capturing agreed schema for net worth, accounts, and insights payloads.
- Add `docs/testing/onboarding-persistence.md` outlining manual QA + MSW coverage expectations.
- Track alert→task optimistic flow telemetry via placeholder logger pending Wave 6 instrumentation.

---
## Wave 5 – Dual-AI Pipeline Scaffold
**Goal:** Abstraction for advisor + validator consensus (mock-driven initially).

Scope:
- `useDualAdvisor()` hook returning: `status`, `recommendations`, `consensus`, `dissent`, `refresh()`
- Model interface contracts (PrimaryAdvisorAdapter, ValidationAdvisorAdapter)
- Mock adapters producing deterministic sample outputs (seed-based)
- Consensus engine: merge, classify conflicts, confidence scoring heuristic
- Policy gate config (JSON or TS object) to suppress unsafe/low-confidence recs
- Telemetry hook to log cycle timings (mocked console / future pluggable)

Acceptance Criteria:
- Simulated latency injection (configurable) does not freeze UI (loading states effective)
- Dissent scenarios visually distinguished from consensus items
- Confidence < threshold items labeled or withheld per gate config
- Swappable adapter pattern documented (README or inline doc)

Out of Scope:
- Real API keys, cost tracking, advanced prompt engineering

---
## Wave 6 – Performance & Accessibility
**Goal:** Optimize & harden after functional parity restored.

Scope:
- Route-level code splitting validation (bundle analyzer snapshot)
- Add Suspense boundaries for remaining heavy subtrees
- Performance budget: initial < 180kb gzip main, largest lazy chunk < 220kb
- Basic a11y audit: landmarks, semantic headings, tab order, focus traps in wizard
- Introduce lightweight test harness (Jest/Vitest + 3–5 smoke tests)
- Error boundary coverage audit (all lazy + AI interaction zones)

Acceptance Criteria:
- Lighthouse Performance ≥ 75 (dev baseline) / Accessibility ≥ 90 (approximate)
- No React hydration mismatches after SSR-ready prep (if toggled later)
- At least one test per critical hook/context

Out of Scope:
- Full SSR migration, advanced RUM analytics (deferred)

---
## Cross-Wave Risk Register
| Risk | Description | Mitigation |
|------|-------------|------------|
| Drift vs. Plan | Features slip between waves | Enforce scope freeze + log deviations |
| Overcoupled Contexts | Hard to test/replace layers | Keep contexts single-responsibility & documented |
| Silent AI Failures | Mock hides future issues | Add failure simulation paths in mocks |
| Bundle Growth | Rebuild balloons main chunk | Track size each wave; adjust lazy boundaries |
| UI Regression | Lost behavior unnoticed | Add minimal visual/manual test checklist per wave |

---
## Metrics to Track (Starting Wave 1)
- Initial bundle size delta / wave
- Time-to-first-interaction of dashboard (manual measurement acceptable)
- Wizard completion success rate (mocked flows)
- Dual-AI consensus conflict rate (mock stage)
- Alert → Task conversion latency (optimistic vs. settled)

---
## Tooling & Implementation Notes
- Prefer functional components + hooks over HOCs
- Avoid expanding global context for ephemeral UI state (use component-local state)
- For future SSR viability: avoid direct `window` access outside guarded effects
- Telemetry placeholder: `console.debug('[telemetry]', eventObject)` central function for later replacement

---
## Exit Criteria (Full Rebuild Completion)
- All waves 0–6 marked complete in log
- No TODO-labeled placeholders in active user flows
- Dual-AI pipeline producing mock consensus render with documented adapter swap path
- Performance & a11y targets met or variances justified in notes

---
## Next Immediate Action
Complete Wave 0: finalize migration annotation + commit docs, then begin Wave 1 branch.

---
**Document Created:** 2025-09-27  
**Owner:** Rebuild Coordinator (automated assistant drafting for project maintainer)  
**Version:** 1.0 (initial
