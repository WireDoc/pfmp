# PFMP Product Roadmap (2025–2026)

_Last updated: 2025-12-07_

## Current Status Summary

| Milestone | Status | Completion Date |
|-----------|--------|-----------------|
| Wave 0-5: Onboarding MVP | ✅ Complete | October 2025 |
| Wave 6: Navigation Shell | ⏸️ Deferred | — |
| Wave 7: AI Advisory System | ✅ Complete | October 2025 |
| Wave 8: Account Detail Views | ✅ Complete | November 2025 |
| Wave 9: Market Data & Analytics | ✅ Complete | December 2025 |
| Wave 10: Background Jobs | 🔄 Next | Q1 2026 |
| Wave 11: Plaid Integration | 📋 Planned | January 2026 |
| Wave 12: Advanced Analytics | 📋 Planned | Q1 2026 |

**Current Version**: v0.9.5-alpha (December 7, 2025)

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

---

## In Progress

### Wave 10: Background Jobs & Automation 🔄
**Target**: Q1 2026

**Infrastructure**
- Hangfire integration with PostgreSQL storage
- Dashboard-style job management UI (Sonarr-inspired)

**Core Jobs**
| Job | Schedule | Description |
|-----|----------|-------------|
| PriceRefreshJob | Hourly (market hours) | Update stock prices via FMP API |
| PerformanceSnapshotJob | 4:30 PM EST daily | Capture net worth for timeline |
| StalenessAlertJob | Daily | Flag stale account data |
| TSPPriceRefreshJob | Daily | Update TSP fund prices |

**Features**
- Account-level `IsBackgroundRefreshEnabled` flag
- Manual refresh buttons ("Refresh Prices" on account views)
- Net Worth Timeline using snapshot data
- Scheduler Admin UI with MUI design

See `docs/waves/wave-10-plan.md` for detailed implementation plan.

---

## Planned Waves

### Wave 11: Plaid Bank Account Linking 📋
**Target**: January 2026

- Plaid Link integration (12,000+ financial institutions)
- Automatic account balance synchronization
- Transaction import with category mapping
- Secure token management

See `docs/waves/wave-11-account-linking-strategy.md`

### Wave 12: Advanced Analytics 📋
**Target**: Q1 2026 (Post-Plaid)

- Sankey Diagram for cash flow visualization (requires transaction data)
- Budget vs Actual analysis
- Spending insights and trends
- Enhanced D3.js visualizations

---

## Major Features Roadmap

### Navigation Shell & Accounts Page 📋
**Dependency**: Wave 6 (deferred but needed)

The left sidebar currently has placeholder pages. Full implementation includes:

| Page | Status | Description |
|------|--------|-------------|
| Dashboard | ✅ Functional | Net worth, accounts, insights, tasks |
| Accounts | 🔄 Partial | Detail views exist, list page needs work |
| Insights | 📋 Placeholder | AI recommendations hub |
| Tasks | 📋 Placeholder | Task management with status tracking |
| Profile | 📋 Placeholder | Edit onboarding sections |
| Settings | 📋 Placeholder | Preferences, notifications, auth |

**Deliverables when implemented:**
- Persistent left sidebar navigation (900px+ screens)
- Mobile-responsive hamburger menu
- Enhanced data display: sparkline charts, sync status badges
- WCAG 2.1 AA accessibility compliance

### AI Chatbot with Memory 📋
**Priority**: High (Core differentiator)
**Target**: Q2 2026

The dual AI pipeline (Wave 7) laid groundwork. Chatbot extends this:

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

## Phase Alignment

The wave system provides tactical implementation milestones. These align with higher-level product phases:

| Phase | Focus | Wave/Feature Coverage | Status |
|-------|-------|----------------------|--------|
| **Phase 1** | Onboarding MVP | Waves 0-5 | ✅ Complete |
| **Phase 1.5** | Navigation Polish | Wave 6 + Accounts Page | 📋 Needed |
| **Phase 2** | Data Aggregation | Waves 8-9, 11 | 🔄 In Progress |
| **Phase 3** | AI Advisory | Wave 7 + Chatbot + Memory | ✅ Core done, Chatbot planned |
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
| AI Primary | Gemini 2.5 Pro | ✅ Active |
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
