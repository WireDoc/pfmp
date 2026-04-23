# Wave 9.3: Account Detail View Redesign

**Date:** 2025-11-11 (Updated: 2026-04-23)  
**Status:** Phases 1–6 Complete — Wave 9.3.7 proposed for residual polish  
**Priority:** High (blocks proper account management UX)

## Status Update (April 23, 2026)

### ✅ Completed
- **Phase 1: Infrastructure** — Complete (Nov 10–12, 2025)
- **Phase 2: Cash Account Detail Views** — Complete (Nov 10–12, 2025)
- **Option C: Polish Cash Account UX** — Complete (Nov 13–14, 2025)
- **Options A–D: Investment, Loan, Credit views** — Complete (Nov–Dec 2025)
- **Phase 5: Investment Transaction Money Trail** — Complete (Mar 2026). All sub-phases shipped: `Transaction.SourceAccountId` / `LinkedTransactionId` / `FundingSource` fields, auto `INITIAL_BALANCE` on `CreateHolding`, `$CASH`/`CurrentBalance` debit-credit on BUY/SELL, funding source selector in `HoldingFormModal`, transfer flow via dedicated `TransferFundsDialog` (not embedded in `InvestmentTransactionForm` — see decision note in 5E), paired-transfer + auto-transaction tests.
- **Phase 6: Replace $CASH Holdings with `Account.CurrentBalance`** — Complete (Mar–Apr 2026). `PostAccount` / `UpdateBalance` / `CreateHolding` / `DashboardController` all updated, Plaid cash-equivalent mapping shipped, dashboard totals = `CurrentBalance + holdings value`, tests updated.
- **Cash Transaction CRUD parity with investment transactions** — Complete (Apr 2026). `CashTransactionsController` POST/PUT/DELETE with auto balance reconciliation, `CashTransactionForm` modal (deposit/withdrawal/transfer/fee/interest/refund/etc., two-step delete, signed amounts), `TransactionList` add/edit wiring, transfer endpoint now writes paired `CashTransaction` audit records on cash legs.

### 👉 Next Up
- **Wave 9.3.7: Residual polish** — see new section at bottom of this doc. Picks up the deferred Phase 2 visualization items, `AccountDetailsCard` cash-balance labeling, cash-side transfer audit verification, and optional CSV export. No new architecture, just finish work.

See `wave-9.3-option-c-complete.md` for Option C completion details.  
See `wave-9.3-next-steps.md` for implementation roadmap.

---

## Problem Statement

The current `AccountDetailView` is designed exclusively for **investment/brokerage accounts** with holdings (stocks, ETFs, crypto). This creates poor UX for other account types:

### Current Issues

1. **Generic Title:** Shows "Account #42" instead of actual account name
2. **Wrong Features for Non-Investment Accounts:**
   - Checking/Savings accounts show "Holdings" tab (meaningless)
   - Price chart defaulting to AAPL (unrelated to cash accounts)
   - "Add Holding" button for bank accounts (incorrect)
   - Refresh Prices button for accounts with no securities

3. **Missing Account-Specific Features:**
   - **Checking/Savings:** No transaction list, check register, interest tracking
   - **Credit Cards:** No payment due dates, minimum payment, APR display
   - **Mortgages/Loans:** No amortization schedule, principal vs interest breakdown
   - **Cash Accounts:** No check number tracking, deposit/withdrawal categorization

4. **API Errors:** Price history fails with 500 error when account has no holdings

## Solution: Type-Specific Detail Views

### Architecture Pattern: Component Composition

Create specialized detail views per account category while reusing common components.

```
AccountDetailView (Router)
├── InvestmentAccountDetail (Brokerage, IRA, 401k, Crypto)
├── CashAccountDetail (Checking, Savings, Money Market, CD)
├── LoanAccountDetail (Mortgage, Auto Loan, Student Loan, Personal Loan)
├── CreditCardAccountDetail (Credit cards, lines of credit)
└── PropertyAccountDetail (Real estate - future)
```

## Account Type Categories

Based on `AccountType` enum in backend:

### Investment Accounts (Current View Works)
- `Brokerage` (0)
- `RetirementAccount401k` (1)
- `RetirementAccountIRA` (2)
- `RetirementAccountRoth` (3)
- `HSA` (5)
- `CryptocurrencyExchange` (14)
- `CryptocurrencyWallet` (15)

**Features:** Holdings table, price chart, asset allocation, refresh prices, add/edit holdings

### Cash Accounts (Needs New View)
- `Checking` (6)
- `Savings` (7)
- `MoneyMarket` (8)
- `CertificateOfDeposit` (9)

