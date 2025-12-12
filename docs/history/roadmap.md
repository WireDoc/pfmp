# PFMP Product Roadmap (2025–2026)

_Last updated: 2025-12-12_

## Current Status Summary

| Milestone | Status | Completion Date |
|-----------|--------|-----------------|
| Wave 0-5: Onboarding MVP | ✅ Complete | October 2025 |
| Wave 6: Navigation Shell | ⏸️ Deferred | — |
| Wave 7: AI Advisory System | ✅ Complete | October 2025 |
| Wave 8: Account Detail Views | ✅ Complete | November 2025 |
| Wave 9: Market Data & Analytics | ✅ Complete | December 2025 |
| Wave 10: Background Jobs | ✅ Complete | December 2025 |
| TSP Detail Page | ✅ Complete | December 2025 |
| Wave 11: Plaid Integration | ✅ Complete | December 2025 |
| Wave 12: Advanced Analytics | 📋 Planned | Q1 2026 |
| Wave 13: AI Enhancement & Vetting | 📋 Planned | Q1-Q2 2026 |

**Current Version**: v0.9.8-alpha (December 12, 2025)

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
**Completed**: December 12, 2025

**Scope:** Bank accounts only (checking, savings, money market, CD, HSA)

- Plaid Link integration (12,000+ financial institutions)
- Automatic account balance synchronization (daily via Hangfire)
- Connection lifecycle: connect, reconnect (update mode), disconnect (pause), delete
- Settings page (`/dashboard/settings/connections`) + Dashboard CTA
- Secure token management via Data Protection API
- 39 new Vitest tests for Plaid components
- Postman collection updated to v1.4.0

**Not in Wave 11:** Transaction import (Wave 14+), Brokerage linking (Wave 12)

**See:** `docs/waves/wave-11-plan.md`

---

## Planned Waves

### Wave 12: Brokerage & Investment Linking 📋
**Target**: February-March 2026

**Phase A: Plaid Investments** (~$1.00/account/month)
- Covers Fidelity, Vanguard, and 10+ other brokerages
- Holdings sync with cost basis
- Fastest path to broad coverage

**Phase B: Direct Brokerage APIs** (Free)
| Broker | API | Holdings | Transactions | Notes |
|--------|-----|----------|--------------|-------|
| TD Ameritrade/Schwab | OAuth REST | ✅ | ✅ | Free, well-documented |
| E*TRADE | OAuth REST | ✅ | ✅ | Free, Morgan Stanley owned |
| Fidelity | ❌ No API | Use Plaid | Use Plaid | No public API |
| Vanguard | ❌ No API | Use Plaid | Use Plaid | No public API |
| Ally Invest | Limited | ⚠️ | ⚠️ | Poor API support |
| Robinhood | ❌ Unofficial | ⚠️ | ⚠️ | TOS violation risk |

**Recommendation:** Start with Plaid Investments for broad coverage, add direct Schwab/E*TRADE APIs for power users who want free access.

### Wave 13: Crypto Exchange Integration 📋
**Target**: Q1-Q2 2026

All major exchanges offer **free** read-only APIs:

| Exchange | API | Holdings | Transactions | Staking |
|----------|-----|----------|--------------|---------|
| Coinbase | REST + WS | ✅ | ✅ | ✅ |
| Binance | REST + WS | ✅ | ✅ | ✅ |
| Kraken | REST + WS | ✅ | ✅ | ✅ |
| Gemini | REST + WS | ✅ | ✅ | ❌ |

**Security:** Read-only API keys only (no trading/withdrawal permissions)

### Wave 14: Transaction Import & Categorization 📋
**Target**: Q2 2026

- Add Plaid Transactions product (~$0.50/account/month)
- 24-month transaction history import
- Automatic categorization using Plaid categories
- Duplicate detection with manual entries
- Spending analysis and budgeting foundation

### Wave 15: AI Enhancement & Vetting 📋
**Target**: Q2 2026 (Before Chatbot)
**Priority**: Required before Chatbot

The Wave 7 AI advisory system focused on cash optimization. Before building the chatbot, the AI context needs expansion and vetting.

**Context Improvements Needed:**
| Analysis Type | Current Status | Required Changes |
|--------------|----------------|------------------|
| Cash Optimization | ✅ Good | Minor refinements |
| Portfolio Rebalancing | ⚠️ Minimal | Add holdings, allocations, asset classes |
| TSP | ⚠️ Minimal | Add actual fund positions, contribution rates |
| Risk | ⚠️ Minimal | Add portfolio composition, volatility metrics |

**Developer Tools (Already Implemented):**
- `GET /api/ai/preview/{userId}/{analysisType}` - Dry-run preview
- Shows exact prompts before sending to AI
- Helps refine context quality

**Post-Processing Recommendations:**
- Two-Pass Summarization (verbose → action items)
- Structured JSON output for concrete recommendations
- Enhanced `ExtractActionItems()` rule-based extraction

**Model Updates:**
- Upgrade to Gemini 3 Pro when available
- Simple config change: `appsettings.json` → `"Model": "gemini-3.0-pro"`

**Success Criteria:**
- All analysis types return meaningful, accurate recommendations
- AI correctly interprets user's complete financial picture
- Recommendations are concrete with $ amounts and timelines
- Ready for chatbot memory integration

See archived AI context documentation for implementation details.

---

## Major Features Roadmap

### Navigation Shell & Accounts Page 📋
**Dependency**: Wave 6 (deferred but needed)

The left sidebar currently has placeholder pages. Full implementation includes:

| Page | Status | Description |
|------|--------|-------------|
| Dashboard | ✅ Functional | Net worth, accounts, insights, tasks |
| Accounts | 🔄 Partial | Detail views exist, list page needs work |
| **TSP** | 📋 **Needed** | **Detail page with fund editing** |
| Insights | 📋 Placeholder | AI recommendations hub |
| Tasks | 📋 Placeholder | Task management with status tracking |
| Profile | 📋 Placeholder | Edit onboarding sections |
| Settings | 📋 Placeholder | Preferences, notifications, auth |

**Deliverables when implemented:**
- Persistent left sidebar navigation (900px+ screens)
- Mobile-responsive hamburger menu
- Enhanced data display: sparkline charts, sync status badges
- WCAG 2.1 AA accessibility compliance

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
**Prerequisite**: Wave 13 (AI Enhancement & Vetting) must be complete

The dual AI pipeline (Wave 7) laid groundwork. Wave 13 expands context coverage. Chatbot extends this:

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
| **Phase 3** | AI Advisory | Wave 7 + Wave 13 + Chatbot | ✅ Core done, Vetting & Chatbot planned |
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
| Q1-Q2 2026 | Wave 13 AI Enhancement & Vetting |

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
