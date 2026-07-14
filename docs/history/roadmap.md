# PFMP Product Roadmap (2025–2026)

_Last updated: 2026-06-23_

## Current Status Summary

| Milestone | Status | Completion Date |
|-----------|--------|-----------------|
| Wave 0-5: Onboarding MVP | ✅ Complete | October 2025 |
| Wave 6: Navigation Shell | ⏸️ Deferred | — |
| Wave 7: AI Advisory System | ✅ Complete | October 2025 |
| Wave 8: Account Detail Views | ✅ Complete | November 2025 |
| Wave 9: Market Data & Analytics | ✅ Complete | December 2025 |
| Wave 9.3.7: Cash Account Polish | ✅ Complete | April 2026 |
| Wave 10: Background Jobs | ✅ Complete | December 2025 |
| TSP Detail Page | ✅ Complete | December 2025 |
| Wave 11: Plaid Integration | ✅ Complete | December 2025 |
| Wave 12: Brokerage & Investment Linking | ✅ Complete | January 2026 |
| Wave 12.5: Unified Plaid Linking | ✅ Complete | March 2026 |
| Wave 13: Crypto Exchanges (Kraken + Binance.US) | ✅ Complete | Q2 2026 |
| Wave 13.5: Self-Custody Wallets | 📋 Provisional | TBD |
| Wave 14: Spending Analysis & Budgeting | ✅ Complete 2026-06-07 (all 5 phases shipped: P1, P2, P2.5, P3A/B, P4) | Q3 2026 |
| Wave 14.5: Tax Form Export (Form 8949) | 📋 Provisional | Post-Wave 14 |
| Wave 15: Property Management & Valuation | ✅ Complete | March 2026 |
| Wave 16: OpenRouter AI Overhaul | ✅ Complete | March 2026 |
| Wave 17: Dashboard Expansion | ✅ Complete | April 2026 |
| Wave 18: Federal Benefits Deep Dive | ✅ Complete | April 2026 |
| Wave 19: Advanced Retirement Planning | ✅ Complete | April 2026 |
| Wave 20: FEHB Auto-Fill & LES Enhancements | ✅ Complete | April 2026 |
| Wave 21: Estate Planning & Beneficiaries | ✅ Complete | April 2026 |
| Wave 22: AI Architecture Overhaul (Fusion spike + admin UI + model aliases + News/Chat slots) | ✅ Complete | June 2026 |
| Wave 23: News Aggregator (RSS digest → AI market context + dashboard widget) | ✅ Complete | June 2026 |
| Wave 24: AI Chatbot with Memory (streaming chat, daily context snapshot, deep-think toggle) | ✅ Complete | June 2026 |
| **Phase 5: Production Readiness Campaign** | 📋 Active campaign | Q3 2026 |
| Wave 25: Microsoft Entra ID auth + first real login + onboarding audit | 📋 Planned | Q3 2026 |
| Wave 26: RBAC + admin user management + dev-mode toggle | 📋 Planned | Q3 2026 |
| Wave 27: Plaid sandbox → production (prep + readiness + filing) | 📋 Planned | Q3 2026 |
| Wave 28: Production hardening + self-hosted deploy (Cloudflare Tunnel) | 📋 Planned | Q3-Q4 2026 |

**Current Version**: v0.24.0-alpha (Wave 14 closeout shipped: spending rollups, cash-flow forecast, recurring detection, anomaly alerts)

---

## Completed Waves

### Waves 0-5: Onboarding & Dashboard MVP ✅
**Completed**: October 2025

- 15-section onboarding wizard with autosave
- Production dashboard with real backend data
- Net worth aggregation, accounts summary, insights, tasks
- Dev user system with 4 seeded personas
- TSP summary with lifecycle funds (L2030–L2075)
- 88/88 tests passing

### Wave 6: Navigation Shell ⏸️
**Status**: Deferred (not blocking)

Originally planned for persistent sidebar navigation. Dashboard currently functional with direct routes. Will revisit when needed.

### Wave 7: AI Advisory System ✅
**Completed**: October 2025

- **Wave 7.3**: Dual AI pipeline (Gemini 2.5 Pro + Claude Opus 4)
- **Wave 7.4**: Enhanced AI context with account purpose fields and fact-checking
- Alert → Advice → Task workflow with provenance
- Context caching for cost optimization

### Wave 8: Account Detail Views ✅
**Completed**: November 2025

- **Wave 8.1**: Account detail modal with holdings breakdown
- Investment account views with price history charts
- Holdings management UI

### Wave 9: Market Data & Analytics ✅
**Completed**: December 2025

#### Wave 9.2: Market Data Integration
- FMP API integration for real-time stock quotes
- Historical price charts (1D, 1W, 1M, 3M, 1Y, 5Y)
- Price refresh infrastructure

#### Wave 9.3: Enhanced Views (~8,000+ lines)

| Option | Deliverable | Lines |
|--------|-------------|-------|
| **A** | Investment Analytics Tabs | ~5,100 |
| | • Performance: TWR, MWR, Sharpe, volatility | |
| | • Tax: Unrealized gains/losses, tax-lot analysis | |
| | • Risk: Beta, max drawdown, correlation matrix | |
| | • Allocation: Asset class, sector, geography, market cap | |
| **B** | Loan & Credit Card Views | ~3,500 |
| | • Debt payoff dashboard with Avalanche vs Snowball | |
| | • Auto loan & mortgage management | |
| | • Payoff timeline charts | |
| **C** | Cash Account UX Polish | ~400 |
| | • Transaction tracking | |
| | • Interest summary | |
| **D** | D3.js Visualizations | ~700 |
| | • Sunburst allocation chart (toggle) | |
| | • Correlation heatmap (toggle) | |
| | • Net Worth Timeline component (awaiting backend) | |

