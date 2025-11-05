# Phase 2: Data Aggregation & Account Connectivity

**Timeline:** December 2025 – January 2026  
**Status:** 🚧 IN PROGRESS (Starting November 2025)  
**Goal:** Populate dashboard with actual account balances, portfolio holdings, and transactions

---

## Strategic Approach

**Philosophy:** Start manual, build for automation

1. **Wave 8:** Manual data entry (CSV upload, manual account creation)
2. **Wave 9:** Holdings & positions management (individual securities tracking)
3. **Wave 10:** Background refresh jobs (daily valuation updates)
4. **Wave 11:** API connectivity prep (Plaid/Yodlee abstraction layer)

This approach allows immediate value delivery while building toward automated connectivity.

---

## Wave 8: Manual Data Entry & Account Management

**Duration:** 2-3 weeks  
**Status:** 📋 NEXT

### Objectives
- Enable users to manually add detailed account information
- Support CSV import for bulk account/holding uploads
- Enhance existing account management beyond onboarding basics

### 8.1: Enhanced Account Management UI

**Current State:**
- Onboarding captures basic account info (name, type, balance)
- No post-onboarding account editing
- No detailed holdings entry

**Needed:**
- Account detail page (edit name, balance, institution, account number)
- "Add Account" flow from dashboard
- Account deletion with cascade rules
- Institution dropdown/autocomplete (common banks, brokerages)

**UI Components:**
```
/dashboard/accounts → AccountsView
  ├─ AccountList (existing)
  ├─ AccountDetailModal (NEW)
  │   ├─ Basic info (name, type, institution)
  │   ├─ Balance & last updated
  │   ├─ Holdings list (if investment account)
  │   └─ Transactions (Wave 9)
  └─ AddAccountModal (NEW)
```

**Tasks:**
- [x] Create `AccountDetailModal.tsx` for viewing/editing accounts
- [x] Add "Edit" button to each account card in `AccountsPanel.tsx`
- [x] Backend: Create `AccountUpdateRequest` DTO and update PUT endpoint
- [x] Wire modal to dashboard refresh functionality
- [ ] Create `AddAccountModal.tsx` for manual account creation
- [ ] Add "Add Account" button to `AccountsView.tsx`
- [ ] Backend: Update account endpoints to support full CRUD
- [ ] Test: Add, edit, delete accounts from dashboard

**Estimated Time:** 1 week
**Progress:** 50% complete (4/8 tasks done)

---

### 8.2: CSV Import for Accounts & Holdings

**Goal:** Bulk import accounts and holdings via CSV upload

**CSV Formats:**

**Accounts CSV:**
```csv
AccountName,Type,Institution,Balance,AccountNumber,LastSync
"Chase Checking",Checking,"Chase Bank",5420.50,****1234,2024-11-01
"Vanguard IRA",IRA,"Vanguard",125000.00,****5678,2024-11-01
"Fidelity 401k",401k,"Fidelity",250000.00,****9012,2024-11-01
```

**Holdings CSV (for investment accounts):**
```csv
AccountName,Ticker,SecurityName,Shares,CostBasis,CurrentPrice,CurrentValue,AssetClass
"Vanguard IRA",VTI,"Vanguard Total Stock Market",500,220.00,240.50,120250.00,US Stocks
"Vanguard IRA",BND,"Vanguard Total Bond Market",200,75.00,72.25,14450.00,Bonds
"Fidelity 401k",FXAIX,"Fidelity 500 Index",1000,145.00,165.30,165300.00,US Stocks
```

**Implementation:**

**Frontend:**
```tsx
// New component: CSVImportModal.tsx
- File upload (accept .csv)
- Preview table (show first 10 rows)
- Column mapping (auto-detect headers)
- Validation (check required fields)
- Import progress bar
- Error reporting (invalid rows)
```

