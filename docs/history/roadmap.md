# PFMP Product Roadmap (2025–2026)

_Last updated: 2025-10-12_

## Current Baseline (Wave 5 completion context)
- **Backend**: Mature .NET 9 API with PostgreSQL, TSP models, task/alert/advice lifecycles, AI analysis endpoints, market data integration, developer bypass auth, seeded demo users, comprehensive dashboard summary endpoint.
- **Frontend**: React 19 application with complete onboarding flow (15 sections), production dashboard with real data, routing with guard components, feature flags, MSW-driven testing harness (88/88 tests passing).
- **Completed Milestones**:
  - ✅ Wave 0-3: Routing, onboarding scaffold, data persistence
  - ✅ Wave 4: Intelligence dashboard structure and static routing
  - ✅ Wave 5: Dashboard MVP with real backend data, review status persistence, long-term obligations data loading
- **Current Status**: **v0.9.0-alpha** (October 26, 2025) - Dashboard with real data enabled, transitioning to navigation shell and polish phase

The roadmap below transitions the stack from today's functional MVP into a production-ready personal financial management platform.

---

## Phase 1 – Onboarding MVP (Oct–Nov 2025)
**Goal:** Capture real user profiles and financial inputs through the UI so the backend's existing capabilities can operate on live data.

**Status:** ✅ **SUBSTANTIALLY COMPLETE** (Wave 5 MVP - October 26, 2025)

### Completed Deliverables ✅
- ✅ Rebuilt onboarding wizard with 15 data entry sections: Welcome & Household, Risk & Goals, Income, Equity & Private Holdings, Liabilities, Investments, Cash Accounts, Real Estate & Mortgages, Expenses & Budget, Long-Term Obligations, Tax Withholding, Insurance & Benefits, TSP Positions, Review & Finalize
- ✅ All sections persist state via backend APIs with auto-save functionality
- ✅ Enhanced UX: Cash accounts with type dropdowns, simplified W-4-based tax section, state selection
- ✅ Validation errors and progress tracker fully functional
- ✅ Dev User Switcher with 4 seeded personas plus ability to reset test data
- ✅ Dashboard with real backend data showing personalized snapshot (name, net worth, accounts, insights, tasks)
- ✅ Review status persistence survives page refreshes
- ✅ All 88 tests passing with comprehensive coverage

### Remaining Items (Minor)
- Form validation schema refinement (field-level validation messages)
- Advanced profile editing workflow (edit completed sections from dashboard)

### Dependencies Met
- ✅ Backend endpoints for all profile sections operational
- ✅ UI components built using MUI Grid v2
- ✅ PascalCase API mapping for all sections

### Success Criteria Achieved ✅
- ✅ New user can complete onboarding entirely through UI
- ✅ Database reflects entered values; refresh retains state
- ✅ Dashboard shows personalized snapshot with real financial data
- ✅ Complete users can access dashboard; incomplete users redirected to onboarding

---

---

## Phase 1.5 – Navigation & Dashboard Polish (Nov–Dec 2025)
**Goal:** Transform dashboard from single-page view into navigable application with professional UX.

**Status:** 🚧 **PLANNED** (Wave 6)

### Key Deliverables
- Persistent left sidebar navigation with sections: Dashboard, Accounts, Insights, Tasks, Profile, Settings
- Mobile-responsive navigation (hamburger menu below 900px)
- Enhanced data display: sparkline charts, sync status badges, last-updated timestamps
- Data refresh flows: auto-polling, manual refresh, optimistic task updates
- Comprehensive error handling: retry logic, offline detection, stale data warnings
- Performance baseline: page load <1.5s, API response <500ms, Lighthouse score >90
- WCAG 2.1 AA accessibility compliance
- Visual regression testing infrastructure with Playwright

### Dependencies
- Phase 1 complete (onboarding + dashboard MVP) ✅
- Design system components documented
- Performance monitoring tooling configured

### Success Criteria
- Dashboard navigable via persistent sidebar on all devices
- All interactive elements keyboard-accessible
- Visual regression suite covering 20+ dashboard states
- Performance metrics within target thresholds
- 5+ test users validate navigation UX without confusion