### Wave 10: Background Jobs & Automation ✅
**Completed**: December 2025

**Infrastructure**
- Hangfire integration with PostgreSQL storage
- Scheduler Admin UI at `/admin/scheduler` (Sonarr-inspired design)
- Hangfire dashboard at `/hangfire`

**Core Jobs**
| Job | Schedule | Description |
|-----|----------|-------------|
| TspPriceRefreshJob | Daily at 10 PM ET | Update TSP fund prices from tsp.gov |
| PriceRefreshJob | Daily at 11 PM ET | Update stock prices via FMP API |
| NetWorthSnapshotJob | Daily at 11:30 PM ET | Capture net worth for timeline |

**Features**
- Net Worth Timeline at `/dashboard/net-worth` with D3.js stacked area chart
- TSP Detail Page at `/dashboard/tsp` with positions editor
- Manual refresh buttons and "Run Now" functionality
- Schedule editing via admin UI
- Postman collection updated to v1.2.0

### Wave 11: Plaid Bank Account Linking ✅
**Completed**: December 13, 2025

**Scope:** Bank accounts only (checking, savings, money market, CD, HSA)

**Phases Completed:**
| Phase | Description |
|-------|-------------|
| Phase 1-2 | Backend: Models, migration, PlaidService, encryption |
| Phase 3 | Frontend: Plaid Link UI, Settings page, Dashboard CTA |
| Phase 4 | Testing: 39 Vitest tests, Postman v1.4.0 |
| Phase 5 | Transaction sync: Daily sync, categorization, description mapping |

**Key Features:**
- Plaid Link integration (12,000+ financial institutions)
- Automatic account balance + transaction sync (daily via Hangfire)
- Connection lifecycle: connect, reconnect (update mode), disconnect, delete
- Settings page (`/dashboard/settings/connections`) + Dashboard CTA
- Secure token management via Data Protection API
- Transaction categorization (FOOD_AND_DRINK, TRAVEL, TRANSPORTATION, etc.)

**See:** `docs/waves/wave-11-complete.md`

### Wave 12: Brokerage & Investment Linking ✅
**Completed**: January 2026

- Plaid Investments integration for 1,600+ brokerages
- Holdings sync with cost basis and investment transaction tracking
- Opening balance detection with dialog for adding historical cost basis
- Custom Plaid sandbox users for testing (5 scenarios)
- Price refresh integration with FMP API

### Wave 12.5: Unified Plaid Account Linking ✅
**Completed**: March 2026

- Unified "Connect a Bank" flow for all Plaid products (bank, investments, liabilities)
- Credit card sync: balance, limit, utilization, APR, payment due dates
- Mortgage sync with auto-property creation and equity tracking
- Student loan sync: balance, APR, due dates, minimum payments
- Credit utilization and overdue payment alert generation
- Synced field protection (read-only for Plaid-managed fields)
- ITEM_LOGIN_REQUIRED detection with SyncStatus.Expired
- 10 custom sandbox users, 23 manual tests, 289+ automated tests

**See:** `docs/waves/wave-12-complete.md`

---

## Planned Waves

### Wave 13: Crypto Exchange Integration ✅
**Completed**: April 2026

Delivered read-only crypto exchange integration with FIFO tax-lot fallback, staking analytics, AI context, and proactive alerts.

**What shipped:**
- **Adapters**: Kraken (P1) + Binance.US (P2) read-only API key flows with encrypted secret storage
- **Holdings & transactions**: per-exchange aggregation with `IsStaked` discrimination and 26+ transaction types
- **Tax lots (P3)**: `CryptoTaxLot` table + idempotent FIFO recompute (`CryptoTaxLotService`); realized P/L (ST/LT split + per-symbol); staking summary (weighted APY, YTD rewards)
- **AI context (P4)**: `BuildFullFinancialContextAsync` gains a `=== CRYPTO HOLDINGS ===` section with per-exchange totals, top positions, staked/liquid split, unrealized P/L, and YTD realized + reward income
- **Alerts (P4)**: connection-health (Expired / Revoked / Error), single-asset concentration (≥25% of tracked assets, stablecoins excluded), and stablecoin de-peg (≥2% deviation) with 24h dedup; runs after every per-connection sync
- **Frontend**: `/dashboard/settings/crypto` link flow, holdings card, `StakingSummaryCard`, `RealizedPnLPanel`
- **Postman**: collection v1.13.0 with full Crypto folder + AI analyze examples

**See:** `docs/waves/wave-13-crypto-exchanges.md`

### Wave 13.5: Self-Custody Wallets (provisional) 📋
**Target**: TBD

Optional follow-on for on-chain balances and DeFi protocols, deferred at Wave 13 scope-cut.

**Security:** Read-only API keys only (no trading/withdrawal permissions)

### Wave 14: Spending Analysis & Budgeting ✅ Complete
**Closed out**: 2026-06-07 (target was Q3 2026 — finished ahead of schedule)