**Backend:**
```csharp
// New controller: ImportController.cs
POST /api/import/accounts
POST /api/import/holdings
POST /api/import/transactions

// Service: CSVImportService.cs
- Parse CSV files
- Validate data (required fields, data types)
- Map to entities (Account, Holding, Transaction)
- Batch insert (use transactions for atomicity)
- Return import summary (success count, errors)
```

**Tasks:**
- [ ] Create `CSVImportModal.tsx` with file upload
- [ ] Add CSV parsing library (papaparse)
- [ ] Create `ImportController.cs` with upload endpoints
- [ ] Create `CSVImportService.cs` for parsing and validation
- [ ] Create database tables: `Holding`, `Transaction` (if not exist)
- [ ] Add "Import CSV" button to Accounts view
- [ ] Test: Upload sample CSVs, verify data in database
- [ ] Error handling: Invalid CSV format, duplicate accounts

**Estimated Time:** 1 week

---

### 8.3: Holdings Database Schema

**Current State:**
- `InvestmentAccounts` table exists (basic account info)
- No individual holdings tracking

**Needed Tables:**

```sql
CREATE TABLE Holdings (
    HoldingId SERIAL PRIMARY KEY,
    AccountId INT NOT NULL REFERENCES Accounts(AccountId) ON DELETE CASCADE,
    UserId INT NOT NULL REFERENCES Users(UserId),
    
    -- Security identification
    Ticker VARCHAR(20) NOT NULL,
    SecurityName VARCHAR(255) NOT NULL,
    SecurityType VARCHAR(50), -- Stock, Bond, ETF, MutualFund, Option, Cash
    AssetClass VARCHAR(50),    -- US Stocks, International Stocks, Bonds, Real Estate, Cash
    
    -- Position details
    Shares DECIMAL(18, 6) NOT NULL,
    CostBasis DECIMAL(18, 2),  -- Total cost basis (Shares * AvgCostPerShare)
    AvgCostPerShare DECIMAL(18, 6),
    
    -- Current valuation
    CurrentPrice DECIMAL(18, 6),
    CurrentValue DECIMAL(18, 2), -- Shares * CurrentPrice
    LastPriceUpdate TIMESTAMP,
    
    -- Metadata
    PurchaseDate DATE,
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_account_ticker UNIQUE(AccountId, Ticker)
);

CREATE INDEX idx_holdings_userid ON Holdings(UserId);
CREATE INDEX idx_holdings_accountid ON Holdings(AccountId);
CREATE INDEX idx_holdings_ticker ON Holdings(Ticker);
```

```sql
CREATE TABLE Transactions (
    TransactionId SERIAL PRIMARY KEY,
    AccountId INT NOT NULL REFERENCES Accounts(AccountId) ON DELETE CASCADE,
    UserId INT NOT NULL REFERENCES Users(UserId),
    HoldingId INT REFERENCES Holdings(HoldingId) ON DELETE SET NULL,
    
    -- Transaction details
    TransactionDate DATE NOT NULL,
    Type VARCHAR(50) NOT NULL, -- Buy, Sell, Dividend, Interest, Deposit, Withdrawal, Fee
    Ticker VARCHAR(20),
    Shares DECIMAL(18, 6),
    Price DECIMAL(18, 6),
    Amount DECIMAL(18, 2) NOT NULL, -- Net amount (positive = money in, negative = money out)
    Fee DECIMAL(18, 2),
    
    -- Categorization
    Category VARCHAR(100), -- For cash transactions
    Description VARCHAR(500),
    
    -- Metadata
    ImportSource VARCHAR(50), -- CSV, Plaid, Manual
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transactions_userid (UserId),
    INDEX idx_transactions_accountid (AccountId),
    INDEX idx_transactions_date (TransactionDate DESC)
);
```

**Tasks:**
- [ ] Create Entity Framework models: `Holding.cs`, `Transaction.cs`
- [ ] Generate migration: `AddHoldingsAndTransactions`
- [ ] Update `ApplicationDbContext.cs` with new DbSets
- [ ] Run migration against local database
- [ ] Seed test data (demo holdings for existing accounts)