See `docs/waves/WAVE-6-NAVIGATION-AND-POLISH.md` for detailed implementation plan.

---

## Phase 2 – Data Aggregation & Account Connectivity (Dec 2025–Jan 2026)
**Goal:** Populate the dashboard with actual account, portfolio, and cash data for each user.

**Status:** 📋 **PLANNED**

### Key Deliverables
- Bank/brokerage connection strategy: begin with manual CSV/API key ingestion, prepare abstraction layer for future Plaid/Yodlee integration.
- Implement secure storage for account credentials/secrets (Azure Key Vault or local secrets store for dev).
- Extend backend ingestion jobs to hydrate holdings, balances, transactions, and valuations across all asset classes (equities, cash, real estate, collectibles, insurance policies).
- Normalize manual-only asset entry flows (e.g., VA benefits, rentals, metals) so every overview pillar in the vision has a home in the data model.
- Ensure alert/task scaffolding records ingestion provenance to fuel later automation.
- Dashboard overview cards show live balances, asset allocation, and cash APR recommendations with drift warnings when yields lag.
- Daily data refresh job (background service) hitting market data + user portfolios.

### Dependencies
- Phase 1 complete (users captured TSP and goals).
- Market data service already in place; extend to support user holdings mapping.

### Success Criteria
- For seeded demo users, dashboard displays accurate net worth, account totals, and multi-asset holdings (cash, securities, real estate, insurance) sourced from database.
- Background refresh updates data at least daily; manual “Refresh now” button forces sync and recalculates valuations.
- Security review of stored credentials (even if limited to API keys in dev) documented with follow-up actions.

---

## Phase 3 – Intelligence & Advice Engine Activation (Feb–Mar 2026) 🎯 **CRITICAL FEATURE**
**Goal:** Deliver actionable recommendations leveraging the dual AI pipeline and new analytics.

**Status:** 📋 **PLANNED** - This is the core differentiator of PFMP

### Key Deliverables

#### Dual AI Pipeline (Primary Focus)
- **Stand up the dual-model AI pipeline (Azure OpenAI + Anthropic)** with consensus scoring and policy gates for financial recommendations.
- Implement prompt engineering for retirement planning, rebalancing, and tax optimization.
- Build consensus mechanism: both models must agree within confidence thresholds for recommendations.
- Create safety gates: no advice issued without minimum confidence score and rule validation.
- Log all AI interactions for audit trail and continuous improvement.

#### Financial Intelligence Features
- Wire frontend to advice/alert/task APIs for real data; enable accept/dismiss/complete flows with provenance surfaced to users.
- Stand up the dual-model AI pipeline (Azure OpenAI + Anthropic) with consensus scoring and policy gates for financial recommendations.
- Deliver retirement Monte Carlo projections and passive-income timeline visualizations backed by live data.
- Implement rule/AI blending: prioritize high-impact alerts, recommend reallocations (e.g., high-yield savings, CD ladder, stock watchlist) and map accepted items to scheduled automations.
- Launch tax-loss harvesting scans, surplus cash yield optimization, and rebalancing drift rules feeding the task system.
- Introduce goal tracking dashboard: progress toward retirement targets, emergency fund, TSP contributions.
- Add “What changed since yesterday” summary powered by stored historical snapshots.
- Expand telemetry to log advice acceptance, task completion, and portfolio changes (server + client).

### Dependencies
- Phase 2 data ingestion complete (need real holdings for meaningful advice).
- **Azure OpenAI and Anthropic API access configured.**
- AI endpoints already support recommendations; may require prompt refinement using live data.

### Success Criteria
- **Dual AI pipeline operational** with both models providing consensus-based recommendations.
- Users see at least three actionable insights spanning cash yield, rebalancing, and tax opportunities after onboarding.
- Accepting advice creates tasks, schedules automation (when enabled), and updates dashboard state without manual API calls.
- Retirement simulations surface probability ranges and next-step guidance; QA checklist covers Monte Carlo outputs, cash optimization, tax-loss harvesting, and TSP mix recommendations.
- **AI recommendation accuracy tracked and logged for continuous improvement.**