Built on Wave 11 / Wave 12.5 transaction sync foundation. Five phases delivered:
- **P1** ✅ 2026-05-16 — backend foundation (rollup service, category rules, budget model extension, cash-flow summary, internal-transfer exclusion)
- **P2** ✅ 2026-05-29 — `/dashboard/spending` frontend (7 panels, basis toggle, cash-account allotment destinations, insurance paycheck-deducted flag)
- **P2.5** ✅ 2026-05-29 — income frequency model (Weekly / Biweekly / Semimonthly / Monthly per stream + per-allotment slice with derived monthly captions)
- **P3A** ✅ 2026-06-03 — heuristic recurring detection + anomaly detection (IQR-based) + spending alert family
- **P3B** ✅ 2026-06-07 — Plaid Recurring Transactions sync (`PlaidService.SyncRecurringStreamsAsync`, idempotent on `PlaidStreamId`, wired into `PlaidSyncJob`)
- **P4** ✅ 2026-06-07 — 90-day (configurable 30-180) cash-flow forecast with ±1σ × √t bands; AI prompt gains `=== SPENDING ACTUALS ===` capped section

- Spending trends and category breakdown (Plaid-authoritative taxonomy with PFMP annotations layered via `SpendingCategoryRule`)
- Budget model extension: period types (Monthly / Weekly / Biweekly / Annual), effective dates, rollover
- Recurring transaction detection: Plaid Recurring Transactions endpoint + heuristic fallback for non-Plaid accounts
- Anomaly alerts: per-category 6-month median + IQR, 24h dedup
- 90-day cash-flow forecast with P10 / P50 / P90 confidence bands
- AI context: new `=== SPENDING ACTUALS ===` section, capped at 6 months × top 10 categories with explicit cap statement to the model
- New top-level route `/dashboard/spending`

**See:** `docs/waves/wave-14-spending-analysis.md`

### Wave 14.5: Tax Form Export (Form 8949) 📋
**Target**: Post-Wave 14 (provisional)

Dedicated tax-export follow-on. Produces IRS Form 8949 (Sales and Other Dispositions of Capital Assets) and Schedule D inputs from Wave 13 P3 realized P/L plus any taxable cash-flow events catalogued in Wave 14. Held until both Wave 13 tax lots and Wave 14 spending categorization are production-stable.

### Wave 15: Property Management & Automated Valuation ✅
**Completed**: March 2026

Delivered full property CRUD from the dashboard plus automated valuation infrastructure.

**What shipped:**
- **Dashboard property CRUD** — Add, edit, delete, update value dialogs; Add button on PropertiesPanel
- **Automated property valuation** — Estated AVM provider with monthly Hangfire refresh job (1st of month, 3 AM ET)
- **Address validation** — USPS Web Tools integration with graceful pass-through fallback
- **Manual value refresh** — One-click from PropertyDetailView with 24hr rate limit
- **Plaid delete restriction removed** — Both manual and Plaid-synced properties can be deleted
- **7 new model fields** — AutoValuationEnabled, LastValuationAt, ValuationSource, ValuationConfidence, ValuationLow, ValuationHigh, AddressValidated

**Phases:**
| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Dashboard CRUD UI (add/edit/delete/update value) | ✅ Complete |
| 2 | Automatic valuation service + Hangfire job | ✅ Complete |
| 3 | Address validation (USPS) | ✅ Complete |
| 4 | Property advice integration (refinance/HELOC) | 📋 Future |

**See:** `docs/waves/wave-15-complete.md`

### Wave 16: OpenRouter AI Overhaul ✅
**Completed**: March 2026

Replaced three separate AI provider integrations (OpenAI, Claude, Gemini) with a single **OpenRouter** gateway. Rebuilt the entire AI financial context to send comprehensive data across all 14 sections.

**What shipped:**
- **OpenRouterService** — single `IAIFinancialAdvisor` implementation replacing all three providers
- **Unified config** — one API key, model names in appsettings (swappable without code changes)
- **Primary**: `google/gemini-3.1-pro-preview` | **Verifier**: `anthropic/claude-sonnet-4.6`
- **Comprehensive system prompt** — CFP role, dual-AI architecture explanation, structured 5-section response format
- **Full financial context** — all 14 data sections (cash, investments, holdings, TSP, properties, liabilities, income, expenses, tax, insurance, obligations, goals, user profile, active alerts/advice)
- **New `/api/ai/analyze/{userId}/full` endpoint** — comprehensive cross-domain analysis
- **Alert/advice deduplication** — 7-day category cooldown + active alerts injected into AI context with "do not repeat" instruction
- **Explicit "None" messages** — 8 empty sections explicitly tell AI "no data" rather than omitting
- **9 new backend tests** for OpenRouter integration
- **Legacy services archived** (not deleted) for reference

**See:** `docs/waves/wave-16-openrouter-ai-overhaul.md`

### Wave 17: Dashboard Expansion & Profile Management ✅
**Completed**: April 2026

Build out all 8 placeholder dashboard pages into functional views, with ProfileView as the top priority to enable editing onboarding data from the dashboard.

**Scope:**
| Part | Deliverable | Priority |
|------|-------------|----------|
| A | Profile Management — tabbed editor for all onboarding sections | 1 |
| B | Accounts Hub — unified grouped account list | 2 |
| C | Insights Full Page — AI analysis hub with history | 3 |
| D | Tasks Full Page — task board with status management | 4 |
| E | Settings Enhancement — notifications, display, security prefs | 5 |
| F | Help Page — FAQ, shortcuts, version info | 6 |
| G | Dashboard Overview — health score, cash flow, quick actions | 7 |
| H | New Features — health score widget, cash flow chart, command palette | Bonus |

**See:** `docs/waves/wave-17-dashboard-expansion.md`

---

## Major Features Roadmap