**Estimated Time:** 2-3 days

---

## Wave 9: Holdings Management & Valuation

**Duration:** 2-3 weeks  
**Status:** 📋 PLANNED

### 9.1: Holdings Display & Management

**UI Components:**

```
/dashboard/accounts/{accountId} → AccountDetailView
  ├─ Account summary (name, balance, institution)
  ├─ Holdings table
  │   ├─ Ticker, Name, Shares, Cost Basis, Current Value, Gain/Loss
  │   ├─ Sort by: Value, Gain%, Ticker
  │   ├─ Asset class breakdown (pie chart)
  │   └─ Action: Add Holding, Edit Holding, Delete Holding
  └─ Transactions tab
      ├─ Transaction history (date, type, amount)
      ├─ Filter by: Type, Date range
      └─ Action: Add Transaction
```

**Backend Endpoints:**
```csharp
GET  /api/accounts/{id}/holdings       // List all holdings for account
GET  /api/holdings/{id}                 // Get holding details
POST /api/holdings                      // Create new holding
PUT  /api/holdings/{id}                 // Update holding
DELETE /api/holdings/{id}               // Delete holding

GET  /api/accounts/{id}/allocation      // Asset allocation breakdown
GET  /api/accounts/{id}/performance     // Account performance metrics
```

**Tasks:**
- [ ] Create `AccountDetailView.tsx` with holdings table
- [ ] Create `HoldingFormModal.tsx` for add/edit
- [ ] Create `HoldingsController.cs` with CRUD endpoints
- [ ] Create `HoldingsService.cs` for business logic
- [ ] Add asset allocation pie chart
- [ ] Calculate unrealized gain/loss
- [ ] Test: Add, edit, delete holdings

**Estimated Time:** 1 week

---

### 9.2: Market Data Integration

**Goal:** Fetch current prices for holdings to calculate valuations

**Options:**

**Option A: Alpha Vantage (Free tier)**
- 25 API calls/day
- Real-time and historical stock prices
- Free tier sufficient for <10 users

**Option B: Yahoo Finance API (via yfinance library)**
- Unofficial but widely used
- Free, no rate limits
- Less reliable for production

**Option C: IEX Cloud (Paid)**
- $9/month for 50K messages
- Production-grade reliability
- Real-time quotes

**Recommendation:** Start with **Yahoo Finance** for development, switch to **IEX Cloud** or **Alpha Vantage** for production.

**Implementation:**

```csharp
// Service: MarketDataService.cs
public interface IMarketDataService
{
    Task<decimal?> GetCurrentPriceAsync(string ticker);
    Task<Dictionary<string, decimal>> GetBatchPricesAsync(IEnumerable<string> tickers);
    Task<MarketQuote> GetQuoteAsync(string ticker);
}

public class YahooFinanceService : IMarketDataService
{
    public async Task<decimal?> GetCurrentPriceAsync(string ticker)
    {
        // Call Yahoo Finance API
        // Parse response
        // Return current price
    }
}

// Background job: PriceUpdateJob.cs
public class PriceUpdateJob
{
    public async Task UpdateAllHoldingPricesAsync()
    {
        // Get all unique tickers from Holdings
        // Fetch batch prices from market data service
        // Update Holdings.CurrentPrice and CurrentValue
        // Log update timestamp
    }
}
```

**Tasks:**
- [ ] Create `IMarketDataService.cs` interface
- [ ] Implement `YahooFinanceService.cs`
- [ ] Create `PriceUpdateJob.cs` background service
- [ ] Schedule daily price updates (Hangfire or Quartz)
- [ ] Add "Refresh Prices" button to holdings view
- [ ] Handle market holidays (no updates on weekends/holidays)
- [ ] Error handling: Invalid ticker, API rate limits

**Estimated Time:** 1 week

---

