# Changelog

All notable changes to this project will be documented in this file.

The format follows [Conventional Commits](https://www.conventionalcommits.org/).

---

## [0.11.0-alpha] - 2026-01-05

### Wave 12 Complete - Brokerage & Investment Linking

**Plaid Investments Integration**
- Full investment account linking via Plaid (1,600+ brokerages)
- Holdings sync with automatic price refresh
- Investment transactions: buy, sell, dividend, contribution, withdrawal
- Opening balance detection with dialog for adding historical cost basis
- 5 custom Plaid sandbox users for comprehensive testing

**Price Refresh & Market Data**
- Fixed FMP API nullable fields (MarketCap, Volume, etc.) for options/mutual funds
- Added automatic price refresh on dashboard load (>4 hours stale threshold)
- Fixed account balance recalculation after price updates
- Fixed stale historical price data detection (>1 day threshold)
- Fixed PriceHistoryService DateTime UTC conversion for PostgreSQL

**Tax Insights Improvements**
- Fixed holding period calculation to use earliest buy transaction date
- Proper singular/plural grammar for days, months, years
- Short-term vs long-term classification based on actual purchase dates

**Delete Protection**
- Hide delete button for Plaid-synced transactions
- Hide delete button for Plaid-synced investment accounts
- Hide delete button for Plaid-synced holdings

---

## [0.10.2-alpha] - 2025-12-18

### Wave 12 Phase 2.5 - Synced Data Protection

**Delete Protection for Synced Data**
- Hide delete button for Plaid-synced transactions (source !== Manual)
- Hide delete button for Plaid-synced investment accounts (source = PlaidInvestments)
- Hide delete button for Plaid-synced cash accounts (source = Plaid)
- Hide delete button for Plaid-synced holdings (has plaidSecurityId)
- Manual accounts/transactions remain fully editable and deletable

**Backend Changes**
- Added `Source` field to CashAccountResponse DTO
- Include source in GetAccounts and GetAccount API responses

**Frontend Changes**
- Added `source` field to AccountResponse and CashAccountResponse types
- Added `PlaidInvestments` to TransactionSource enum
- Added `plaidSecurityId` to Holding interface
- Updated InvestmentTransactionList to conditionally render delete button
- Updated AccountModal and CashAccountModal to conditionally render delete button
- Updated HoldingsTable to conditionally render delete button

---

## [0.10.1-alpha] - 2025-12-14

### Wave 12 Phase 2 - Plaid Investments Frontend + Phase 2.5 Started

**Frontend Investment Linking**
- PlaidInvestmentsLinkButton component with react-plaid-link integration
- PlaidInvestmentsCTA dashboard component for quick linking
- InvestmentsSettingsView at `/dashboard/settings/investments`
- SettingsView updated with Investment Accounts navigation
- Investment API functions in plaidApi.ts (types, link token, exchange, sync)
- AppRouter routes for investments settings page

**Net Worth Calculation Fix**
- Fixed NetWorthSnapshotJob to match Dashboard calculation exactly
- Now uses CashAccounts table (not Accounts for cash)
- Uses TspLifecyclePositions with TSPFundPrices for live TSP values
- Uses Properties table for real estate values
- Manual snapshot trigger now updates existing snapshots instead of skipping
- Net worth timeline now matches dashboard values

**Developer Experience**
- Console output now logs to files (`PFMP-API Console Output.txt`, `Vite Console Output.txt`)
- ANSI codes stripped from file output while preserving console colors
- Dev server windows auto-close when processes end (no more `-NoExit`)
- Backend console colors preserved via `DOTNET_SYSTEM_CONSOLE_ALLOW_ANSI_COLOR_REDIRECTION`

**UI Polish**
- Dashboard overview shows 2 decimal places for currency values
- Breadcrumbs added to TspDetailView, NetWorthTimelineView, SchedulerAdminView
- Test fixes for LiabilitiesPanel and TspPanel (MemoryRouter wrapping)

**Phase 2.5 In Progress: Investment Transactions**
- Adding Plaid `/investments/transactions/get` endpoint support
- Will sync buy, sell, dividend, contribution, withdrawal transactions

---

## [0.10.0-alpha] - 2025-12-13

### Wave 12 Phase 1 - Plaid Investments Backend

**Investment Account Linking Infrastructure**
- PlaidInvestmentsService with full investment sync capability
- PlaidSecurity model for securities reference data (stocks, ETFs, mutual funds, crypto, options)
- Extended Account model with Source enum (Manual, PlaidBank, PlaidInvestments)
- Extended Holding model with PlaidSecurityId, PlaidHoldingId, PlaidLastSyncedAt
- EF migration AddPlaidInvestmentsSupport applied

**New Investment Endpoints**
- `POST /api/plaid/investments/link-token` - Create link token for investments product
- `POST /api/plaid/investments/exchange-token` - Exchange token and create investment accounts
- `POST /api/plaid/investments/connections/{id}/sync` - Sync holdings from Plaid
- `POST /api/plaid/investments/sandbox/seed` - Create sandbox test user with investments

**Developer Tooling**
- External test runner scripts (run-tests.bat, scripts/run-tests.ps1)
- Prevents VS Code freezing during test execution

**Tested**
- Sandbox seeding creates 2 investment accounts (401k, IRA)
- 13 holdings synced (equities, ETFs, mutual funds, crypto, options, fixed income)
- All 93 backend tests passing

---

## [0.9.9-alpha] - 2025-12-13

### Wave 11 Phase 5 - Plaid Transaction Sync

**Transaction Sync Implementation**
- Added transaction sync to daily PlaidSyncJob (runs after balance sync)
- Fixed DateTime UTC conversion for PostgreSQL compatibility
- Improved transaction description fallback (MerchantName → Name → Category)
- 33 sandbox transactions synced with proper categories
- Transactions stored with PlaidCategory, PlaidCategoryDetailed, PaymentChannel

---

## [0.9.8-alpha] - 2025-12-12

### Wave 11 Phases 1-4 - Plaid Bank Account Linking

**Connection Lifecycle Management**
- Reconnect endpoint for expired/failed connections (Plaid update mode)
- Disconnect endpoint (pauses sync without deleting data)
- Permanent delete with option to keep or remove linked accounts
- Status-based menu actions in ConnectedBanksList

**Frontend Polish**
- Institution name auto-populated from Plaid metadata
- Added CD and HSA account types to CashAccountModal
- Protected Plaid-linked accounts from manual deletion
- Moved Connections and Scheduler nav items to HeaderBar
- Fixed 404 routes for `/dashboard/settings/connections` and `/dashboard/admin/scheduler`

**Performance Fix**
- DashboardController no longer calls external TSP API on every load
- Uses cached TSPFundPrices table (populated by Hangfire job)

**Test Coverage (39 new tests)**
- HeaderBar.test.tsx - 13 tests (branding, navigation, user display, dev mode)
- ConnectedBanksList.test.tsx - 15 tests (empty state, status menus, expand/collapse)
- ConnectionsSettingsView.test.tsx - 11 tests (layout, loading, sync, errors)

**Postman Collection v1.4.0**
- Added: Create Reconnect Link Token, Reconnect Success, Delete Connection Permanently
- Updated: Exchange Public Token now includes institutionId/institutionName
- Environment: Added accessToken, cashAccountId, connectionId, holdingId, transactionId, loanId, liabilityId, API keys

**Documentation**
- Updated copilot-instructions.md with Section 10: Testing Requirements
- Mandates Vitest for frontend changes, xUnit for backend changes

---

## [0.9.7-alpha] - 2025-12-11

### Wave 11 In Progress - Plaid Bank Account Linking

**Backend Complete (Phase 1 & 2)**

**Database Schema**
- `AccountConnections` table for Plaid bank connections
- `SyncHistory` table for sync audit trail
- Extended `CashAccounts` with Plaid fields (Source, PlaidAccountId, PlaidItemId, SyncStatus, LastSyncedAt, etc.)
- EF Core migration `AddPlaidIntegration` applied

**Plaid Integration**
- `Going.Plaid` v6.54.0 NuGet package
- `PlaidService` - Full Plaid API integration (link token, exchange, sync, disconnect)
- `DataProtectionEncryptionService` - ASP.NET Core Data Protection for token encryption
- `PlaidSyncJob` - Hangfire job for daily balance sync at 10 PM ET

**PlaidController Endpoints**
- `POST /api/plaid/link-token` - Create Plaid Link token
- `POST /api/plaid/exchange-token` - Exchange public token, create accounts
- `GET /api/plaid/connections` - List user's connected banks
- `GET /api/plaid/connections/{id}/accounts` - Get accounts for connection
- `POST /api/plaid/connections/{id}/sync` - Manual balance refresh
- `POST /api/plaid/sync-all` - Sync all user connections
- `DELETE /api/plaid/connections/{id}` - Disconnect bank
- `GET /api/plaid/connections/{id}/history` - Get sync history

**API Updates**
- Postman collection updated to v1.3.0 with Plaid endpoints
- Added `connectionId` and `accessToken` variables

**Pending (Phase 3 & 4)**
- Frontend: Plaid Link UI, Settings page, Dashboard CTA
- Testing: Plaid Sandbox testing with real credentials

---

## [0.9.6-alpha] - 2025-12-10

### Wave 10 Complete - Background Jobs & Automation

**Hangfire Integration**
- PostgreSQL-backed job storage
- Scheduler Admin UI at `/admin/scheduler` (Sonarr-inspired design)
- Hangfire dashboard at `/hangfire` for low-level monitoring

**Scheduled Jobs**
- `TspPriceRefreshJob` - Daily TSP fund price updates from tsp.gov
- `PriceRefreshJob` - Daily stock price updates via FMP API
- `NetWorthSnapshotJob` - Daily net worth snapshots for timeline
- Manual "Run Now" functionality for all jobs
- Schedule editing via admin UI

**Net Worth Timeline**
- Full-page view at `/dashboard/net-worth`
- D3.js stacked area chart with category breakdown
- Time range selector (1M, 3M, 6M, 1Y, YTD, ALL)
- Graceful empty state for new users

**TSP Detail Page**
- Full-page view at `/dashboard/tsp`
- All fund positions with current prices and market values
- `TspPositionsEditor` component for editing units/contribution %
- Navigation link from dashboard TSP panel
- Prices from stored `TSPFundPrices` table (no API calls on page load)

**API Updates**
- `GET /api/financial-profile/{userId}/tsp/detail` - Comprehensive TSP data
- Postman collection updated to v1.2.0 with all new endpoints

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