### Navigation Shell & Accounts Page ✅
**Status**: Delivered via Wave 17 (April 2026)

All 8 sidebar pages are now functional. Wave 17 closed the placeholder gap:

| Page | Status | Description |
|------|--------|-------------|
| Dashboard | ✅ Complete | Net worth, accounts, insights, tasks |
| Accounts | ✅ Complete | Unified grouped account list (Wave 17 Part B) |
| TSP | ✅ Complete | Detail page with fund editing (Wave 10) |
| Insights | ✅ Complete | AI recommendations hub with history (Wave 17 Part C) |
| Actions | ✅ Complete | Unified Alert / Advice / Task hub (Wave 17 Part D, formerly "Tasks") |
| Profile | ✅ Complete | Tabbed editor for all onboarding sections (Wave 17 Part A) |
| Settings | ✅ Complete | Notifications, display, security prefs (Wave 17 Part E) |
| Help | ✅ Complete | FAQ, shortcuts, version info (Wave 17 Part F) |

**See:** `docs/waves/wave-17-dashboard-expansion.md`

### TSP Detail Page & Editing ✅
**Delivered**: December 2025 (Wave 10)

Full TSP detail page at `/dashboard/tsp` with holdings table (G/F/C/S/I + L2030–L2075), edit dialog, allocation pie chart, historical price chart powered by `DailyTspService`, and price refresh button. Subsequent waves layered TSP Roth/traditional split, COLA modeling, and survivor benefit modeling (Wave 19). TSP.gov has no public API, so unit edits remain manual; no transaction history or interfund-transfer execution by design.

### AI Chatbot with Memory ✅
**Shipped**: Wave 24, June 2026 (`docs/waves/wave-24-ai-chatbot.md`)

Built the streaming-chat advisor on top of the Wave 22 Chat slot and Wave 23 news context. What landed:
- Reused Wave 7 `AIConversation` + `AIMessage` tables, extended with Title/ArchivedAt/LastMessageAt/InputTokens/OutputTokens/CachedTokens/ReasoningEffort
- New `UserContextSnapshots` table — daily per-user cacheable prompt prefix, hash-keyed, smart auto-refresh on source-data change (~20-table watermark) + 120 min max-age safety net
- `ChatService` — SSE-streaming orchestrator with auto-title, monthly cap ($20 default), Deep-think reasoning override
- `/dashboard/chat[/:id]` — sidebar with conversation list/cost chip/snapshot info, main pane with streaming bubbles + composer + Deep-think toggle
- News ingestion 4×/day in CT (7:30/11:30/15:30/19:30) with paired snapshot rebuild so afternoon chats see the latest digest
- Three-layer clock-skew defense (future-timestamp clamping, DB-vs-API drift warning, empty-stream surfacing)
- Chat → Advice conversion + auto-summarize for long threads explicitly deferred to follow-on waves

**Live cost**: ~$0.01-0.02 per typical turn (Gemini 3.1 Pro Preview + web grounding, cache warm), ~$1-2/month news synthesis.

### Market Context Awareness ✅
**Shipped**: Wave 23, June 2026 (`docs/waves/wave-23-news-aggregator.md`)

RSS-driven daily news digest per user. What landed:
- `NewsArticle` + `NewsDigest` tables; global article pool + per-user filtering by holdings + state + federal status
- `NewsIngestionService` — RSS fetch from MarketWatch, BBC-Business, Bloomberg, NPR-Business, FederalReserve, SEC, per-ticker Yahoo, per-state NWS Atom; Gemini Flash synthesis with strict JSON schema
- Per-category narratives (macro, federal, holdings, weather, regulatory, crypto, geopolitical) + 2-3 paragraph "morning briefing" narrative
- `NewsDigestWidget` (dashboard) + `NewsDigestDetailView` (drill-down at `/dashboard/news`)
- Wave 24 added: 4×/day cadence in CT + automatic chat snapshot rebuild after each ingestion

### Daily Experience & Notifications 📋
**Target**: Q2-Q3 2026 (Phase 4)

**Deliverables**
- Daily summary module (market movement, net worth delta, tasks, alerts)
- Email or in-app notification system
- Calendar/Timeline view of goal milestones
- Performance trend charts (30+ days historical)
- Export/report feature (PDF/CSV) for advisor meetings

**Dependencies**
- Wave 10 historical snapshots for trend data
- Notification infrastructure (Hangfire jobs)

## Phase 5: Production Readiness Campaign 📋

**Decision context** (locked 2026-06-23): the app is currently single-user (the project owner), with architecture provisional for multi-user later if family or others ever need access. Deploy target is **self-host on Ubuntu** (same network as the existing Synology Postgres NAS) with **Cloudflare Tunnel** for public reachability — keeps DB local, leaves Tailscale for admin/SSH access, and preserves a 1-day migration path to Azure if needs ever change. Code audit is opportunistic during the campaign rather than a dedicated wave.

The campaign is 4 waves running roughly in series:

### Wave 25: Microsoft Entra ID auth + first real login + onboarding audit (concurrent) 🟡

> Status 2026-07-13: Phases A–F complete. First real login verified 2026-07-09
> (user 21 provisioned via allowlist). Phase F onboarding audit closed
> 2026-07-13: owner walked all 16 sections with a fixture persona, ~20 findings
> fixed inline across three commits, and the final DB-vs-template persistence
> diff came back clean (15/16 sections exact, 16th an intentional opt-out).
> Remaining: optional one-shot data copy from user 20 + wave closeout.
> Details: `docs/waves/wave-25-entra-id-auth.md`.

