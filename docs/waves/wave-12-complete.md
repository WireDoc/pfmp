# Wave 12 & 12.5: Brokerage, Investment, & Unified Plaid Linking

> **Status**: ✅ Complete
> **Started**: December 13, 2025
> **Completed**: March 30, 2026
> **Priority**: High
> **Prerequisites**: Wave 11 Complete ✅

---

## Overview

Wave 12 and its 12.5 extension deliver full Plaid integration across all supported account types — investments, credit cards, mortgages, and student loans — building on Wave 11's bank account linking foundation. The result is a single "Connect a Bank" flow that links any combination of financial products from 12,000+ institutions.

**Key achievements:**
- Unified Plaid Link supporting transactions, investments, and liabilities products
- Automatic holdings sync with cost basis and investment transaction tracking
- Credit card, mortgage, and student loan sync via Plaid Liabilities
- Mortgage-to-property auto-linking with equity tracking
- Synced field protection (Plaid-managed fields read-only in edit dialogs)
- Opening balance detection with dialog for adding historical cost basis
- Credit utilization and overdue payment alert generation
- Connection lifecycle: connect, sync, reconnect, disconnect, delete
- Student Loans tab in Connections settings
- ITEM_LOGIN_REQUIRED detection and status handling

---

## Wave 12: Brokerage & Investment Linking

### Phase 1: Backend Foundation (Dec 13, 2025)
- PlaidInvestmentsService with sandbox seeding capability
- PlaidSecurity model for securities reference data
- Extended Account/Holding models with Plaid fields (Source, PlaidItemId, PlaidAccountId, LastSyncedAt, SyncStatus)
- Investment endpoints added to PlaidController
- EF migration `AddPlaidInvestmentsSupport` applied
- Sandbox seeding tested: 2 accounts, 13 holdings created

### Phase 2: Frontend Integration (Dec 14, 2025)
- PlaidInvestmentsLinkButton component with react-plaid-link
- InvestmentsSettingsView at `/dashboard/settings/investments`
- SettingsView updated with Investment Accounts navigation
- Investment API functions in plaidApi.ts
- AppRouter routes for investments settings
- PlaidInvestmentsCTA dashboard component

### Phase 2.5: Investment Transactions (Dec 18, 2025)
- Unified ConnectionsSettingsView with Banks/Investments tabs
- Fixed GetConnectionAccounts to return investment accounts from Accounts table
- Delete protection for synced accounts, holdings, and transactions
- Investment transaction sync: buy, sell, dividend, contribution, withdrawal
- InvestmentTransactionList component with sync button
- Transaction history status API (opening balance detection)
- IncompleteHistoryBanner with AddOpeningBalancesDialog
- Frontend wiring in AccountDetailView

### Phase 3: Testing & Documentation (Jan 5, 2026)
- Tested all 5 custom Plaid sandbox users (see `docs/testing/plaid-custom-users.md`)
- Validated opening balance detection per scenario
- Fixed FMP API nullable fields for price refresh
- Fixed account balance recalculation after price updates
- Fixed stale historical price data detection (>1 day threshold)
- Fixed tax lot holding period to use transaction dates

---

## Wave 12.5: Unified Plaid Account Linking

### Phase 1: Backend Foundation (Jan 2026)
- Extended AccountSource enum: `PlaidCreditCard` (4), `PlaidMortgage` (5), `PlaidStudentLoan` (6)
- Extended AccountConnection: `Products` JSON field, `IsUnified` flag
- Extended LiabilityAccount: Plaid fields (Source, PlaidItemId, PlaidAccountId, SyncStatus), payment tracking, YTD amounts, escrow, overdue detection
- Extended PropertyProfile: Source, LinkedMortgageLiabilityId, address fields, sync tracking
- Created PropertyValueHistory model for tracking equity over time
- Created PlaidLiabilitiesService for credit cards, mortgages, student loans
- Created PlaidConnectionService as unified orchestrator
- EF migration `AddUnifiedPlaidSupport` applied
- 5 unified API endpoints: link-token, exchange-token, sync, list, update-products

### Phase 2: Frontend Integration (Jan–Feb 2026)
- Unified Plaid Link flow replacing per-type link buttons
- Account selection UX with post-link management
- Credit Cards, Mortgages, Student Loans tabs in ConnectionsSettingsView
- Per-account sync toggles and connection action menus
- Read-only synced fields in edit dialogs (balance, institution, accountType)
- Plaid-linked indicator badges