**Features Needed:**
- Account details card (bank, routing #, account #, APY/interest rate)
- Transaction history (deposits, withdrawals, checks, transfers)
- Balance trends chart (daily balance over time)
- Interest earned tracking
- Check register view
- Direct deposit info
- Bill pay integration (future)

### Loan Accounts (Needs New View)
- Mortgage, Auto, Student, Personal (future expansion)

**Features Needed:**
- Loan summary (principal, interest rate, term, monthly payment)
- Amortization schedule
- Payoff date calculator
- Extra payment simulator
- Payment history
- Principal vs interest breakdown chart
- Escrow details (for mortgages)

### Credit Card Accounts (Needs New View)
- Credit cards, lines of credit (future expansion)

**Features Needed:**
- Card details (issuer, last 4 digits, credit limit, APR)
- Current balance vs available credit gauge
- Payment due date & minimum payment
- Transaction list with categories
- Spending by category chart
- Rewards tracking
- Interest charges over time

## Implementation Plan

### Phase 1: Infrastructure (Current Wave - 9.2 Cleanup)

**Goal:** Fix immediate bugs and prepare architecture

#### Tasks
1. ✅ **Fix AccountSummaryHeader Title**
   - Replace `Account #{accountId}` with actual account name
   - Fetch account details from `/api/accounts/{id}`
   - Display institution, account type, balance

2. ✅ **Fix PriceChartCard Error Handling**
   - Don't show chart for accounts with 0 holdings
   - Add empty state: "This account has no holdings to chart"
   - Only fetch price history if holdings exist

3. ✅ **Create AccountDetailRouter Component**
   - Check account type from API
   - Route to appropriate detail view based on type
   - Handle loading/error states

4. ✅ **Update Navigation**
   - Ensure integer AccountId used throughout
   - Test navigation from dashboard to detail views

**Estimated Time:** 4-6 hours  
**Status:** Ready to start

---

### Phase 2: Cash Account Detail View (Wave 9.3)

**Status:** ✅ COMPLETE (2025-11-12)  
**Goal:** Full-featured view for checking/savings accounts

#### Backend API Endpoints Needed

✅ **Implemented:** `AccountTransactionsController.cs`

```csharp
// ✅ GET /api/accounts/{id}/transactions?from=2024-01-01&to=2024-12-31&limit=100&category=Deposit
// Returns transaction history for cash account
public class AccountTransactionDto
{
    public int TransactionId { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; }
    public string Category { get; set; }  // Deposit, Withdrawal, Transfer, Fee, InterestEarned
    public decimal Amount { get; set; }  // Positive for deposits, negative for withdrawals
    public decimal BalanceAfter { get; set; }
    public string? CheckNumber { get; set; }
    public string? Memo { get; set; }
}

// ✅ GET /api/accounts/{id}/balance-history?days=30
// Returns daily balance snapshots
public class BalanceHistoryResponse
{
    public DateTime Date { get; set; }
    public decimal Balance { get; set; }
}

// ✅ GET /api/accounts/{id}/interest-summary?year=2024
// Returns interest earned breakdown
public class InterestSummaryResponse
{
    public int Year { get; set; }
    public decimal TotalInterestEarned { get; set; }
    public List<MonthlyInterest> MonthlyBreakdown { get; set; }
}
```

**Implementation Notes:**
- Reused existing `Transaction` model (supports both investment and cash transactions)
- `TransactionTypes` constants include: Deposit, Withdrawal, Transfer, Fee, InterestEarned
- Balance history calculated by working backwards from current balance
- Interest summary filters by `TransactionType = InterestEarned`

#### Frontend Components

✅ **Implemented:**

```tsx
// ✅ src/views/dashboard/CashAccountDetail.tsx
export function CashAccountDetail() {
  // ✅ Account summary card with overview tab
  // ✅ Transaction list tab (fetches from API, displays with color-coded amounts)
  // ✅ Balance history tab (fetches 30-day balance snapshots)
  // ✅ Interest earned tab (YTD summary with monthly breakdown)
  // ✅ Loading and error states
  // ⏳ Quick actions (add transaction, export to CSV) - deferred
}

// ⏳ src/components/cash-accounts/AccountDetailsCard.tsx
// Displays: Bank name, routing #, account #, type, APY, opening date
// Status: Basic info shown in Overview tab, enhanced card deferred

// ⏳ src/components/cash-accounts/TransactionList.tsx
// Paginated table with search, category filter, date range picker
// Status: Basic list implemented, advanced filtering deferred

// ⏳ src/components/cash-accounts/BalanceTrendChart.tsx
// Line chart showing balance over time (Recharts)
// Status: Data fetched, chart visualization deferred

// ⏳ src/components/cash-accounts/InterestSummaryCard.tsx
// YTD interest, monthly breakdown, projected annual
// Status: Basic summary implemented, projections deferred
```

**Implementation Notes:**
- Main `CashAccountDetail` component complete with 4 tabs (Overview, Transactions, Balance History, Interest)
- Transactions displayed with green (deposits) and red (withdrawals) color coding
- Monthly interest breakdown with formatted currency display
- Responsive layout with MUI Grid
- AccountSummaryHeader reused from investment views
- Router integration complete - AccountDetailView conditionally renders CashAccountDetail for cash account types

**Estimated Time:** 12-16 hours  
**Actual Time:** ~8 hours  
**Dependencies:** Phase 1 complete

**Files Changed:**
- Backend: `PFMP-API/Controllers/AccountTransactionsController.cs` (new)
- Frontend: `pfmp-frontend/src/views/dashboard/CashAccountDetail.tsx` (new)
- Frontend: `pfmp-frontend/src/views/dashboard/AccountDetailView.tsx` (modified - added conditional routing)

**Optional Enhancements (Deferred):**
- Advanced filtering UI (MUI DataGrid with date pickers, category dropdowns)
- Recharts balance trend visualization
- Enhanced AccountDetailsCard with masked account numbers
- CSV export functionality
- Transaction creation/editing UI

---

### Phase 3: Enhanced Investment View (Wave 9.4)

**Goal:** Improve existing investment view with better UX

#### Improvements
1. **Performance Metrics Tab**
   - Total return (dollar & percentage)
   - Time-weighted return
   - Money-weighted return (IRR)
   - Benchmark comparison (S&P 500, sector index)

2. **Asset Allocation Enhancements**
   - Drill-down by sector, geography, market cap
   - Target allocation vs actual
   - Rebalancing recommendations

3. **Tax Insights**
   - Unrealized gains/losses
   - Tax-loss harvesting opportunities
   - Cost basis methods (FIFO, LIFO, specific ID)
   - Estimated tax liability

4. **Risk Analysis**
   - Portfolio volatility (standard deviation)
   - Beta (vs market)
   - Sharpe ratio
   - Maximum drawdown

**Estimated Time:** 16-20 hours  
**Dependencies:** Phase 2 complete, Phase 1 data architecture solid

---

### Phase 4: Loan & Credit Card Views (Wave 9.5)

**Goal:** Support liability account management

#### Loan Account View
- Backend: Loan model with amortization schedule generation
- Frontend: Payment schedule, principal/interest charts, payoff calculator

#### Credit Card View
- Backend: Credit card model with spending categories
- Frontend: Balance gauge, spending breakdown, payment reminders

**Estimated Time:** 20-24 hours  
**Dependencies:** Phase 3 complete

---

## Technical Design Decisions

### 1. Component Router Pattern

```tsx
// AccountDetailView.tsx becomes a router
export function AccountDetailView() {
  const { accountId } = useParams();
  const { account, loading, error } = useAccount(accountId);
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!account) return <NotFoundState />;
  
  // Route based on account type
  const accountCategory = getAccountCategory(account.accountType);
  
  switch (accountCategory) {
    case 'investment':
      return <InvestmentAccountDetail account={account} />;
    case 'cash':
      return <CashAccountDetail account={account} />;
    case 'loan':
      return <LoanAccountDetail account={account} />;
    case 'credit':
      return <CreditCardAccountDetail account={account} />;
    default:
      return <GenericAccountDetail account={account} />;
  }
}
```

### 2. Shared Components

Extract common UI patterns:
- `AccountHeader` - Breadcrumbs, title, quick actions
- `AccountMetricsCards` - Reusable stat cards
- `AccountTabs` - Common tab pattern
- `AccountActions` - Edit, delete, export buttons

### 3. Data Fetching Strategy

Use React Query for caching:
```tsx
const { data: account } = useQuery(['account', accountId], () => fetchAccount(accountId));
const { data: transactions } = useQuery(['transactions', accountId], () => fetchTransactions(accountId));
```

### 4. Backend Data Architecture

Ensure `Accounts` table has fields for all types:
```csharp
public class Account
{
    // Common fields
    public int AccountId { get; set; }
    public AccountType AccountType { get; set; }
    public string AccountName { get; set; }
    public string? Institution { get; set; }
    public decimal CurrentBalance { get; set; }
    
    // Cash account fields
    public string? RoutingNumber { get; set; }
    public string? AccountNumber { get; set; }
    public decimal? InterestRate { get; set; }  // APY for savings
    public DateTime? MaturityDate { get; set; }  // For CDs
    
    // Investment account fields (existing)
    public List<Holding> Holdings { get; set; }
    
    // Loan account fields (future)
    public decimal? LoanAmount { get; set; }
    public decimal? InterestRateAPR { get; set; }
    public DateTime? LoanStartDate { get; set; }
    public int? TermMonths { get; set; }
    
    // Credit card fields (future)
    public decimal? CreditLimit { get; set; }
    public DateTime? PaymentDueDate { get; set; }
    public decimal? MinimumPayment { get; set; }
}
```

## Success Criteria

### Phase 1 (Immediate)
- ✅ Account name displayed correctly (not "Account #42")
- ✅ Price chart only shows for accounts with holdings
- ✅ No API errors on cash account pages
- ✅ Navigation works for all account types

### Phase 2 (Cash Accounts)
- ✅ Transaction list displays deposits/withdrawals
- ✅ Balance trend chart shows historical balances
- ✅ Interest earned tracking works
- ✅ CSV export of transactions
- ✅ Responsive design on mobile

### Phase 3 (Investment Enhancements)
- ✅ Performance metrics accurate
- ✅ Asset allocation drill-down works
- ✅ Tax insights helpful and accurate
- ✅ Risk metrics calculated correctly

### Phase 4 (Loans & Credit)
- ✅ Amortization schedule accurate
- ✅ Credit utilization gauge displays correctly
- ✅ Payment reminders configurable
- ✅ All liability types supported

## Migration Strategy

### Backward Compatibility
- Keep existing `InvestmentAccountDetail` code
- Add new views without breaking existing functionality
- Gradual rollout per account type

### Data Migration
- No schema changes required for Phase 1
- Phase 2 may need `Transactions` table
- Existing `Accounts` table extensible for new fields

## Testing Strategy

### Unit Tests
- Component rendering for each account type
- Router logic for type detection
- Data transformation functions

### Integration Tests
- Navigation from dashboard to detail views
- API data fetching and error handling
- CRUD operations per account type

### E2E Tests
- Complete user flow: Dashboard → Account Detail → Edit → Save
- Test each account type separately
- Mobile responsiveness

## Timeline Estimate

| Phase | Duration | Target Completion |
|-------|----------|-------------------|
| Phase 1: Infrastructure | 1 week | Wave 9.2 ✅ |
| Phase 2: Cash Accounts | 2 weeks | Wave 9.3 ✅ |
| Phase 3: Investment Enhancements | 2-3 weeks | Wave 9.4 ✅ |
| Phase 4: Loans & Credit | 3-4 weeks | Wave 9.5 |
| Phase 5: Transaction Money Trail | 2-3 weeks | Wave 9.3.5 (March 2026) |

**Total Estimated Time:** 10-13 weeks for complete implementation

## Priority Recommendations

### Immediate (This Week - Phase 1)
1. Fix "Account #42" title bug
2. Fix price chart error for non-investment accounts
3. Hide investment-specific features for cash accounts

### High Priority (Next 2 Weeks - Phase 2)
1. Implement CashAccountDetail view
2. Create transaction list component
3. Add balance trend chart

### Medium Priority (1-2 Months - Phase 3)
1. Enhanced investment metrics
2. Tax insights
3. Risk analysis

### High Priority (Current - Phase 5)
1. CreateHolding auto-generates INITIAL_BALANCE transaction
2. $CASH auto-debit on BUY, auto-credit on SELL
3. Funding source selector in Add Holding dialog
4. Cross-account TRANSFER with paired transactions

### Future (Phase 4)
1. Loan account support
2. Credit card support
3. Property account details

## Open Questions

1. **Transaction Data Source:** Where does transaction data come from?
   - Manual entry only?
   - Bank API integration (Plaid, Yodlee)?
   - CSV import?

2. **Historical Balance Data:** How to populate balance history?
   - Calculate from transactions?
   - Periodic snapshots?
   - Daily reconciliation?

3. **Interest Calculation:** How to track interest earned?
   - Manual transaction entry?
   - Calculated based on APY?
   - Import from bank statements?

4. **Check Numbers:** Are check numbers tracked?
   - If yes, need field in Transaction model
   - Check register view needed

5. **Account Linking:** Do accounts link to each other?
   - Transfers between accounts? → **Yes, Phase 5 adds `SourceAccountId` + `LinkedTransactionId` to Transaction model**
   - Shared liability accounts?
   - Joint accounts?

## References

- **Current Implementation:** `src/views/dashboard/AccountDetailView.tsx`
- **Account Model:** `PFMP-API/Models/Account.cs`
- **Holdings Model:** `PFMP-API/Models/Holding.cs`
- **Dashboard API:** `PFMP-API/Controllers/DashboardController.cs`
- **Wave 9.2 Complete:** `docs/waves/wave-9.2-complete.md`

---

### Phase 5: Investment Transaction Money Trail (Wave 9.3.5)

**Status:** ✅ Complete (March 2026). See per-sub-phase status table below.

| Sub-phase | Status | Evidence |
|-----------|--------|----------|
| 5A Transaction model fields | ✅ Done | `PFMP-API/Models/Transaction.cs` exposes `SourceAccountId`, `LinkedTransactionId`, `FundingSource` (+ `FundingSource` enum) |
| 5B Auto `INITIAL_BALANCE` on `CreateHolding` | ✅ Done | `PFMP-API/Controllers/HoldingsController.cs` (`CreateHolding`) emits the transaction for manual accounts |
| 5C `$CASH`/`CurrentBalance` debit‑credit + transfer logic | ✅ Done | `PFMP-API/Controllers/TransactionsController.cs` `transfer` endpoint creates paired WITHDRAWAL/DEPOSIT entries with `LinkedTransactionId` for all four account combinations |
| 5D Funding source selector | ✅ Done | `pfmp-frontend/src/components/holdings/HoldingFormModal.tsx` renders the selector + conditional source account picker for `InternalTransfer` |
| 5E Transfer UX in `InvestmentTransactionForm` | ✅ Done by design substitution | TRANSFER is intentionally not a type inside the per‑holding form. Cross‑account transfers go through the dedicated `TransferFundsDialog` (`pfmp-frontend/src/components/transfers/TransferFundsDialog.tsx`) accessible from account detail action bars. This avoids confusing single‑holding context with two‑account flows. |
| 5F Tests | ✅ Done | `PFMP-API.Tests/HoldingsControllerTests.cs` covers auto INITIAL_BALANCE; `PFMP-API.Tests/TransactionsControllerTests.cs` and `PFMP-API.Tests/CashTransactionsControllerTests.cs` cover paired transfer transactions across all combinations |

_Original plan retained below for traceability._

**Status (original):** 📄 Planned (March 2026)
**Priority:** High (blocks accurate portfolio tracking and manual account management)
**Triggered by:** User testing revealed that manually adding holdings creates orphaned records with no transaction history, and there's no way to document inter-account transfers.

#### Problem Statement

The current investment account UX has several gaps that prevent users from maintaining an accurate money trail:

1. **"Add Holding" creates orphaned holdings.** The `CreateHolding` endpoint ([HoldingsController.cs#L217](../PFMP-API/Controllers/HoldingsController.cs)) creates a Holding record but **no** corresponding `INITIAL_BALANCE` or `BUY` transaction. This triggers the reconciliation warning ("opening balance needed") because `PortfolioAnalyticsController.GetTransactionHistoryStatus` compares holding quantity against transaction-derived quantity and finds a 100% discrepancy.

2. **No funding source concept.** When buying a holding, there's no way to specify where the money came from (another PFMP account, external bank, credit card ACH, etc.). The `$CASH` holding is not debited on BUY transactions.

3. **Cross-account transfers are incomplete.** `TransactionTypes.Transfer` ("TRANSFER") exists as a constant but there's no `SourceAccountId`/`LinkedTransactionId` field on the Transaction model, so transfers only create a one-sided record — no corresponding debit in the source account.

4. **$CASH not updated on purchases.** When a user creates a BUY transaction, the target holding's quantity is recalculated via `HoldingsSyncService`, but the `$CASH` holding quantity remains unchanged. The money trail is broken.

#### Current Architecture (What Exists)

| Component | Status | Notes |
|-----------|--------|-------|
| Transaction model | ✅ 19 types defined | Missing: `SourceAccountId`, `LinkedTransactionId` fields |
| TransactionsController CRUD | ✅ Full (POST/GET/PUT/DELETE) | PUT allows editing all fields |
| HoldingsSyncService | ✅ Recalcs on BUY/SELL/etc. | Does NOT touch $CASH; TRANSFER handling incomplete |
| Frontend InvestmentTransactionForm | ✅ Type selector, symbol, qty, price | No funding source, no source account for TRANSFER |
| Frontend HoldingFormModal | ✅ Add/Edit holdings | No transaction auto-creation, no funding source |
| $CASH creation | ✅ On account setup | Not debited on BUY; not credited on SELL |
| Transaction editing | ✅ Backend + frontend | Working correctly |

#### Implementation Plan

##### Sub-phase 5A: Backend — Transaction Model & Cross-Account Transfers

**Goal:** Enable proper money trail tracking between accounts.

**1. Add fields to Transaction model:**
```csharp
// New fields on Transaction entity
public int? SourceAccountId { get; set; }        // For transfers: where money came from
public int? LinkedTransactionId { get; set; }     // Paired transaction (debit ↔ credit)

// Navigation
[ForeignKey("SourceAccountId")]
public virtual Account? SourceAccount { get; set; }

[ForeignKey("LinkedTransactionId")]
public virtual Transaction? LinkedTransaction { get; set; }
```

**2. EF Migration:** `AddTransactionMoneyTrailFields`

**3. Add `FundingSource` enum:**
```csharp
public enum FundingSource
{
    CashBalance,       // Debit from $CASH holding in same account
    InternalTransfer,  // Transfer from another PFMP account
    ExternalDeposit,   // ACH, wire, check deposit from outside PFMP
    CreditCard,        // Credit card purchase
    Other
}
```

**Files changed:**
- `PFMP-API/Models/Transaction.cs` — Add `SourceAccountId`, `LinkedTransactionId`, `FundingSource` fields
- New migration file

##### Sub-phase 5B: Backend — CreateHolding Auto-Transaction

**Goal:** When a user manually adds a holding, automatically create the corresponding `INITIAL_BALANCE` transaction so holdings are always backed by transactions.

**Logic (HoldingsController.CreateHolding):**
```
IF account is NOT Plaid-linked:
  1. Create holding (existing behavior)
  2. Create INITIAL_BALANCE transaction:
     - Symbol = holding.Symbol
     - Quantity = holding.Quantity
     - Price = holding.AverageCostBasis
     - Amount = Quantity × AverageCostBasis
     - TransactionDate = holding.PurchaseDate ?? DateTime.UtcNow
  3. IF funding source is CashBalance:
     - Debit $CASH holding (reduce quantity by Amount)
     - Create matching TRANSFER transaction on $CASH
```

**Files changed:**
- `PFMP-API/Controllers/HoldingsController.cs` — Modify `CreateHolding` to auto-generate transaction
- `PFMP-API/DTOs/CreateHoldingRequest` — Add optional `FundingSource`, `SourceAccountId` fields

##### Sub-phase 5C: Backend — $CASH Auto-Debit on BUY

**Goal:** When a BUY transaction is created, automatically debit the $CASH holding if funding source is CashBalance.

**Logic (TransactionsController.CreateTransaction):**
```
IF transactionType == BUY AND (fundingSource == CashBalance OR fundingSource is null):
  1. Find $CASH holding for the account
  2. IF $CASH.Quantity >= transaction.Amount:
     - Reduce $CASH.Quantity by transaction.Amount
     - Create linked TRANSFER transaction: $CASH → holding
  3. ELSE:
     - Proceed without $CASH debit (allow overdraft with warning)
     - Set a flag: NeedsFundingReconciliation = true

IF transactionType == SELL:
  1. Credit $CASH holding: increase Quantity by sale proceeds
  2. Create linked TRANSFER transaction: holding → $CASH

IF transactionType == TRANSFER AND SourceAccountId is set:
  1. Create debit transaction in source account (linked via LinkedTransactionId)
  2. Create credit transaction in destination account
  3. Update both account balances
```

**Files changed:**
- `PFMP-API/Controllers/TransactionsController.cs` — Add $CASH debit/credit logic
- `PFMP-API/Services/HoldingsSyncService.cs` — Handle TRANSFER with $CASH awareness

##### Sub-phase 5D: Frontend — Funding Source in Add Holding Dialog

**Goal:** Add a "Funding Source" selector to HoldingFormModal so users can document where the money came from.

**UI changes to HoldingFormModal:**
```
[Existing fields: Symbol, Name, Asset Type, Quantity, Cost Basis, Price...]

NEW SECTION: "Funding"
┌─────────────────────────────────────────────┐
│ How was this holding acquired?              │
│ ○ Purchase from account cash balance        │
│ ○ Transfer from another account  [▼ Select] │
│ ○ External deposit (ACH, wire, etc.)        │
│ ○ Existing position (no cash movement)      │
└─────────────────────────────────────────────┘
```

- "Purchase from account cash balance" → Sets `FundingSource: CashBalance`, auto-debits $CASH
- "Transfer from another account" → Shows account picker, sets `SourceAccountId`, creates paired transactions
- "External deposit" → Sets `FundingSource: ExternalDeposit`, creates DEPOSIT + BUY transactions
- "Existing position" → Current behavior (INITIAL_BALANCE only, no cash movement)

**Files changed:**
- `pfmp-frontend/src/components/holdings/HoldingFormModal.tsx` — Add funding source UI
- `pfmp-frontend/src/services/holdingsApi.ts` (or inline fetch) — Update request payload

##### Sub-phase 5E: Frontend — Transfer Transaction UX

**Goal:** When creating a TRANSFER transaction, show source/destination account pickers.

**UI changes to InvestmentTransactionForm:**
```
When TransactionType == "TRANSFER":
┌──────────────────────────────────┐
│ From Account: [▼ Select account] │
│ To Account:   [▼ Select account] │
│ Amount: $____________            │
│ Date:   [date picker]            │
│ Notes:  ________________________ │
└──────────────────────────────────┘
```

- Fetches user's accounts via `/api/accounts/user/{userId}`
- Creates paired transactions (debit in source, credit in destination)
- Updates account balances accordingly

**Files changed:**
- `pfmp-frontend/src/components/investment-accounts/InvestmentTransactionForm.tsx` — Add transfer fields
- Backend already has PUT for editing, so editable transfers work automatically

##### Sub-phase 5F: Tests

**Backend tests:**
- `HoldingsControllerTests.cs` — Test that CreateHolding now creates INITIAL_BALANCE transaction
- `TransactionsControllerTests.cs` — Test $CASH debit on BUY, credit on SELL
- `TransactionsControllerTests.cs` — Test cross-account TRANSFER creates paired transactions
- `HoldingsSyncServiceTests.cs` — Test TRANSFER handling with $CASH

**Frontend tests:**
- `HoldingFormModal.test.tsx` — Test funding source selector rendering and submission
- `InvestmentTransactionForm.test.tsx` — Test transfer account picker fields

#### Acceptance Criteria

1. ✅ Adding a holding via "Add Holding" automatically creates an `INITIAL_BALANCE` transaction (no more orphaned holdings)
2. ✅ BUY transactions debit the `$CASH` holding; SELL transactions credit it
3. ✅ Users can specify a funding source when adding holdings (cash balance, transfer, external, existing)
4. ✅ Cross-account transfers create paired transactions with `LinkedTransactionId`
5. ✅ The reconciliation warning ("opening balance needed") no longer triggers for newly created manual holdings
6. ✅ All transactions remain editable via the existing PUT endpoint
7. ✅ Existing Plaid-synced holdings/transactions are not affected

#### Migration Notes

- Existing holdings without transactions (like User 20's XLU and $CASH) can be fixed via the existing "Add Opening Balances" dialog — no data migration needed
- New `SourceAccountId` and `LinkedTransactionId` columns are nullable, so existing transactions are unaffected
- The `FundingSource` field defaults to `null` for pre-existing transactions

#### Estimated Effort

| Sub-phase | Scope | Estimate |
|-----------|-------|----------|
| 5A: Transaction model fields | Backend | 2-3 hours |
| 5B: CreateHolding auto-transaction | Backend | 3-4 hours |
| 5C: $CASH auto-debit on BUY/SELL | Backend | 4-5 hours |
| 5D: Funding source in Add Holding | Frontend | 3-4 hours |
| 5E: Transfer transaction UX | Frontend | 3-4 hours |
| 5F: Tests | Both | 4-5 hours |
| **Total** | | **19-25 hours** |

---

### Phase 6: Replace $CASH Holdings with Account.CurrentBalance (Wave 9.3.6)

**Status:** ✅ Complete (March–April 2026). See per-sub-phase status table below.

| Sub-phase | Status | Evidence |
|-----------|--------|----------|
| 6A No `$CASH` creation; debit `CurrentBalance` | ✅ Done | `AccountsController.PostAccount` no longer creates a `$CASH` holding; `HoldingsController.CreateHolding` debits `account.CurrentBalance`; `DashboardController` no longer overwrites `CurrentBalance` from holdings sum |
| 6B `$CASH` cleanup | ✅ Done | `PlaidInvestmentsService` removes stale `$CASH` / `CASH-SWEEP` rows during sync; user 20 reset confirmed during testing |
| 6C Cash balance display | ⚠️ Mostly done — polish in 9.3.7 | `AccountDetailsCard` shows `currentBalance` for cash accounts but the header label is generic "Balance" rather than "Cash Balance". Investment account header total = `CurrentBalance + holdings value`. Tracked in Wave 9.3.7. |
| 6D `POST /api/transactions/transfer` + `TransferFundsDialog` | ✅ Done | Endpoint at `PFMP-API/Controllers/TransactionsController.cs`; UI at `pfmp-frontend/src/components/transfers/TransferFundsDialog.tsx`; supports all four account-type combinations |
| 6E Dashboard total includes cash | ✅ Done | `DashboardController.GetSummary` computes `CurrentBalance + sum(holdings * price)` per account |
| 6F Plaid cash mapping | ✅ Done | `PlaidInvestmentsService.UpsertHoldingAsync` accumulates cash equivalents into `account.CurrentBalance` instead of synthesizing `$CASH` |
| 6G Tests | ✅ Done | `HoldingsControllerTests.CreateHolding_DebitsCurrentBalance`, transfer tests in `TransactionsControllerTests`, cash CRUD coverage in `CashTransactionsControllerTests` |

_Original plan retained below for traceability._

**Status (original):** 🔄 In Progress (March 2026)
**Priority:** High (architectural correction — $CASH as a holding is fundamentally wrong)
**Triggered by:** User testing with Ally Invest revealed that brokerage cash is an *account-level balance*, not a holding. Ally shows "Spending Power" at the account level, not a $CASH position in the holdings list.

#### Problem Statement

Phase 5 introduced `$CASH` as a synthetic holding to track uninvested cash in investment accounts. This creates several problems:

1. **Misrepresents reality.** Cash balance is an account attribute, not a security position. Real brokerages (Ally, Fidelity, Schwab) show cash as account-level "spending power" or "cash available to invest."
2. **Complicates holdings list.** `$CASH` must be filtered out of price lookups, FMP API calls, allocation charts, and performance calculations — a spreading code smell.
3. **Break total value calculation.** The dashboard recalculates `Account.CurrentBalance = sum(holdings × price)` which counts $CASH twice when displayed alongside an account balance.
4. **Transfer UX is wrong.** Cross-account transfers currently debit a `$CASH` holding instead of adjusting the account balance.

#### Design Decision

`Account.CurrentBalance` (decimal 18,2) — which already exists — will represent **uninvested cash** for investment accounts. Total account value = `CurrentBalance + sum(holdings × currentPrice)`.

**Money flows:**
- External deposit → increases `CurrentBalance` (DEPOSIT transaction)
- Buy stock → decreases `CurrentBalance`, creates Holding + BUY transaction
- Sell stock → increases `CurrentBalance`, SELL transaction
- Transfer between accounts → decreases source `CurrentBalance`, increases destination `CurrentBalance`, paired WITHDRAWAL/DEPOSIT transactions linked via `LinkedTransactionId`

#### Sub-phase 6A: Backend — Replace $CASH with CurrentBalance

**Goal:** Remove all `$CASH` holding logic; use `Account.CurrentBalance` for cash operations.

**Changes:**

1. **AccountsController.PostAccount** — Remove $CASH holding creation + INITIAL_BALANCE transaction. `CurrentBalance` is already set from `createRequest.Balance` on line 165.

2. **AccountsController.UpdateBalance** — Remove $CASH holding lookup/update. Just update `CurrentBalance` directly. Create DEPOSIT/WITHDRAWAL transactions without `HoldingId` or `Symbol = "$CASH"`.

3. **AccountsController.TransitionToDetailed** — Remove $CASH holding deletion. Adjust balance validation: total = CurrentBalance + sum(new holdings).

4. **HoldingsController.CreateHolding** — Replace $CASH debit logic:
   - `FundingSource.CashBalance`: Debit `account.CurrentBalance -= purchaseAmount`. Create WITHDRAWAL transaction (no HoldingId).
   - `FundingSource.InternalTransfer`: Debit `sourceAccount.CurrentBalance`. Create paired WITHDRAWAL/DEPOSIT transactions.
   - Remove all `$CASH` symbol lookups.

5. **DashboardController.RefreshStalePricesAsync** — Stop overwriting `CurrentBalance` with `sum(holdings × price)`. Only update individual holding prices.

6. **DashboardController.GetSummary** — Compute total per account as `CurrentBalance + sum(holdings × price)` for display.

**Files changed:**
- `PFMP-API/Controllers/AccountsController.cs`
- `PFMP-API/Controllers/HoldingsController.cs`
- `PFMP-API/Controllers/DashboardController.cs`

##### Sub-phase 6B: Database Migration

**Goal:** Clean up existing $CASH data.

**SQL migration script:**
1. For each account: if $CASH holding exists, set `Account.CurrentBalance = $CASH.Quantity` (preserve cash balances)
2. Delete all transactions linked to $CASH holdings
3. Delete all $CASH holdings
4. User confirmed: OK to clear records and start fresh for user 20

##### Sub-phase 6C: Frontend — Cash Balance Display

**Goal:** Show uninvested cash as account-level info, not a holding.

**Changes:**
1. **AccountDetailView.tsx** — Show "Cash Balance: $X,XXX.XX" in the Holdings tab header
2. Remove `$CASH` filtering from holdings display and default selection (no more $CASH holdings to filter)
3. **AccountSummaryHeader** — Show total = `currentBalance + holdingsValue`

**Files changed:**
- `pfmp-frontend/src/views/dashboard/AccountDetailView.tsx`
- `pfmp-frontend/src/components/accounts/AccountSummaryHeader.tsx`

##### Sub-phase 6D: Transfer Funds Feature

**Goal:** Allow fund transfers between accounts with proper transaction trail.

**Backend:** New `POST /api/transactions/transfer` endpoint:
```json
{
  "fromAccountId": 159,
  "toAccountId": 160,
  "amount": 5000.00,
  "date": "2026-03-15",
  "description": "Fund IRA from brokerage"
}
```
- Creates paired WITHDRAWAL (source) + DEPOSIT (destination) transactions
- Links them via `LinkedTransactionId`
- Adjusts `CurrentBalance` on both accounts

**Frontend:** `TransferFundsDialog` component:
- From/To account dropdowns (filtered to user's accounts)
- Amount input, date picker, optional description
- "Transfer Funds" button on AccountDetailView action bar

**Files changed:**
- `PFMP-API/Controllers/TransactionsController.cs` — New transfer endpoint
- `pfmp-frontend/src/components/transfers/TransferFundsDialog.tsx` — New component
- `pfmp-frontend/src/views/dashboard/AccountDetailView.tsx` — Transfer button

##### Sub-phase 6E: Dashboard Total Includes Cash

**Goal:** Dashboard account cards and net worth show full value (cash + holdings).

**Changes:**
- `totalInvestments = investmentAccounts.Sum(a => a.CurrentBalance + holdingsValue)`
- Account card `balance` field = `CurrentBalance + sum(holdings × price)`
- Remove `$CASH` filter from stale price checker (no more $CASH to check)

##### Sub-phase 6F: Plaid Sync Cash Mapping

**Goal:** Map Plaid cash-equivalent holdings to `Account.CurrentBalance` instead of creating $CASH holdings.

**Changes in PlaidInvestmentsService:**
- `UpsertHoldingAsync`: If `security.IsCashEquivalent`, add value to `Account.CurrentBalance` instead of creating a Holding
- `UpsertInvestmentAccountAsync`: Set `CurrentBalance = Balances.Current - sum(non-cash holding values)` (the residual is cash)

##### Sub-phase 6G: Tests & Cleanup

**Backend tests:**
- Update `CreateHolding_ManualAccount_DebitsCashHolding` → test `Account.CurrentBalance` debit instead of $CASH
- Update `CreateHolding_CashSymbol_NoAutoTransaction` → remove or replace (no more $CASH concept)
- Add `TransferFunds_CreatesPairedTransactions` test
- Add `CreateAccount_SetsCurrentBalance_NoMoreCashHolding` test

**Frontend tests:**
- Update HoldingFormModal tests (no more $CASH references in funding source comments)

#### Acceptance Criteria

1. ✅ No `$CASH` holdings exist in the database or are created by any endpoint
2. ✅ `Account.CurrentBalance` represents uninvested cash for investment accounts
3. ✅ Creating a holding with `CashBalance` funding debits `Account.CurrentBalance`
4. ✅ Dashboard shows total = `CurrentBalance + holdings market value`
5. ✅ Transfer Funds dialog creates paired WITHDRAWAL/DEPOSIT transactions
6. ✅ Plaid cash-equivalent holdings map to `CurrentBalance`, not as holdings
7. ✅ All existing tests pass with $CASH logic removed


---

## Wave 9.3.7: Residual Polish

**Status:** ✅ Mostly Complete (April 23, 2026) — only E2E smoke remains.
**Priority:** Medium — feature work was complete; this finished deferred polish from Phases 2 and 6.
**Triggered by:** Phase 5/6 audit (April 2026). Re-audit during 9.3.7 work confirmed that the "deferred Phase 2 visualization items" listed in earlier revisions of this doc were in fact already shipped in `TransactionList.tsx` (filters, search, CSV export via `onExport`) and `BalanceTrendChart.tsx` (Recharts line chart). Only the items below were genuinely outstanding.

### Scope

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Recharts balance-trend visualization on cash account detail | ✅ Already shipped | `pfmp-frontend/src/components/cash-accounts/BalanceTrendChart.tsx` (Recharts), wired into `CashAccountDetailView` and `CashAccountDetail` |
| 2 | Advanced cash-transaction filtering UI (date range, type, search) | ✅ Already shipped | `TransactionList.tsx` already includes `DatePicker` start/end, type `Select`, search `TextField`, and a `Clear Filters` button toggled via `FilterList` icon |
| 3 | CSV export of cash transactions | ✅ Already shipped | `TransactionList` exposes `onExport(filteredTransactions)`; both detail views provide a CSV-emitting handler |
| 4 | `AccountDetailsCard` "Cash Balance" wording + APY surfacing | ✅ Done (this wave) | Header label now reads "Cash Balance" for cash accounts; new APY row renders when `interestRateApr > 0`; stale debug `console.log` removed. `AccountDetailsCard.test.tsx` (21 tests) still green. |
| 5 | `TransactionList.test.tsx` covering `onAdd` / `onEdit` / `refreshKey` | ✅ Done (this wave) | 3 new tests added (15 total, all passing): Add button visibility + click, row-click fires `onEdit` with row data, `refreshKey` change triggers refetch |
| 6 | E2E smoke: cash account → deposit → withdrawal → cross-account transfer → verify balances + audit | ⏳ Not started | Recommended next; Playwright config already in place. Tracked as the remaining 9.3.7 deliverable. |
| 7 | Doc refresh (`wave-9.3-next-steps.md`, `documentation-map.md`) | ⏳ Pending | Update to reflect 9.3.5 / 9.3.6 / 9.3.7 completion |

### Out of Scope

- Phase 3 (Investment view enhancements — performance metrics, tax insights, risk analysis) — schedule as Wave 9.4 if/when prioritized.
- Phase 4 (Loan & Credit Card views) — already largely done under Options A–D; remaining gaps are tracked in their own wave docs.
- Anything that would require new EF migrations, new endpoints, or new top-level UI surfaces — none of the residual polish items need either.

### Acceptance Criteria

1. ✅ Cash account detail balance-history tab renders a Recharts line chart over the existing `BalanceHistoryResponse` payload.
2. ✅ Cash transaction list supports filtering by date range, type, and free-text search using existing `GET /api/cash-accounts/{id}/transactions` query params.
3. ✅ "Export CSV" affordance on the cash transaction list passes filtered rows to a parent-supplied CSV handler.
4. ✅ `AccountDetailsCard` shows "Cash Balance" wording for cash account types and surfaces APY when present.
5. ✅ Vitest suite covers `onAdd` / `onEdit` / `refreshKey` behavior in `TransactionList.test.tsx`.
6. ⏳ Playwright E2E smoke covers cash CRUD + cross-account transfer in one run.
7. ⏳ `wave-9.3-next-steps.md` and `documentation-map.md` reflect the new completion state and link to this section.

### Estimated Effort

**Total remaining: ~3 hours** (E2E smoke + doc refresh). The original 11–15h estimate was reduced after audit confirmed items 1–3 were already shipped.