### Implementation Notes
See `docs/waves/ai-advisor-wave-plan.md` for detailed dual AI pipeline architecture and implementation strategy.

---

## Phase 4 – Daily Experience & Notifications (Apr–May 2026)
**Goal:** Provide recurring value via summaries, digests, and proactive nudges.

### Key Deliverables
- Daily summary module on dashboard (market movement, net worth delta, upcoming tasks, new alerts).
- Email or in-app notification system (start with queued notifications stored in DB; send via SMTP or in-app feed).
- Calendar/Timeline view of goal milestones and task deadlines.
- Performance trend charts (net worth, allocations, contributions) using stored historical data.
- Export/report feature (PDF or CSV) for advisor meetings.

### Dependencies
- Historical data capture from Phase 2/3.
- Notification infrastructure (e.g., Hangfire/Quartz jobs) configured in backend.

### Success Criteria
- Daily digest generated automatically for demo users (even if delivered in-app only).
- Trend charts reflect at least 30 days of data.
- Notification preference settings persisted per user.

---

## Phase 5 – Production Hardening & Auth Reinforcement (Jun–Aug 2026)
**Goal:** Transition from demo to secure, multi-user production readiness.

### Key Deliverables
- Re-enable Azure Entra ID (or alternative auth) with full token flow, MFA-ready.
- Role-based access (user vs admin) and audit logging.
- Secrets management (Key Vault), encryption at rest for sensitive fields.
- SLA/perf targets: load testing, error budget, monitoring dashboards.
- Compliance checklist: data retention, backup/restore rehearsals, privacy policy.

### Dependencies
- Prior phases delivering the core product experience.
- Infrastructure planning (Azure App Service, containerization, VPN to database, etc.).

### Success Criteria
- Auth bypass disabled in all environments; CI/CD deploys with secure config.
- Observability stack alerts on anomalies; RPO/RTO documented.
- Ready for limited beta with real users.

---

## Future Enhancements
- **Advisor/Family Mode:** Multi-tenant support, shared dashboards, and advisor collaboration tooling derived from the vision’s white-label aspirations.
- **Voice & Assistant Interfaces:** Alexa/Google assistant prototypes for portfolio snapshots and task acceptance.
- **Monetization Experiments:** Premium tiers for faster data refresh, advanced analytics, or advisory APIs.
- **Automation Escalation:** Self-service toggles for auto-executing rebalances or cash sweeps once compliance requirements are met.

These items stay intentionally unscoped until the core roadmap milestones are green, but they keep the broader PFMP vision in sight.

---

## Cross-Cutting Initiatives
- **UX/UI Design:** Invest in design system once Phase 1 forms are stable; consider Storybook revival in Phase 2.
- **QA Automation:** Expand Vitest MSW coverage alongside each phase; add Playwright smoke tests for onboarding and dashboard flows.
- **Data Science Sandbox:** Spin up notebooks to prototype advanced analytics (Monte Carlo retirement modeling, dual-model consensus scoring, risk tracking) feeding into future phases.
- **Documentation:** Keep `docs/testing`, wave plans, and runbooks updated per phase; maintain CHANGELOG.

---

## Immediate Next Steps (Q4 2025)
1. Finalize Phase 1 scope in `docs/waves/WAVE-5-DASHBOARD-MVP.md` (align tasks with above deliverables and incorporate live dashboard metrics).
2. Build onboarding forms tied to real endpoints; replace “continue” buttons with actual inputs and submissions.
3. Seed richer demo datasets (accounts, holdings, goals) so dashboard value appears once forms submit.
4. Draft SignalR rollout plan for Wave 4 follow-up leveraging existing polling abstraction.
5. Demo walkthrough: Create new user → complete onboarding → view personalized dashboard snapshot.

This roadmap evolves the curiosity build into a production-grade personal financial management platform over the next 12 months while delivering user value at each phase.