### Phase 3: Credit Card & Loan Features (Feb 2026)
- Credit card display: balance, limit, utilization %, APR, payment due date
- Credit utilization alerts (>30% moderate, >50% high, >90% critical)
- Overdue payment alert generation (severity: critical, impact: 90)
- Student loan display: balance, APR, due dates, minimum payments
- Debt Payoff Dashboard integration with all synced liability types

### Phase 4: Property Integration (Feb 2026)
- Mortgage → property auto-creation via `UpsertPropertyFromMortgageAsync`
- Property address matching for existing records
- PropertyValueHistory tracking (records on create/update)
- PropertyTaskService for value update reminders
- PropertyDetailView with breadcrumbs, summary, linked mortgage, address, history
- Property panel navigation with clickable cards

### Phase 5: Testing & Bug Fixes (Feb–Mar 2026)

**Bug Fixes:**
- Fixed unified linker skipping bank account creation (SyncUnifiedConnectionAsync now calls FetchAndSyncAccountsAsync)
- Fixed duplicate mortgage in Liabilities panel (filtered Properties with LinkedMortgageLiabilityId)
- Fixed missing credit card from Plaid Business accounts (fallback for accounts not in liabilities.Credit)
- Removed per-type Plaid link buttons; consolidated to PlaidUnifiedLinkButton
- Read-only synced fields in edit dialogs to prevent overwrite on next sync
- Fixed 3 stale test imports (DashboardWave4 → Dashboard), added MemoryRouter wrappers, MSW handler for sparkline
- Fixed chart rendering for D3.js area chart (net worth timeline investments)
- Fixed connection products display in settings
- Fixed routing/direct URL navigation with HashRouter
- Fixed property "Not Found" message for invalid IDs
- Added Student Loans tab to ConnectionsSettingsView
- Standardized ConnectionActionMenu across all liability tabs
- ITEM_LOGIN_REQUIRED detection in backend with SyncStatus.Expired
- Frontend syncConnection now uses unified endpoint `/api/plaid/unified/connections/{id}/sync`
- Backend SyncAllConnections reworked to use PlaidConnectionService
- ConnectionCard auto-re-fetches expanded accounts when lastSyncedAt changes

**Testing:**
- 23 manual tests executed (see `docs/testing/wave-12-5-testing-guide.md`)
- 21 passed, 1 passed with note (value history deferred to Wave 15), 1 deferred (no manual property UI until Wave 15)
- 10 custom Plaid sandbox users configured across Users 10–20
- All 54 frontend test files (289+ tests) passing

---

## Technical Decisions

### Plaid Investments over Direct APIs
| Factor | Plaid Investments | Direct APIs (Schwab, E*TRADE) |
|--------|-------------------|-------------------------------|
| Coverage | 1,600+ brokerages | 2 brokerages |
| Implementation | Same as Wave 11 | 2 separate OAuth flows |
| Maintenance | Plaid handles changes | We maintain each |
| Cost | ~$0.50–1.50/acct/month | Free but complex |
| Time to Ship | 1–2 weeks | 4–6 weeks |

### TSP Exclusion
TSP is not supported by Plaid. PFMP retains manual fund-level tracking with daily price refresh via tsp.gov.

### Synced Field Protection
Plaid-managed fields (balance, institution, account type) are disabled in edit dialogs. User-managed fields (nickname, purpose, emergency fund flag, interest rate) remain editable.

---

## API Endpoints Added

### Wave 12 (Investment)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/plaid/investments/link-token` | Create link token for investments |
| POST | `/api/plaid/investments/exchange-token` | Exchange token, create accounts + sync |
| POST | `/api/plaid/connections/{id}/investments/sync` | Manual investment holdings refresh |
| GET | `/api/plaid/connections/{id}/investments/transactions` | Investment transaction list |

### Wave 12.5 (Unified)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/plaid/unified/link-token` | Unified link token for all products |
| POST | `/api/plaid/unified/exchange-token` | Exchange token, create unified connection |
| POST | `/api/plaid/unified/connections/{id}/sync` | Sync all products for connection |
| GET | `/api/plaid/unified/connections` | List connections with product info |
| PUT | `/api/plaid/unified/connections/{id}/products` | Update connection products |

