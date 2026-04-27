# PFMP Product Roadmap (2025–2026)

_Last updated: 2026-04-23_

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
| Wave 14: Spending Analysis | 📋 Planned | Q3 2026 |
| Wave 15: Property Management & Valuation | ✅ Complete | March 2026 |
| Wave 16: OpenRouter AI Overhaul | ✅ Complete | March 2026 |
| Wave 17: Dashboard Expansion | ✅ Complete | April 2026 |
| Wave 18: Federal Benefits Deep Dive | ✅ Complete | April 2026 |
| Wave 19: Advanced Retirement Planning | ✅ Complete | April 2026 |
| Wave 20: FEHB Auto-Fill & LES Enhancements | ✅ Complete | April 2026 |
| Wave 21: Estate Planning & Beneficiaries | ✅ Complete | April 2026 |

**Current Version**: v0.23.0-alpha (Wave 13 closeout shipped: AI crypto context + connection/concentration/de-peg alerts)

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

### Wave 14: Spending Analysis & Budgeting 📋
**Target**: Q3 2026

Building on Wave 11's transaction sync foundation:
- Spending trends and category breakdown visualizations
- Budget creation and tracking
- Recurring transaction detection
- Anomaly detection for unusual spending
- Cash flow forecasting

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

### Wave 17: Dashboard Expansion & Profile Management 🔄
**Status**: In Progress (April 2026)

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

### Navigation Shell & Accounts Page �
**Status**: Being addressed in Wave 17

The left sidebar currently has placeholder pages. Wave 17 builds out all 8 placeholder views:

| Page | Status | Description |
|------|--------|-------------|
| Dashboard | ✅ Functional | Net worth, accounts, insights, tasks |
| Accounts | 🔄 Wave 17 | Unified grouped account list |
| **TSP** | ✅ **Complete** | **Detail page with fund editing (Wave 10)** |
| Insights | 🔄 Wave 17 | AI recommendations hub with history |
| Tasks | 🔄 Wave 17 | Full task board with status management |
| Profile | 🔄 Wave 17 | Edit all onboarding sections (top priority) |
| Settings | 🔄 Wave 17 | Notifications, display, security prefs |
| Help | 🔄 Wave 17 | FAQ, shortcuts, version info |

**See:** `docs/waves/wave-17-dashboard-expansion.md`

### TSP Detail Page & Editing 📋
**Target**: Q1 2026 (With Wave 10 or 11)
**Priority**: Medium-High

Currently the dashboard shows TSP total only. Needs a full detail page similar to investment accounts.

**Backend (Already Exists):**
- `GET /api/financial-profile/{userId}/tsp/summary-lite` - Positions with prices
- `POST /api/financial-profile/{userId}/tsp` - Upsert positions
- `DailyTspService` - Fetches current and historical TSP fund prices

**Frontend Needed:**
| Component | Description |
|-----------|-------------|
| `TspDetailPage` | Full-page view at `/dashboard/tsp` |
| Holdings Table | All funds (G, F, C, S, I, L2030-L2075) with units, price, value, mix% |
| Edit Holdings Dialog | Update units/contribution% for each fund |
| Allocation Pie Chart | Visual breakdown by fund type |
| Historical Chart | Fund price history using DailyTspService |
| Contribution Summary | Current contribution rate, employer match |

**Features:**
- View all fund positions with current prices
- Edit units after onboarding (manual update until TSP API exists)
- Edit contribution allocation percentages
- Price refresh button (calls DailyTspService)
- Historical performance visualization
- Link to tsp.gov for official actions

**Not In Scope:**
- TSP.gov doesn't have a public API, so no automatic sync
- No transaction history (contributions, withdrawals)
- No interfund transfer execution (manual only)

**API Endpoints (May Need):**
```
GET  /api/financial-profile/{userId}/tsp/positions      # Detailed positions
PUT  /api/financial-profile/{userId}/tsp/positions/{id} # Update single position
POST /api/financial-profile/{userId}/tsp/refresh        # Refresh prices
GET  /api/market/tsp/history?fund=L2050&days=30        # Fund price history
```

### AI Chatbot with Memory 📋
**Priority**: High (Core differentiator)
**Target**: Q2 2026
**Prerequisite**: Wave 16 (AI Enhancement & Vetting) must be complete

The dual AI pipeline (Wave 7) laid groundwork. Wave 16 expands context coverage. Chatbot extends this:

**Database Schema**
- `AIConversation` - Conversation sessions with user context
- `AIMessage` - Individual messages with role, content, timestamps
- `AIActionMemory` - Record user decisions to prevent contradictions
- `AIUserMemory` - Learn user preferences over time

**Backend**
- `AIChatService` - Multi-turn conversations with full financial profile injection
- Context injection: profile + memory + recent actions in every chat
- Rate limiting: 20 messages/day free tier

**Frontend**
- MUI ChatBox component with real-time streaming
- Conversation export (PDF/email)
- "Convert to Advice" button - promote chat recommendations to Advice records

**Memory Features**
- Track conversation context across sessions
- "Why did you recommend this?" explanation system
- Memory pruning: action memory expires 90 days, preferences persist

### Market Context Awareness 📋
**Target**: Q2 2026

**Components**
- `MarketContext` table - Store news, sentiment, economic indicators
- News aggregation service - RSS/API feeds from financial sources
- Daily market digest - AI-powered summarization
- Context injection into AI prompts for time-sensitive advice
- "What's happening in markets?" dashboard widget

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

### Production Hardening 📋
**Target**: H2 2026 (Phase 5)

