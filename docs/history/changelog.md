# Changelog

All notable changes to this project will be documented in this file.

The format follows [Conventional Commits](https://www.conventionalcommits.org/).

---

## [0.9.5-alpha] - 2025-12-07

### Wave 9.3 Complete - All Options Delivered (~8,000+ lines)

**Option A: Investment Analytics**
- 4-tab analytics: Performance, Tax, Risk, Allocation
- TWR/MWR calculations, Sharpe ratio, 30-day volatility
- Tax-lot analysis with unrealized gains/losses
- Beta, max drawdown, correlation matrix
- Allocation by asset class, sector, geography, market cap

**Option B: Loan & Credit Card Views**
- Debt payoff dashboard with Avalanche vs Snowball strategies
- Auto loan and mortgage management
- Payoff timeline Recharts visualization

**Option C: Cash Account UX Polish**
- Transaction tracking and history
- Interest summary and YTD earnings

**Option D: D3.js Visualizations**
- Sunburst allocation chart (toggle)
- Correlation heatmap with interactive highlighting
- Net Worth Timeline component (awaiting Wave 10 backend)
- `useD3` hook for React/D3 integration

### Documentation
- Created Wave 10 plan (Background Jobs & Automation)
- Updated roadmap.md with wave-based progress tracking
- Archived superseded planning documents

---

## [0.9.4-alpha] - 2025-12-01

### Wave 9.3 Options A-C
- Investment transaction management with add/edit/delete
- SKELETON/DETAILED account state system
- Liability management for loans and credit cards

---

## [0.9.3-alpha] - 2025-11-25

### Wave 9.2 - Market Data Integration
- FMP API integration for real-time stock quotes
- Historical price charts (1D, 1W, 1M, 3M, 1Y, 5Y)
- Price refresh infrastructure

---

## [0.9.2-alpha] - 2025-11-15

### Wave 8.1 - Account Detail Views
- Account detail modal with holdings breakdown
- Investment account views with charts
- Holdings management UI

---

## [0.9.1-alpha] - 2025-11-01

### Wave 7.4 - Enhanced AI Context
- Account purpose field for better AI understanding
- `TransactionalAccountDesiredBalance` user preference
- Backup AI receives raw data for fact-checking

---

## [0.9.0-alpha] - 2025-10-26

### Wave 5 MVP Complete
- Production dashboard with real backend data
- 15-section onboarding wizard with autosave
- Dashboard API aggregating net worth, accounts, insights, tasks
- Review status persistence survives page refreshes
- All 88 tests passing

### Wave 7.3 - Dual AI Pipeline
- Gemini 2.5 Pro + Claude Opus 4 consensus system
- Alert → Advice → Task workflow with provenance
- Context caching for cost optimization

---

## [0.8.0-alpha] - 2025-10-12

### Wave 4 - Dashboard Infrastructure
- Long-term obligations section with API client
- Dev user registry with reset functionality
- Quick glance metrics on dashboard
- SignalR rollout planning

---

## [0.7.0-alpha] - 2025-10-03

### Waves 0-3 - Foundation
- React Router routing with protection
- Onboarding wizard scaffold
- Feature flag infrastructure
- Persistence design and hydration

---

## [0.6.x] - 2025-09 (Historical)

### Initial Build
- AI integration (Azure OpenAI)
- Market data ingestion
- Task management domain
- TSP full fund coverage

---

## Updating This Changelog

1. Add entries under a new version header when tagging releases
2. Use sections: Added / Changed / Fixed / Removed as needed
3. Reference wave numbers for context
4. Link to detailed wave docs in `docs/waves/` for implementation details

_For detailed implementation notes, see the wave completion documents in `docs/waves/`._