### 9.3: Portfolio Analytics

**Calculations Needed:**

1. **Asset Allocation**
   - % Stocks, % Bonds, % Cash, % Other
   - US vs International
   - By account and across all accounts

2. **Performance Metrics**
   - Total gain/loss (dollars and %)
   - Unrealized gain/loss per holding
   - Cost basis vs current value

3. **Diversification**
   - Number of holdings
   - Concentration risk (largest position %)
   - Sector exposure (if available)

**Backend Service:**

```csharp
public class PortfolioAnalyticsService
{
    public async Task<AssetAllocation> GetAssetAllocationAsync(int userId)
    {
        // Aggregate holdings by AssetClass
        // Calculate percentages
        // Return breakdown
    }
    
    public async Task<PortfolioPerformance> GetPerformanceAsync(int userId)
    {
        // Sum cost basis across all holdings
        // Sum current value across all holdings
        // Calculate total gain/loss
        // Calculate percentage return
    }
    
    public async Task<DiversificationMetrics> GetDiversificationAsync(int userId)
    {
        // Count unique holdings
        // Find largest position
        // Calculate concentration percentage
    }
}
```

**Tasks:**
- [ ] Create `PortfolioAnalyticsService.cs`
- [ ] Add analytics endpoints to `AccountsController.cs`
- [ ] Create `PortfolioSummaryPanel.tsx` on dashboard
- [ ] Add asset allocation pie chart
- [ ] Display total gain/loss with color coding
- [ ] Test: Verify calculations with known portfolios

**Estimated Time:** 3-4 days

---

## Wave 10: Background Refresh & Automation

**Duration:** 1-2 weeks  
**Status:** 📋 PLANNED

### 10.1: Daily Data Refresh Job

**Hangfire Implementation:**

```csharp
// Startup configuration
services.AddHangfire(config => config.UsePostgreSqlStorage(connectionString));
services.AddHangfireServer();

// Recurring jobs
RecurringJob.AddOrUpdate<PriceUpdateJob>(
    "update-holding-prices",
    job => job.UpdateAllHoldingPricesAsync(),
    Cron.Daily(23, 0) // 11 PM daily
);

RecurringJob.AddOrUpdate<NetWorthCalculationJob>(
    "calculate-net-worth",
    job => job.RecalculateAllUsersAsync(),
    Cron.Hourly() // Every hour
);
```

**Jobs to Implement:**
1. **PriceUpdateJob** - Update holding prices from market data
2. **NetWorthCalculationJob** - Recalculate user net worth
3. **StalenessCheckJob** - Flag accounts not synced in 7+ days
4. **PerformanceTrackingJob** - Track daily portfolio snapshots

**Tasks:**
- [ ] Install Hangfire package
- [ ] Configure Hangfire with PostgreSQL
- [ ] Create `PriceUpdateJob.cs`
- [ ] Create `NetWorthCalculationJob.cs`
- [ ] Create `/dashboard/jobs` admin page to monitor
- [ ] Test: Verify jobs run on schedule
- [ ] Error handling: Job failures, retries

**Estimated Time:** 1 week

---

### 10.2: Manual Refresh Flow

**Requirements:**
- "Refresh" button on dashboard and account pages
- Fetch latest prices for holdings
- Recalculate balances and net worth
- Update "last refreshed" timestamp
- Show loading spinner during refresh
- Display success/error toast

**Implementation:**

```csharp
POST /api/accounts/refresh
POST /api/accounts/{id}/refresh

public class AccountRefreshService
{
    public async Task<RefreshResult> RefreshAccountAsync(int accountId)
    {
        // Get account holdings
        // Fetch current prices
        // Update holding values
        // Recalculate account balance
        // Update LastSync timestamp
        // Return summary
    }
}
```

**Frontend:**
```tsx
const handleRefresh = async () => {
  setRefreshing(true);
  try {
    await refreshAccount(accountId);
    showToast('Account refreshed successfully');
    refetchData();
  } catch (error) {
    showToast('Refresh failed', 'error');
  } finally {
    setRefreshing(false);
  }
};
```