**What ships**
- Activate MSAL on the frontend (toggle `use_simulated_auth` to false by default; keep available via env override for dev work)
- Backend: validate Entra-issued JWTs (`AddOpenIdConnect("AzureAD", ...)` is already wired in `Program.cs`; just needs real config values)
- `[Authorize]` audit across every controller — currently `app.UseAuthentication()` is on but controllers don't enforce
- First-login auto-provisions a new `User` row linked by `AzureObjectId` (User 20 stays as a dev-only seed — owner explicitly wanted to start fresh)
- After provisioning: redirect into the Onboarding wizard so all profile data gets entered cleanly
- **Onboarding audit runs concurrent with this wave** — as the project owner walks the 15-section flow for the first time post-login, every section's field→column mapping gets verified, validation refreshed, and orphans (UI field with no backend save) or gaps (model field with no UI) get fixed inline. Data migration of any wanted bits from User 20 → real account happens via MCP scripts as a one-shot manual step.

**Key files touched**
- `pfmp-frontend/src/contexts/auth/AuthProvider.tsx`, `src/config/authConfig.ts`
- `PFMP-API/Program.cs` (auth pipeline), `PFMP-API/Services/Auth/*`
- All `PFMP-API/Controllers/*.cs` — `[Authorize]` annotation pass
- `PFMP-API/Models/User.cs` — wire `AzureObjectId` lookup on token validation
- `pfmp-frontend/src/onboarding/sections/*` — fix what the audit surfaces

### Wave 26: RBAC + admin user management + dev-mode toggle 📋

**What ships**
- Add `IsAdmin` bool to `User` model (migration)
- First-login provisioning: if the token's `oid` matches a configured `AzureAD:AdminObjectIds` allowlist, user is created with `IsAdmin = true` — otherwise rejected (single-user mode for now, easily flipped to "pending approval" if multi-user comes)
- `[Authorize(Roles = "Admin")]` on admin endpoints
- New `/dashboard/admin/users` page — list users (real + dev), show onboarding status + chat-cost per user, promote/demote admin, activate/deactivate
- Admin-only sidebar toggle: **"Switch to dev users"** — when on, the app behaves as if dev mode active (you can pick dev user 1-20, see seeded data) without losing your real session. Persists across page loads; hidden from non-admins.
- Wire `useDevUserId()` to honor the toggle so the existing widget consumers keep working
- **Cleanup queue from Wave 25 Phase F findings:**
  - Unify VA disability on `IncomeStreams` as the canonical income store; the
    Profile tab's VA amount becomes a synced view (percentage + projections
    toggle stay as User metadata). Interim state: onboarding stream is primary,
    consumers dedup on `va-disability`, FERS projections fall back to the stream.
  - Retire the legacy `IncomeSources` table + `VADisabilityTracker` component
    (third VA store; only reachable from the pre-router dashboard).
  - Delete the legacy `Development:BypassAuthentication` code paths in
    `AuthenticationService` (flag already flipped off; endpoints unused).
  - Reconcile the two net-worth calculations: the profile snapshot's
    `NetWorthEstimate` (FinancialProfileService) excludes TSP while the
    dashboard summary includes it (~$161k apart for user 21). Pick one shared
    calculator.
  - Real-name capture: Entra provisioning falls back to "Carl User"
    (token has `given_name` but no surname claim) and onboarding never
    updates `Users.FirstName`/`LastName` — greeting works via PreferredName,
    but reports/exports would show the fallback. Add name fields to the
    household section or the profile page.

**Key files touched**
- New EF migration: `Wave26_UserAdminFlag`
- `PFMP-API/Controllers/Admin/UsersController.cs` (new)
- `pfmp-frontend/src/views/admin/UsersManagementView.tsx` (new)
- `pfmp-frontend/src/dev/devUserState.ts` — admin-toggle integration
- `pfmp-frontend/src/layout/DashboardNav.tsx` — toggle UI

### Wave 27: Plaid sandbox → production 📋

**Owner clarification (2026-06-23)**: Plaid prod application is NOT filed yet. App must meet Plaid's criteria before applying; this wave builds to that bar then files.

**What Plaid's process actually looks like** (current as of 2026, subject to verification when we start)

| Step | Description | Typical timing |
| ---- | ----------- | -------------- |
| 1. Self-attestation | In Plaid dashboard, fill out "Production Access Request" — use case, target user count, anticipated transaction volume, data retention practices | Immediate |
| 2. Compliance materials | Plaid requires: publicly accessible privacy policy that explicitly names Plaid as a data processor, terms of service, public app URL or screencast of working integration | Days to weeks (we control this) |
| 3. Plaid review | Plaid reviews against their Integration Standards — error handling, OAuth flow, webhook handling (if used), data minimization | 1-4 weeks typically; can be longer for unusual use cases |
| 4. Production credentials | On approval: new client_id + secret for production environment | Immediate after approval |
| 5. Pricing tier selection | Plaid offers "Limited Production" (free tier for small apps, limits on number of items) or full Production (paid). Personal-use single-user qualifies for Limited | Selected during application |

**What we have to build before filing**
- Publicly reachable app URL (depends on Wave 28 deploy — likely we file mid-Wave-28 once Cloudflare Tunnel is up)
- Privacy policy page explicitly covering Plaid data handling
- Terms of service page
- Audit existing Plaid error handling — Plaid reviews this; ITEM_LOGIN_REQUIRED, ITEM_LOCKED, NO_ACCOUNTS, INSTITUTION_DOWN, RATE_LIMIT_EXCEEDED all need graceful handling
- Confirm we're following Plaid Integration Standards (https://plaid.com/docs/link/integration-best-practices/)
- Verify the existing Data Protection API token encryption meets Plaid's security expectations
- Screencast of the full Plaid Link → token exchange → balance sync flow working in sandbox