**Security & Auth**
- Re-enable Azure Entra ID with full token flow, MFA-ready
- Role-based access (user vs admin)
- Audit logging for all financial actions

**Infrastructure**
- Secrets management (Azure Key Vault)
- Encryption at rest for sensitive fields
- SLA/perf targets with load testing
- Error budget and monitoring dashboards

**Compliance**
- Data retention policies
- Backup/restore rehearsals
- Privacy policy documentation

---

## Azure Production Migration Checklist

When migrating from development (Synology NAS + laptop) to production:

### Database Migration
| Component | Development | Production |
|-----------|-------------|------------|
| PostgreSQL | Synology NAS (192.168.1.108:5433) | Azure PostgreSQL Flexible Server |
| Backup | Manual/Synology | Azure automated backups |
| Encryption | Column-level where needed | TDE + column-level |

### Secrets Management
| Component | Development | Production |
|-----------|-------------|------------|
| Plaid Tokens | Data Protection API | Azure Key Vault |
| API Keys | appsettings.local.json | Azure Key Vault |
| Connection Strings | Environment variables | Azure Key Vault references |

### Application Hosting
| Component | Development | Production |
|-----------|-------------|------------|
| Backend | localhost:5052 | Azure App Service (Linux) |
| Frontend | localhost:3000 | Azure Static Web Apps |
| Hangfire | Local process | Azure App Service ("Always On") |

### Plaid Configuration
| Setting | Development | Production |
|---------|-------------|------------|
| Environment | `sandbox` | `production` |
| Webhooks | Not implemented | Add webhook endpoint |
| Token Storage | Data Protection API | Azure Key Vault |

### Migration Steps
1. **Provision Azure Resources**
   - Azure PostgreSQL Flexible Server
   - Azure App Service (Linux, P1v2 or higher for Always On)
   - Azure Static Web Apps
   - Azure Key Vault
   - Azure Application Insights

2. **Migrate Database**
   - Export from Synology PostgreSQL
   - Import to Azure PostgreSQL
   - Verify EF migrations are current

3. **Configure Secrets**
   - Move all secrets to Azure Key Vault
   - Update App Service to use Key Vault references
   - Migrate Plaid tokens (re-encrypt with Key Vault)

4. **Update Configuration**
   - Set `ASPNETCORE_ENVIRONMENT=Production`
   - Update Plaid environment to `production`
   - Configure CORS for production domain

5. **Enable Monitoring**
   - Application Insights instrumentation
   - Set up alerts for job failures
   - Configure log retention

6. **Security Hardening**
   - Enable Azure Entra ID authentication
   - Configure network security groups
   - Enable Azure DDoS protection (if needed)

---

## Phase Alignment

The wave system provides tactical implementation milestones. These align with higher-level product phases:

| Phase | Focus | Wave/Feature Coverage | Status |
|-------|-------|----------------------|--------|
| **Phase 1** | Onboarding MVP | Waves 0-5 | ✅ Complete |
| **Phase 1.5** | Navigation Polish | Wave 6 + Accounts Page | 📋 Needed |
| **Phase 2** | Data Aggregation | Waves 8-9, 11 | 🔄 In Progress |
| **Phase 3** | AI Advisory | Wave 7 + Wave 16 + Chatbot | ✅ Core done, Vetting & Chatbot planned |
| **Phase 4** | Daily Experience | Wave 10 + Notifications | 📋 Wave 10 next |
| **Phase 5** | Production Hardening | Auth, Security, Compliance | 📋 H2 2026 |

---

## Technology Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Backend | .NET 9 Web API | ✅ Active |
| Database | PostgreSQL | ✅ Active |
| Frontend | React 19 + TypeScript + Vite | ✅ Active |
| UI Framework | MUI v6 | ✅ Active |
| AI Primary | Gemini 2.5 Pro (→ 3 Pro when available) | ✅ Active |
| AI Backup | Claude Opus 4 | ✅ Active |
| Market Data | FMP API | ✅ Active |
| Job Scheduler | Hangfire | 📋 Wave 10 |
| Bank Linking | Plaid | 📋 Wave 11 |
| Auth | Azure Entra ID | ⏸️ Bypass mode (dev) |

---

## Key Dates

| Date | Milestone |
|------|-----------|
| October 2025 | Wave 5 MVP Complete |
| October 2025 | Wave 7 AI Advisory Complete |
| November 2025 | Wave 8-9.2 Complete |
| December 7, 2025 | Wave 9.3 Complete (v0.9.5-alpha) |
| Q1 2026 | Wave 10 Background Jobs |
| January 2026 | Wave 11 Plaid Integration |
| Q1 2026 | Wave 12 Advanced Analytics |
| Q2 2026 | Wave 15 Property Management & Valuation |
| Q2 2026 | Wave 16 AI Enhancement & Vetting |

---

## Future Considerations (Post-v1.0)

These items remain intentionally unscoped until Phase 5 production hardening is complete:

- **Mobile App**: iOS/Android with push notifications
- **Voice Interfaces**: Alexa/Google Assistant portfolio queries
- **Advisor Mode**: Multi-tenant support, shared dashboards, white-label
- **Auto-Execution**: Self-service rebalancing and cash sweeps (compliance gated)
- **Monetization**: Premium tiers, faster refresh, advanced analytics

---

## Cross-Cutting Concerns

- **Testing**: 88+ tests passing, Vitest + MSW integration
- **Documentation**: Subject-organized `docs/` with documentation map
- **MCP Integration**: AI database access via PostgreSQL MCP server
- **Performance**: Target <1.5s page load, <500ms API response

---

_This roadmap is updated at the completion of each wave. See `docs/waves/` for detailed wave plans and completion summaries._