**Tasks:**
- [ ] Create refresh endpoints
- [ ] Add "Refresh" button to dashboard
- [ ] Add "Refresh" button to account detail pages
- [ ] Show loading state during refresh
- [ ] Update timestamps after refresh
- [ ] Test: Refresh with stale prices

**Estimated Time:** 2-3 days

---

## Wave 11: API Connectivity Prep

**Duration:** 2-3 weeks  
**Status:** 📋 PLANNED (Deferred to Phase 2 end)

### 11.1: Account Connection Abstraction Layer

**Goal:** Prepare architecture for Plaid/Yodlee without implementing full integration

**Interface Design:**

```csharp
public interface IAccountConnector
{
    Task<ConnectionResult> InitiateConnectionAsync(int userId, string institutionId);
    Task<List<ExternalAccount>> FetchAccountsAsync(string accessToken);
    Task<List<Transaction>> FetchTransactionsAsync(string accessToken, DateTime since);
    Task<bool> RefreshConnectionAsync(string accessToken);
}

// Implementations (to be built later)
public class PlaidConnector : IAccountConnector { }
public class YodleeConnector : IAccountConnector { }
public class ManualConnector : IAccountConnector { } // What we use now
```

**Tasks:**
- [ ] Define `IAccountConnector` interface
- [ ] Create `ManualConnector.cs` (for manual entry)
- [ ] Add `ConnectionType` field to Accounts table
- [ ] Document Plaid/Yodlee integration requirements
- [ ] Create placeholder for future implementation

**Estimated Time:** 3-4 days

---

## Phase 2 Exit Criteria

**Must Have:**
- ✅ Manual account creation from dashboard
- ✅ CSV import for accounts and holdings
- ✅ Holdings database with cost basis and current values
- ✅ Daily price updates from market data API
- ✅ Asset allocation calculations
- ✅ Portfolio performance metrics (gain/loss)
- ✅ Manual refresh button functional
- ✅ Background jobs running (price updates, net worth calc)

**Should Have:**
- ⚠️ Transaction history tracking
- ⚠️ Account connection abstraction layer
- ⚠️ Admin dashboard for monitoring jobs

**Nice to Have:**
- ❌ Plaid/Yodlee integration (deferred to future phase)
- ❌ Automated transaction categorization
- ❌ Spending insights

**Success Metrics:**
- Demo users have 5+ accounts with realistic holdings
- Dashboard shows accurate net worth across all accounts
- Holdings update daily with current prices
- Users can add/edit/delete accounts and holdings
- Background refresh completes in <30 seconds per user

---

## Timeline & Milestones

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1-2 | Wave 8.1-8.2 | Account management UI, CSV import |
| 2-3 | Wave 8.3-9.1 | Holdings schema, holdings display |
| 3-4 | Wave 9.2-9.3 | Market data integration, analytics |
| 5-6 | Wave 10 | Background jobs, refresh flows |
| 7-8 | Wave 11 (optional) | API connector abstraction |

**Target Completion:** End of January 2026

---

## Next Immediate Steps

### Starting Wave 8.1: Enhanced Account Management

**Task 1: Create AccountDetailModal component**
1. Design modal UI (MUI Dialog)
2. Add fields: Name, Type, Institution, Balance, Account Number
3. Add Save/Cancel buttons
4. Wire up to backend API

**Task 2: Add Edit functionality to AccountsPanel**
1. Add "Edit" IconButton to each account card
2. Open AccountDetailModal on click
3. Pass account data to modal
4. Refresh list after save

**Task 3: Backend account update endpoint**
1. Add PUT endpoint to `AccountsController.cs`
2. Validate input (required fields, valid types)
3. Update database record
4. Return updated account

Let's start with **Task 1: Create AccountDetailModal**!
