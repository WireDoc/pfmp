# PFMP Product Roadmap (2025–2026)

_Last updated: 2025-10-12_

## Current Baseline (Wave 4 rebuild context)
- **Backend**: Mature .NET 9 API with PostgreSQL, TSP models, task/alert/advice lifecycles, AI analysis endpoints, market data integration, developer bypass auth, seeded demo users.
- **Frontend**: React 19 shell under reconstruction. Routing, onboarding provider, dashboard quick glance metrics, live obligation polling (service abstraction), feature flags, and Vitest coverage for alerts/tasks orchestration.
- **Tooling**: MSW-driven testing harness, docs/testing guides, wave planning artifacts, dev bypass workflow.

The roadmap below transitions the stack from today’s demo experience into a production-ready personal financial management platform.

---

## Phase 1 – Onboarding MVP (Oct–Nov 2025)
**Goal:** Capture real user profiles and financial inputs through the UI so the backend’s existing capabilities can operate on live data.

### Key Deliverables
- Rebuild onboarding wizard with true data entry steps: demographics, risk tolerance, retirement goals, TSP allocations, banking links (manual entry + placeholder integration), portfolio API keys.
- Persist onboarding state via existing persistence service; surface validation errors and progress tracker.
- Dev User Switcher exposes seeded personas plus ability to create new test users via UI.
- Dashboard banner replaced with real welcome, showing completion state and “Next steps.”

### Dependencies
- Existing backend endpoints for profile, TSP, goals, income, risk already available.
- UI components to be rebuilt using MUI Grid v2; leverage previous Wave 2/3 designs stored in repo history.

### Success Criteria
- New user can complete onboarding without API calls via Postman.
- Database reflects entered values; refresh retains state.
- Dashboard shows personalized snapshot (name, goal, onboarding percent) even while using mock financial data.

---

## Phase 2 – Data Aggregation & Account Connectivity (Dec 2025–Jan 2026)
**Goal:** Populate the dashboard with actual account, portfolio, and cash data for each user.

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

## Phase 3 – Intelligence & Advice Engine Activation (Feb–Mar 2026)
**Goal:** Deliver actionable recommendations leveraging existing AI endpoints and new analytics.

### Key Deliverables
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
- AI endpoints already support recommendations; may require prompt refinement using live data.

### Success Criteria
- Users see at least three actionable insights spanning cash yield, rebalancing, and tax opportunities after onboarding.
- Accepting advice creates tasks, schedules automation (when enabled), and updates dashboard state without manual API calls.
- Retirement simulations surface probability ranges and next-step guidance; QA checklist covers Monte Carlo outputs, cash optimization, tax-loss harvesting, and TSP mix recommendations.

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
