# Wave 5 – Dashboard MVP Hardening

**Goal:** Transition the Wave 4 dashboard from mock/demo state to a user-ready experience that surfaces real financial data, supports basic task workflows, and feels navigable as an application rather than a test harness.

## Milestone Overview

### Financial profile experience spec

- **Shell & tone**
   - Rename the flow to **“Your financial profile”** everywhere in the UI, using language and styling that evokes a modern banking portal.
   - Persistent left rail shows overall completion, highlights the active tile, and offers back-navigation without losing entered data.
   - Top banner messaging adapts dynamically: “Complete your financial profile to unlock insights” → “Continue your financial profile” → “Profile complete”.

- **Step sequence (each rendered as an interactive card)**
   1. **Welcome & household** – capture preferred name, marital status, dependents, military/federal service notes. CTA: “Start your profile”.
   2. **Risk & goals** – risk appetite sliders, retirement target (date + passive income goal), liquidity buffer preference.
   3. **Thrift Savings Plan** – contribution rate, current allocation per fund, employer match, target allocation. Include opt-out toggle **“I don’t invest in the Thrift Savings Plan”**; store boolean + reason.
   4. **Bank & cash accounts** – add multiple checking/savings/CD/MMA accounts with balances, APR, institution. Provide option **“I don’t have additional cash accounts”** and allow quick import via CSV placeholder. See the enrichment roadmap in [`WAVE-6-CASH-ACCOUNTS-ENRICHMENT.md`](./WAVE-6-CASH-ACCOUNTS-ENRICHMENT.md).
   5. **Brokerage & retirement** – non-TSP investments (401(k), IRA, taxable brokerage, crypto, precious metals). Include asset-class classification + cost basis. Opt-out per category.
   6. **Real estate** – primary residence and rentals to track equity, cash flow, leverage, and occupancy. Opt-out toggles for renters/non-owners; continue referencing [`WAVE-5-REAL-ESTATE-ENRICHMENT.md`](./WAVE-5-REAL-ESTATE-ENRICHMENT.md).
   7. **Liabilities & credit** – mortgages, HELOCs, student loans, credit cards, and other debt obligations with balances, minimum payments, interest rates, and payoff focus. Capture opt-out for debt-free households.
   8. **Monthly expenses** – core household spending categories (housing, transportation, childcare, healthcare, lifestyle) plus seasonal/irregular expenses with monthly normalization. Provide quick “Estimate for now” helper + opt-out acknowledgement.
   9. **Tax posture** – filing status, state of residence, marginal tax rate range, and withholding summary. Include capture for pending refunds/owed balances and opt-out for “Handled by CPA”.
   10. **Benefits & protections** – employer benefits (401k match, HSA/FSA, health plans), federal programs, and veteran benefits coverage. Toggle for “Review later” with note capture.
   11. **Income & cashflow** – salary/wages, VA and other disability income, pensions, business income, side hustles, annuities. Provide toggle **“List later”** while marking outstanding tasks.
   12. **Equity compensation & private holdings** – placeholder panel explaining upcoming support for RSUs, stock options, private business equity, and angel investments. Marked **“Not yet implemented”** with CTA disabled but tracked in status for future wiring.
   13. **Review & finalize** – summary of sections with badges (Completed / Opted Out / Needs Info) and CTA “Unlock my dashboard”. Allow editing any section before finalizing.

- **Interaction patterns**
   - Each step presents primary CTA (“Continue”, “Complete & continue”) plus secondary link (“Skip / I don’t have this”). Skips require lightweight justification dropdown to refine future recommendations.
   - Auto-save on blur/field change through existing persistence utilities; surface toast/state indicator (“Saved 2 sec ago”).
   - “Next step” panel on the right summarises upcoming section (e.g., “Next: Thrift Savings Plan”) with a short description and direct jump action.
   - Use progress bar + checklist in the header to reinforce momentum.

- **Data model considerations**
   - Extend onboarding DTO to include opt-out metadata `{ reason?: string; acknowledgedAt: Date }` for each section.
   - Persist detailed entries in their respective domain tables: `CashAccounts`, `InvestmentAccounts`, `Properties`, `InsurancePolicies`, `IncomeStreams`, **plus new** `LiabilityAccounts`, `ExpenseBudgets`, and `TaxProfiles`. Track benefit elections in `BenefitCoverages` (one-to-many) and stage equity placeholders for later enrichment via `EquityCompensationPlaceholders`.
   - Maintain a `FinancialProfileSnapshot` aggregate to quickly determine completion status and feed the dashboard hero card. Snapshot math must include liabilities (total debt), expenses (monthly outflow), and tax posture indicators.

- **Backend/API work**
   - Build section-specific endpoints (`POST /api/profile/cash`, `POST /api/profile/liabilities`, `POST /api/profile/expenses`, `POST /api/profile/tax`, etc.) that accept arrays of entries and opt-out flags.
   - Update onboarding persistence endpoints to reflect new schema and expose `profileCompletion` percentage + outstanding sections.
   - Provide mutation for explicit opt-out toggles and events that flag future revisit suggestions. Equity-comp placeholder endpoint can return 501/Not Implemented while still registering section status.

- **Completion gating & unlock**
   - Dashboard, advice, and alerts routes stay hidden until review step hits “Unlock my dashboard”.
   - Store a signed `ProfileCompletedAt` timestamp; show targeted message when the user intentionally opts out of major sections so the dashboard can tailor recommendations.

- **Accessibility & theming**
   - Fully keyboard navigable, use `aria-describedby` for contextual help, ensure high-contrast focus states.
   - Responsive layout mirrors tax software: progressive steps on desktop, accordion/wizard on mobile.

- **Testing goals**
   - Vitest: unit test new context state (`profileCompleted`, opt-out handling) and form validation per section.
   - Playwright: end-to-end flow covering completion path, opt-out path, partial resume, and unlock gating.


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