### Credit Alerts
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/alerts/credit/generate?userId={id}` | Generate credit utilization/overdue alerts |

### Properties
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/properties?userId={id}` | List user properties |
| GET | `/api/properties/{id}` | Property detail |
| POST | `/api/properties` | Create property |
| PUT | `/api/properties/{id}` | Update property |
| DELETE | `/api/properties/{id}` | Delete property |
| GET | `/api/properties/{id}/history` | Value history |
| POST | `/api/properties/tasks/generate` | Generate update tasks |

---

## Data Model Changes

### New Tables
- `Securities` — Plaid security reference data (ticker, CUSIP, ISIN, type)
- `PropertyValueHistory` — Historical property value tracking

### Extended Tables
- `Accounts` — Added Source, PlaidItemId, PlaidAccountId, LastSyncedAt, SyncStatus
- `Holdings` — Added PlaidSecurityId, PlaidHoldingId, LastSyncedAt
- `AccountConnections` — Added Products (JSON), IsUnified flag
- `LiabilityAccounts` — Added Source, PlaidItemId, PlaidAccountId, SyncStatus, payment tracking, overdue detection, YTD amounts, escrow
- `Properties` — Added Source, LinkedMortgageLiabilityId, address fields, sync tracking

### Migrations Applied
- `AddPlaidInvestmentsSupport` (Wave 12)
- `AddUnifiedPlaidSupport` (Wave 12.5)

---

## Sandbox Test Users

| User | Plaid Username | Scenario |
|------|----------------|----------|
| 10 | `user_good` | Full data: 2 CC, mortgage, student loan, property, 13 holdings, 6 cash |
| 11 | `custom_pfmp_new_investor` | 3 new buy holdings (fully reconciled) |
| 12 | `custom_pfmp_established` | 3 old holdings (needs opening balance) |
| 13 | `custom_pfmp_mixed` | 3 holdings (mix new + old) |
| 14 | `custom_pfmp_401k` | 1 holding (401k with employer match) |
| 15 | `custom_pfmp_closed` | 1 holding (fully sold position) |
| 16 | `custom_pfmp_credit_high_util` | 90% utilization, overdue |
| 17 | `custom_pfmp_mortgage` | $285k mortgage (no address in sandbox) |
| 18 | `custom_pfmp_student_loans` | 2 student loans ($19.5k + $8.5k) |
| 19 | `custom_pfmp_unified` | Multi-product: cash, investment, CC, mortgage |
| 20 | *(manual)* | 6 holdings, 3 cash — no Plaid |

---

## Known Limitations

1. **TSP not Plaid-supported** — Federal retirement plans remain manual-only
2. **Plaid sandbox data** — Custom sandbox mortgages don't include PropertyAddress; auto-creation only works with `user_good`
3. **Property value history** — Empty until Wave 15 adds dashboard property editing
4. **Manual property test** (Test 4.4) — Deferred to Wave 15 (no dashboard CRUD)
5. **Credit alerts dashboard-only** — Push notifications (text, Discord) planned for future wave

---

## Commit History

### Wave 12 Commits
| Hash | Description |
|------|-------------|
| (Dec 13) | Phase 1: Backend foundation — models, migration, PlaidInvestmentsService |
| (Dec 14) | Phase 2: Frontend — link button, settings view, dashboard CTA |
| (Dec 18) | Phase 2.5: Investment transactions, opening balance detection |
| (Jan 5) | Phase 3: Testing, sandbox validation, bug fixes |

### Wave 12.5 Commits (Session: Mar 30, 2026)
| Hash | Description |
|------|-------------|
| `3d6667e` | Fix: Net Worth Timeline investments display |
| `82abe2c` | Fix: Connection Products Display in settings |
| `1219503` | Fix: Routing/direct URL navigation |
| `cdbede6` | Fix: Property "Not Found" message |
| `9ef0adb` | Feat: Student Loans tab, ConnectionActionMenu, ITEM_LOGIN_REQUIRED |
| `af12bd2` | Fix: Sync Now/Sync All use unified endpoint |
| `922ccf3` | Fix: Re-fetch expanded accounts on lastSyncedAt change |

---

## Related Documentation

- `docs/testing/wave-12-5-testing-guide.md` — Full manual test checklist (23 tests)
- `docs/testing/plaid-custom-users.md` — Custom Plaid sandbox user configurations
- `docs/waves/wave-11-complete.md` — Prerequisite: Plaid bank account linking
- `docs/waves/wave-15-property-management.md` — Next: Dashboard property CRUD and automated valuation
