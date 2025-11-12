# Wave 9.3: Account Detail View Redesign

**Date:** 2025-11-11  
**Status:** Planning  
**Priority:** High (blocks proper account management UX)

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
| Phase 1: Infrastructure | 1 week | Wave 9.2 (current) |
| Phase 2: Cash Accounts | 2 weeks | Wave 9.3 |
| Phase 3: Investment Enhancements | 2-3 weeks | Wave 9.4 |
| Phase 4: Loans & Credit | 3-4 weeks | Wave 9.5 |

**Total Estimated Time:** 8-10 weeks for complete implementation

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

### Future (3+ Months - Phase 4)
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
   - Transfers between accounts?
   - Shared liability accounts?
   - Joint accounts?

## References

- **Current Implementation:** `src/views/dashboard/AccountDetailView.tsx`
- **Account Model:** `PFMP-API/Models/Account.cs`
- **Holdings Model:** `PFMP-API/Models/Holding.cs`
- **Dashboard API:** `PFMP-API/Controllers/DashboardController.cs`
- **Wave 9.2 Complete:** `docs/waves/wave-9.2-complete.md`

---

**Next Action:** Implement Phase 1 fixes immediately to unblock testing, then proceed with Phase 2 planning and development.