**What changes when production lands**
- `appsettings` flip: `Plaid:Environment` → `"production"`, new client_id + secret
- Re-link the user's real bank accounts (sandbox tokens don't transfer)
- Plaid pricing kicks in for transaction sync — Limited tier free up to their item limit; monitor for cost surprises
- Production-only error scenarios appear (real banks have outages sandbox doesn't simulate) — keep eyes on logs first weeks
- Webhook endpoint becomes valuable if not implemented (currently we poll via `PlaidSyncJob`)

### Wave 28: Production hardening + self-hosted deploy (Cloudflare Tunnel) 📋

**Target**: Self-hosted on Ubuntu server (same network as the existing Postgres NAS), public reachability via Cloudflare Tunnel.

**Security**
- Replace hardcoded `JWT:SecretKey` default `"PFMP-Dev-Secret-Key-Change-In-Production-2025"` with env-loaded secret
- Move connection string, OpenRouter key, Plaid secret, FMP key, all sensitive config to env vars (or `.env.production` mounted into container, NOT committed)
- Audit appsettings.json files — anything sensitive moves out, the file becomes safe-to-commit
- HTTPS enforcement (Cloudflare Tunnel handles cert; backend trusts the proxy)
- Tighten CORS from dev-friendly localhost list to production domain only
- Add request rate limiting on public endpoints (chat especially, since per-message cost is real)
- `[Authorize]` audit reconfirmed — no public-by-default endpoints other than `/health`, `/health/ready`

**Observability**
- Structured logging (Serilog or built-in `ILogger` to JSON) with log rotation + retention policy
- Error tracking — Sentry self-hosted (compatible with Docker) or Seq (also Docker-friendly), so we're not paying SaaS for a personal app
- Health check polish — existing `/health` + `/health/ready` get exercised by Cloudflare/Docker

**Frontend dedup & polling cleanup (surfaced 2026-06-27 during Wave 25 Phase C)**

The dashboard makes a large number of duplicate API calls during normal use — flagged when inspecting Network tab on a fresh page load. Three layered causes, all pre-existing (not introduced by Phase C):

- `apiDashboardService.subscribeToLongTermObligations` (`pfmp-frontend/src/services/dashboard/apiDashboardService.ts`) starts a fresh `setInterval(poll, 45000)` for **every subscriber**. Each subscriber polls `/api/dashboard/summary?userId=N` every 45 seconds. With multiple components mounting `useDashboardData`, the summary endpoint can be hit 20+ times in under 2 minutes.
- Multiple components independently call the same fetch helper without any shared cache. `listExchangeConnections(userId)` was observed firing 13× in 96 seconds because Dashboard, `CryptoSummaryCard`, and `ConnectionsSettingsView` each request it on mount, and React Strict Mode double-fires effects in dev. `listCryptoHoldings(connectionId, userId)` showed the same pattern (8×).
- `useDataRefresh({ refreshOnFocus: true })` on the dashboard re-fetches every time you tab back to the window — fine in isolation, additive on top of the per-subscriber polling.

This is bandwidth + DB load that becomes embarrassing once the app is publicly reachable. Hardening options (decision deferred to Wave 28 kickoff):
- **B — Surgical fixes** (recommended, ~half day): turn `subscribeToLongTermObligations` into a singleton poller that multicasts to listeners; memoize/promise-cache the crypto/connections fetch by userId; cap `refreshOnFocus` to once per N minutes.
- **A — TanStack Query** (~1-2 days): adopt react-query as the global fetch layer. Single cache, automatic dedup, smart `staleTime`/`refetchInterval`/refetch-on-focus policies, stale-while-revalidate. Bigger lift, larger long-term win — every fetch helper migrates.

Also surfaced: `POST /api/crypto/connections/{id}/sync` is rate-limited to **once per hour per connection** by `CryptoController.ManualSyncCooldown = TimeSpan.FromHours(1)`. The auto-sync that runs on dashboard mount counts against the quota, so a manual click within an hour returns 429 with `Retry-After`. Not a bug — by design. Worth verifying the cooldown is the right value once we're hitting real exchange APIs in production (Kraken + Binance.US tier limits may demand looser or tighter).

**Deploy plumbing**
- `Dockerfile` for the API (multi-stage, .NET 9 publish → runtime image)
- `Dockerfile` for the frontend (Vite build → nginx)
- `docker-compose.yml` for local-equivalent prod stack (API + frontend + Cloudflare Tunnel daemon + optional reverse proxy)
- Cloudflare Tunnel config: hostnames pointing at the API + frontend services; cert managed by Cloudflare
- Postgres stays on the Synology NAS (no migration — the Ubuntu API container connects across the LAN exactly like the dev API does today)
- Backup verification: confirm `pg_dump` cron on the NAS is current; document restore procedure

**Cutover sequence (likely)**
1. Build images, smoke-test the stack locally on the Ubuntu server (network-isolated)
2. Open Cloudflare Tunnel to a test subdomain; verify HTTPS + cert
3. Smoke-test from outside (phone on LTE)
4. File Plaid production application using the public test URL (this is where Wave 27 meets Wave 28)
5. Switch DNS to the production subdomain when Plaid approves
6. Watch logs for a week, fix what breaks
7. Mark Phase 5 complete

### Cross-cutting: opportunistic code audit (no dedicated wave)

Owner pick (8: A): refactor on the way, not in a dedicated wave. Across Waves 25-28 expect the working tree to see:
- Dead-code removal where we find it
- Pattern normalization (error handling, async, EF queries) where files get touched anyway
- Comment cleanup — the older code has a lot of "what the code does" comments that don't add value
- Test additions where behavior changes — especially the new auth path

The legacy `archive/seeder/DevelopmentDataSeeder.cs` and similar archived files stay archived — they're not in the runtime, no need to refactor.

---

## Production Deployment Checklist (self-host + Cloudflare Tunnel)

Implementation details for Wave 28. Postgres stays on the Synology NAS; the API + frontend run as Docker containers on the Ubuntu server (same LAN), exposed publicly via Cloudflare Tunnel. Tailscale stays available for admin/SSH access.

### Database
| Component | Dev | Production |
|-----------|-----|------------|
| Host | Synology NAS (192.168.1.108:5433) | **Same** (no migration) |
| Backup | `pg_dump` cron on NAS | Same, verified + restore-tested |
| Connection | EF Core via local LAN | EF Core via local LAN (container → NAS) |

### Secrets
| Component | Dev | Production |
|-----------|-----|------------|
| JWT signing key | Hardcoded `appsettings.json` default | Env var (Docker secret or `.env.production`) |
| Connection string | `appsettings.json` | Env var |
| OpenRouter API key | `appsettings.Development.local.json` (gitignored) | Env var |
| Plaid client/secret | `appsettings.Development.local.json` (gitignored) | Env var |
| FMP / other 3rd-party | `appsettings.Development.local.json` (gitignored) | Env var |
| Plaid token encryption | Data Protection API (file system keys) | Same, but key persistence directory mounted as a Docker volume |

### Hosting
| Component | Dev | Production |
|-----------|-----|------------|
| Backend | `dotnet run` on localhost:5052 | Docker container, behind Cloudflare Tunnel |
| Frontend | Vite dev server on localhost:3000 | nginx Docker container serving Vite build, behind Cloudflare Tunnel |
| Hangfire dashboard | `localhost:5052/hangfire` | Same path, gated by `[Authorize(Roles="Admin")]` |
| TLS | None (HTTP) | Cloudflare-managed cert on the public hostname |
| Public reachability | localhost only | Cloudflare Tunnel → public HTTPS hostname |

### Plaid configuration
| Setting | Dev | Production |
|---------|-----|------------|
| Environment | `sandbox` | `production` (after Plaid approval) |
| Webhooks | Not implemented; we poll via `PlaidSyncJob` | Optional — adds real-time updates; can defer |
| Token storage | Data Protection API encrypted | Same |

### Deploy steps (Wave 28)
1. **Containerize**
   - Write `Dockerfile` for the API (multi-stage .NET 9 publish → runtime image)
   - Write `Dockerfile` for the frontend (Vite build → nginx serve)
   - Write `docker-compose.yml` orchestrating API + frontend + Cloudflare Tunnel daemon

2. **Move secrets**
   - Audit all `appsettings*.json` files; anything sensitive moves to env vars
   - Set up `.env.production` template (committed) + actual `.env.production` (gitignored, lives on the Ubuntu server)
   - Bump the hardcoded JWT secret default to an obviously-bad value so production startup fails loudly if env override is missing

3. **Test locally on Ubuntu**
   - Run the stack via `docker compose up` on the Ubuntu server
   - Verify the API connects to the NAS Postgres across the LAN
   - Hit the frontend from a different LAN device

4. **Wire Cloudflare Tunnel**
   - Install `cloudflared` on the Ubuntu server (or run it as a container)
   - Configure tunnel with hostnames pointing at the API + frontend services
   - Verify HTTPS works from outside the network (phone on LTE)

5. **Flip Entra ID config to production**
   - Update Azure App Registration's redirect URIs to include the public Cloudflare hostname
   - Set `VITE_AZURE_AD_*` env vars in the frontend build

6. **File Plaid production application**
   - See Wave 27 for the prep checklist
   - Submit with the now-public Cloudflare hostname as the app URL
   - Wait for approval (1-4 weeks)
   - On approval: rotate `Plaid:Environment` to `"production"` + new credentials; re-link the user's real bank accounts

7. **Observability**
   - Stand up structured logging (Serilog → JSON files, rotated)
   - Stand up Sentry self-hosted (Docker) or Seq (Docker) for error tracking
   - Verify health checks fire under Cloudflare's edge

8. **Watch first week**
   - Monitor logs for unexpected errors
   - Verify `PlaidSyncJob`, `PriceRefreshJob`, `NetWorthSnapshotJob`, `TspPriceRefreshJob`, `NewsIngestionJob` all fire on schedule under prod
   - Adjust as needed

---

## Phase Alignment

The wave system provides tactical implementation milestones. These align with higher-level product phases:

| Phase | Focus | Wave/Feature Coverage | Status |
|-------|-------|----------------------|--------|
| **Phase 1** | Onboarding MVP | Waves 0-5 | ✅ Complete |
| **Phase 1.5** | Navigation Polish | Wave 17 (8 placeholder pages built out) | ✅ Complete |
| **Phase 2** | Data Aggregation | Waves 8-9, 11, 12, 12.5, 13, 14, 15 | ✅ Complete (Wave 14 closed out 2026-06-07) |
| **Phase 3** | AI Advisory | Wave 7 + Wave 16 (OpenRouter) + Wave 18/19 federal benefits context + Wave 22-24 (architecture overhaul, news, chatbot) | ✅ Complete |
| **Phase 4** | Daily Experience | Wave 10 + Wave 14 forecast + Wave 23 news digest | ✅ Materially complete (notifications stack still optional) |
| **Phase 5** | Production Readiness | Wave 25-28 (Entra ID auth, admin RBAC, Plaid prod, self-hosted deploy) | 📋 Active campaign, Q3 2026 |

---

## Technology Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Backend | .NET 9 Web API | ✅ Active |
| Database | PostgreSQL | ✅ Active |
| Frontend | React 19 + TypeScript + Vite | ✅ Active |
| UI Framework | MUI v6 | ✅ Active |
| AI Gateway | OpenRouter (Wave 16) | ✅ Active |
| AI Primary | google/gemini-3.1-pro-preview | ✅ Active |
| AI Verifier | anthropic/claude-sonnet-4.6 | ✅ Active |
| Market Data | FMP API | ✅ Active |
| Crypto Pricing | CoinGecko (free public API) | ✅ Active |
| Property AVM | Estated | ✅ Active |
| Job Scheduler | Hangfire | ✅ Active (Wave 10) |
| Bank / Investment Linking | Plaid (banks, investments, liabilities) | ✅ Active (Wave 11–12.5) |
| Crypto Exchanges | Kraken, Binance.US | ✅ Active (Wave 13) |
| Auth | Microsoft Entra ID (MSAL frontend + JWT bearer backend) | ⏸️ Scaffolded; activation lands in Wave 25 |
| Public reachability | Cloudflare Tunnel (Wave 28) + Tailscale (admin / SSH / MCP) | 📋 Wave 28 |
| Deploy target | Docker on Ubuntu server (LAN co-located with Postgres NAS) | 📋 Wave 28 |

---

## Key Dates

| Date | Milestone |
|------|-----------|
| October 2025 | Wave 5 MVP Complete |
| October 2025 | Wave 7 AI Advisory Complete |
| November 2025 | Wave 8-9.2 Complete |
| December 7, 2025 | Wave 9.3 Complete (v0.9.5-alpha) |
| December 2025 | Wave 10 Background Jobs Complete |
| December 2025 | Wave 11 Plaid Bank Linking Complete |
| January 2026 | Wave 12 Brokerage & Investment Linking Complete |
| March 2026 | Wave 12.5 Unified Plaid Linking Complete |
| March 2026 | Wave 15 Property Management & Valuation Complete |
| March 2026 | Wave 16 OpenRouter AI Overhaul Complete |
| April 2026 | Wave 17 Dashboard Expansion Complete |
| April 2026 | Wave 18 Federal Benefits Deep Dive Complete |
| April 2026 | Wave 19 Advanced Retirement Planning Complete |
| April 2026 | Wave 20 FEHB / LES Enhancements Complete |
| April 2026 | Wave 21 Estate Planning & Beneficiaries Complete |
| April 2026 | Wave 13 Crypto Exchanges Complete (v0.23.0-alpha) |
| 2026-06-07 | Wave 14 Spending Analysis & Budgeting Complete |
| June 2026 | Wave 22 AI Architecture Overhaul Complete |
| 2026-06-21 | Wave 23 News Aggregator Complete (RSS digest + per-user personalization) |
| 2026-06-22 | Wave 24 AI Chatbot v1 Complete; closed out 2026-06-23 after the smart-snapshot + clock-skew hardening landed |
| Q3 2026 (target) | Phase 5 Production Readiness Campaign — Waves 25-28 |

---

## Future Considerations (Post-Phase-5)

These items remain intentionally unscoped until the Phase 5 production-readiness campaign is complete and the app is live for the project owner's daily use:

- **Wave 24 follow-ons** — Chat → Advice conversion, auto-summarize long threads, tool-calling for portfolio actions (the speculative items captured in `docs/waves/wave-24-ai-chatbot.md` closeout)
- **Wave 13.5 — Self-Custody Wallets**: on-chain balances + DeFi protocols (read-only API keys only)
- **Wave 14.5 — Tax Form Export (Form 8949)**: IRS forms from Wave 13 P3 realized P/L + Wave 14 cash-flow events
- **Wave 15 P4 — Property advice integration**: refinance/HELOC suggestions surfaced as Advice records
- **Mobile App**: iOS/Android — Cloudflare Tunnel architecture (Wave 28) already supports this, so the path is open whenever
- **Notifications stack**: in-app + email + (optional) push notification subscriptions, especially for chat replies / alerts / advice
- **Multi-user opening**: the Wave 26 architecture already supports pending-approval admin flow; flipping from single-user to "allowlist" or "open-with-approval" is a config flip
- **Voice Interfaces**: Alexa/Google Assistant portfolio queries (very far future)
- **Advisor Mode**: Multi-tenant, shared dashboards, white-label
- **Auto-Execution**: Self-service rebalancing and cash sweeps (compliance gated)
- **Monetization**: Premium tiers, faster refresh, advanced analytics (only relevant if multi-user opens up)

---

## Cross-Cutting Concerns

- **Testing**: 88+ tests passing, Vitest + MSW integration
- **Documentation**: Subject-organized `docs/` with documentation map
- **MCP Integration**: AI database access via PostgreSQL MCP server
- **Performance**: Target <1.5s page load, <500ms API response

---

_This roadmap is updated at the completion of each wave. See `docs/waves/` for detailed wave plans and completion summaries._
