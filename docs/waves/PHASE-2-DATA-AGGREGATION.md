# Phase 2: Data Aggregation & Account Connectivity

**Timeline:** December 2025 – January 2026  
**Status:** 🚧 IN PROGRESS (Starting November 2025)  
**Goal:** Populate dashboard with actual account balances, portfolio holdings, and transactions

---

## Strategic Approach

**Philosophy:** Start manual, build for automation

1. **Wave 8:** Manual data entry (CSV upload, manual account creation) ✅ **COMPLETE**
2. **Wave 9:** Holdings & positions management (individual securities tracking) ✅ **COMPLETE**
3. **Wave 10:** Background refresh jobs (daily valuation updates) ⏸️ **DEFERRED**
4. **Wave 11:** Bank account linking (Plaid integration) 📋 **PLANNED - January 2026**
5. **Wave 12:** Brokerage API integration (TD Ameritrade, E*TRADE, Schwab) 📋 **PLANNED - February 2026**
6. **Wave 13:** Crypto exchange integration (Coinbase, Binance, Kraken) 📋 **PLANNED - March 2026**

This approach allows immediate value delivery while building toward automated connectivity.

**Updated Timeline:** December 2025 – March 2026 (extended to support full account linking)

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

## Wave 11: Bank Account Linking (Plaid Integration)

**Duration:** 3-4 weeks  
**Status:** 📋 **PLANNED - January 2026**  
**Priority:** 🔥 **CRITICAL** - Highest user value, competitive parity

### 11.1: Overview & Strategic Importance

**User Impact:**
- **Without Plaid:** Users manually update balances weekly (high friction, stale data)
- **With Plaid:** Real-time balance sync across 12,000+ banks (automatic, always fresh)

**Business Value:**
- 5-minute onboarding (link 3-5 accounts automatically)
- 80%+ adoption rate (industry standard for fintech apps)
- Competitive parity with Mint, Personal Capital, Empower
- Foundation for automated transaction categorization (Wave 14)

**Supported Account Types:**
- Checking accounts (Chase, BofA, Wells Fargo, etc.)
- Savings accounts (high-yield online banks: Ally, Marcus, Discover)
- Money market accounts
- Certificates of Deposit (CDs)
- Health Savings Accounts (HSAs)

**Coverage:** 12,000+ US financial institutions via Plaid

---

### 11.2: Technical Architecture

#### Database Schema Extensions

**New Table: AccountConnections**
```sql
CREATE TABLE AccountConnections (
    ConnectionId SERIAL PRIMARY KEY,
    UserId INT NOT NULL REFERENCES Users(UserId),
    AccountId INT REFERENCES Accounts(AccountId),
    
    -- Connection source
    Source VARCHAR(50) NOT NULL, -- 'Plaid', 'TDAmeritrade', 'Binance', etc.
    
    -- Plaid-specific fields
    PlaidItemId VARCHAR(100),
    PlaidAccessToken TEXT, -- ENCRYPTED
    PlaidInstitutionId VARCHAR(100),
    PlaidInstitutionName VARCHAR(255),
    
    -- Connection metadata
    ConnectedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastSyncedAt TIMESTAMP,
    SyncStatus VARCHAR(20) NOT NULL DEFAULT 'Connected', -- Connected, Syncing, SyncFailed, Expired
    ErrorMessage TEXT,
    SyncFailureCount INT DEFAULT 0,
    
    CONSTRAINT fk_user FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_account FOREIGN KEY (AccountId) REFERENCES Accounts(AccountId) ON DELETE SET NULL
);

CREATE INDEX idx_connections_userid ON AccountConnections(UserId);
CREATE INDEX idx_connections_status ON AccountConnections(SyncStatus);
```

**Accounts Table Extensions**
```sql
ALTER TABLE Accounts ADD COLUMN Source VARCHAR(50) DEFAULT 'Manual';
-- Values: Manual, CSV, Plaid, TDAmeritrade, Binance, etc.

ALTER TABLE Accounts ADD COLUMN ExternalAccountId VARCHAR(100);
-- Plaid account_id or broker account_id

ALTER TABLE Accounts ADD COLUMN LastSyncedAt TIMESTAMP;
ALTER TABLE Accounts ADD COLUMN SyncStatus VARCHAR(20) DEFAULT 'NotConnected';
-- Values: NotConnected, Connected, Syncing, SyncFailed, Expired, Disconnected

ALTER TABLE Accounts ADD COLUMN AllowManualOverrides BOOLEAN DEFAULT TRUE;
-- Allow users to override synced balances
```

**New Table: SyncHistory**
```sql
CREATE TABLE SyncHistory (
    SyncHistoryId SERIAL PRIMARY KEY,
    ConnectionId INT NOT NULL REFERENCES AccountConnections(ConnectionId),
    SyncStartedAt TIMESTAMP NOT NULL,
    SyncCompletedAt TIMESTAMP,
    Status VARCHAR(20) NOT NULL,
    ErrorMessage TEXT,
    
    -- Sync results
    AccountsUpdated INT DEFAULT 0,
    TransactionsImported INT DEFAULT 0,
    OldBalance DECIMAL(18,2),
    NewBalance DECIMAL(18,2),
    
    -- Performance metrics
    DurationMs INT,
    
    CONSTRAINT fk_connection FOREIGN KEY (ConnectionId) REFERENCES AccountConnections(ConnectionId) ON DELETE CASCADE
);

CREATE INDEX idx_sync_history_connection ON SyncHistory(ConnectionId);
CREATE INDEX idx_sync_history_date ON SyncHistory(SyncStartedAt DESC);
```

#### Backend Service Architecture

**IAccountConnector Interface**
```csharp
public interface IAccountConnector
{
    // Connection lifecycle
    Task<ConnectionResult> InitiateConnectionAsync(int userId, ConnectionRequest request);
    Task<List<ExternalAccount>> FetchAccountsAsync(int connectionId);
    Task<bool> RefreshConnectionAsync(int connectionId);
    Task DisconnectAsync(int connectionId);
    
    // Data retrieval
    Task<List<ExternalTransaction>> FetchTransactionsAsync(int accountId, DateTime? since = null);
    Task<AccountBalance> GetBalanceAsync(int accountId);
    
    // Sync operations
    Task<SyncResult> SyncAccountAsync(int accountId);
    Task<SyncResult> SyncAllAccountsAsync(int userId);
    
    // Health checks
    Task<ConnectionHealth> CheckConnectionHealthAsync(int connectionId);
}
```

**PlaidConnector Implementation**
```csharp
public class PlaidConnector : IAccountConnector
{
    private readonly PlaidClient _client;
    private readonly ApplicationDbContext _db;
    private readonly CredentialEncryptionService _encryption;
    
    public async Task<ConnectionResult> InitiateConnectionAsync(int userId, ConnectionRequest request)
    {
        // 1. Exchange public_token for access_token
        var response = await _client.ItemPublicTokenExchangeAsync(new()
        {
            PublicToken = request.PublicToken
        });
        
        // 2. Store encrypted access_token
        var connection = new AccountConnection
        {
            UserId = userId,
            Source = "Plaid",
            PlaidAccessToken = _encryption.Encrypt(response.AccessToken),
            PlaidItemId = response.ItemId,
            ConnectedAt = DateTime.UtcNow,
            SyncStatus = SyncStatus.Connected
        };
        
        _db.AccountConnections.Add(connection);
        await _db.SaveChangesAsync();
        
        // 3. Fetch accounts immediately
        await FetchAccountsAsync(connection.ConnectionId);
        
        return new ConnectionResult { Success = true, ConnectionId = connection.ConnectionId };
    }
    
    public async Task<List<ExternalAccount>> FetchAccountsAsync(int connectionId)
    {
        // Fetch account list from Plaid
        // Create or update Account records
        // Map Plaid account types to PFMP AccountType enum
        // Store external account IDs for future syncs
    }
    
    public async Task<SyncResult> SyncAccountAsync(int accountId)
    {
        // Fetch latest balance from Plaid
        // Update Account.CurrentBalance
        // Update Account.LastSyncedAt
        // Log sync history
    }
}
```

**Background Sync Job (Hangfire)**
```csharp
public class PlaidSyncJob
{
    [AutomaticRetry(Attempts = 3)]
    public async Task SyncAllPlaidAccountsAsync()
    {
        var connections = await _db.AccountConnections
            .Where(c => c.Source == "Plaid" && c.SyncStatus == SyncStatus.Connected)
            .ToListAsync();
        
        foreach (var connection in connections)
        {
            try
            {
                await _plaidConnector.SyncAllAccountsAsync(connection.UserId);
                connection.LastSyncedAt = DateTime.UtcNow;
                connection.SyncFailureCount = 0;
            }
            catch (Exception ex)
            {
                connection.SyncStatus = SyncStatus.SyncFailed;
                connection.ErrorMessage = ex.Message;
                connection.SyncFailureCount++;
                
                if (connection.SyncFailureCount >= 5)
                {
                    connection.SyncStatus = SyncStatus.Expired;
                    // Send notification to user
                }
            }
        }
        
        await _db.SaveChangesAsync();
    }
}

// Schedule: Daily at 11 PM
RecurringJob.AddOrUpdate<PlaidSyncJob>(
    "sync-plaid-accounts",
    job => job.SyncAllPlaidAccountsAsync(),
    Cron.Daily(23, 0)
);
```

---

### 11.3: Frontend Integration

#### Plaid Link Component
```tsx
import { usePlaidLink } from 'react-plaid-link';

export const PlaidLinkButton: React.FC = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  
  // Fetch link token from backend
  useEffect(() => {
    const fetchLinkToken = async () => {
      const response = await apiClient.post('/api/plaid/create-link-token');
      setLinkToken(response.data.linkToken);
    };
    fetchLinkToken();
  }, []);
  
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      // Exchange public token for access token
      await apiClient.post('/api/plaid/exchange-token', { publicToken });
      
      // Refresh accounts list
      await refetchAccounts();
      
      showToast('Bank accounts linked successfully!');
    },
    onExit: (err, metadata) => {
      if (err) {
        console.error('Plaid Link error:', err);
        showToast('Failed to link bank accounts', 'error');
      }
    }
  });
  
  return (
    <Button
      variant="contained"
      onClick={() => open()}
      disabled={!ready}
      startIcon={<LinkIcon />}
    >
      Link Bank Account
    </Button>
  );
};
```

#### Account Card with Sync Status
```tsx
<AccountCard>
  <AccountName>{account.name}</AccountName>
  <Balance>{formatCurrency(account.balance)}</Balance>
  
  {account.source === 'Plaid' && (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SyncStatusBadge status={account.syncStatus}>
        {account.syncStatus === 'Connected' && (
          <>
            <CheckCircle fontSize="small" color="success" />
            Synced {formatRelativeTime(account.lastSyncedAt)}
          </>
        )}
        {account.syncStatus === 'SyncFailed' && (
          <>
            <Warning fontSize="small" color="warning" />
            Sync failed
          </>
        )}
        {account.syncStatus === 'Expired' && (
          <>
            <Lock fontSize="small" color="error" />
            Re-authenticate required
          </>
        )}
      </SyncStatusBadge>
      
      <IconButton size="small" onClick={() => handleSyncNow(account.id)}>
        <Refresh />
      </IconButton>
    </Box>
  )}
</AccountCard>
```

---

### 11.4: Security & Compliance

#### Credential Encryption
```csharp
public class CredentialEncryptionService
{
    private readonly byte[] _encryptionKey;
    
    public CredentialEncryptionService(IConfiguration config)
    {
        // In production: Use Azure Key Vault
        // In development: Use Data Protection API
        _encryptionKey = Convert.FromBase64String(
            config["Security:EncryptionKey"] ?? throw new Exception("Encryption key not configured")
        );
    }
    
    public string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _encryptionKey;
        aes.GenerateIV();
        
        using var encryptor = aes.CreateEncryptor();
        using var ms = new MemoryStream();
        
        ms.Write(aes.IV, 0, aes.IV.Length);
        
        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
        {
            sw.Write(plainText);
        }
        
        return Convert.ToBase64String(ms.ToArray());
    }
    
    public string Decrypt(string cipherText)
    {
        var fullCipher = Convert.FromBase64String(cipherText);
        
        using var aes = Aes.Create();
        aes.Key = _encryptionKey;
        
        var iv = new byte[aes.IV.Length];
        Array.Copy(fullCipher, 0, iv, 0, iv.Length);
        aes.IV = iv;
        
        using var decryptor = aes.CreateDecryptor();
        using var ms = new MemoryStream(fullCipher, iv.Length, fullCipher.Length - iv.Length);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        
        return sr.ReadToEnd();
    }
}
```

#### Plaid Webhooks (Balance Updates)
```csharp
[HttpPost("webhook")]
[AllowAnonymous]
public async Task<IActionResult> PlaidWebhook([FromBody] PlaidWebhookRequest request)
{
    // Verify webhook signature
    if (!VerifyPlaidSignature(request))
    {
        return Unauthorized();
    }
    
    switch (request.WebhookType)
    {
        case "TRANSACTIONS":
            await HandleTransactionWebhook(request);
            break;
        case "ITEM":
            await HandleItemWebhook(request);
            break;
        default:
            _logger.LogWarning("Unknown webhook type: {Type}", request.WebhookType);
            break;
    }
    
    return Ok();
}

private async Task HandleItemWebhook(PlaidWebhookRequest request)
{
    if (request.WebhookCode == "ERROR")
    {
        // Mark connection as expired, notify user
        var connection = await _db.AccountConnections
            .FirstOrDefaultAsync(c => c.PlaidItemId == request.ItemId);
        
        if (connection != null)
        {
            connection.SyncStatus = SyncStatus.Expired;
            connection.ErrorMessage = request.Error?.ErrorMessage;
            await _db.SaveChangesAsync();
            
            // Send notification to user
            await _notificationService.SendConnectionExpiredNotificationAsync(connection.UserId);
        }
    }
}
```

---

### 11.5: Implementation Tasks

#### Week 1: Database & Backend Foundation (5 days)
- [ ] Create Entity Framework models: `AccountConnection`, `SyncHistory`
- [ ] Add Source, ExternalAccountId, LastSyncedAt, SyncStatus fields to `Account` model
- [ ] Generate EF migration: `AddPlaidIntegration`
- [ ] Run migration against local database
- [ ] Implement `CredentialEncryptionService` with AES-256 encryption
- [ ] Install `Plaid.Net` NuGet package (v9.x)
- [ ] Configure Plaid credentials in `appsettings.Development.json` (sandbox mode)
- [ ] Define `IAccountConnector` interface
- [ ] Create DTOs: `ConnectionRequest`, `ExternalAccount`, `SyncResult`

#### Week 2: Plaid Service Implementation (5 days)
- [ ] Implement `PlaidConnector` class
  - [ ] `InitiateConnectionAsync` - Exchange public token for access token
  - [ ] `FetchAccountsAsync` - Retrieve account list from Plaid
  - [ ] `SyncAccountAsync` - Sync single account balance
  - [ ] `SyncAllAccountsAsync` - Sync all accounts for user
  - [ ] `DisconnectAsync` - Remove Plaid connection
- [ ] Create `PlaidController` with endpoints:
  - [ ] `POST /api/plaid/create-link-token` - Generate Plaid Link token
  - [ ] `POST /api/plaid/exchange-token` - Exchange public token
  - [ ] `GET /api/plaid/accounts` - List connected accounts
  - [ ] `POST /api/plaid/sync` - Trigger manual sync
  - [ ] `DELETE /api/plaid/disconnect/{connectionId}` - Remove connection
  - [ ] `POST /api/plaid/webhook` - Handle Plaid webhooks
- [ ] Implement `PlaidSyncJob` background job (Hangfire)
- [ ] Configure daily sync schedule (11 PM)

#### Week 3: Frontend Integration (5 days)
- [ ] Install `react-plaid-link` package (v3.x) - **Already installed**
- [ ] Create `PlaidLinkButton` component
- [ ] Create `ConnectAccountModal` with Plaid Link flow
- [ ] Add "Link Bank Account" button to `AccountsView`
- [ ] Update `AccountCard` component to show sync status badges
- [ ] Create `SyncStatusBadge` component (green/yellow/red indicators)
- [ ] Add "Sync now" button to account cards (Plaid accounts only)
- [ ] Create `SyncHistoryDrawer` component (show past sync results)
- [ ] Add "Disconnect" option to account menu
- [ ] Update `accountsApi.ts` with new Plaid endpoints

#### Week 4: Testing, Polish & Documentation (5 days)
- [ ] E2E testing with Plaid Sandbox
  - [ ] Link Chase Bank (sandbox)
  - [ ] Link Wells Fargo (sandbox)
  - [ ] Link Citibank (sandbox)
- [ ] Test sync job execution
  - [ ] Verify daily sync runs at 11 PM
  - [ ] Test manual sync trigger
  - [ ] Test sync failure retry logic
- [ ] Test webhook processing
  - [ ] Simulate balance update webhook
  - [ ] Simulate item error webhook (expired token)
- [ ] Error handling
  - [ ] Handle expired OAuth tokens (prompt re-authentication)
  - [ ] Handle sync failures (show error message, retry up to 5 times)
  - [ ] Handle rate limit errors (exponential backoff)
- [ ] Documentation
  - [ ] User guide: "How to link bank accounts"
  - [ ] Developer setup: Plaid sandbox credentials
  - [ ] Security documentation: Encryption, webhook verification
  - [ ] Cost analysis: Plaid pricing breakdown

**Estimated Time:** 3-4 weeks

---

### 11.6: Success Metrics

**Adoption:**
- ✅ 80%+ of new users link at least 1 bank account within first session
- ✅ Average of 2.5 linked accounts per user

**Reliability:**
- ✅ <5% sync failure rate (excluding user-caused errors like expired tokens)
- ✅ 95%+ of syncs complete in <10 seconds
- ✅ 99%+ uptime for Plaid webhook server

**Security:**
- ✅ Zero credential security incidents
- ✅ 100% of access tokens encrypted at rest
- ✅ All webhook signatures verified

**User Experience:**
- ✅ 90%+ user satisfaction with linked account UX (post-Wave 11 survey)
- ✅ <1% user-initiated disconnections (excluding expired tokens)

---

### 11.7: Cost Analysis

**Plaid Pricing (Production):**
- **Development (Sandbox):** FREE unlimited
- **Production (per connected account/month):**
  - Auth (balance only): $0.25
  - Transactions: $0.50
  - **Total per account:** $0.75/month (if using both Auth + Transactions)

**Example Cost Projections:**
- 100 users × 2 accounts each = 200 connections
- 200 connections × $0.75 = **$150/month**
- User subscription: $9.99/month
- Gross margin per user (Plaid costs only): $9.99 - $1.50 = **$8.49** (85% margin)

**Recommendation:** Start with Auth product only ($0.25/account), add Transactions in Wave 14

---

**See also:** [Wave 11+ Account Linking Strategy](./wave-11-account-linking-strategy.md) for comprehensive technical design.

---

## Wave 12: Brokerage API Integration

**Duration:** 4-5 weeks  
**Status:** 📋 **PLANNED - February 2026**  
**Priority:** ⚠️ **HIGH** - Core value for investment-focused users

### 12.1: Overview

**Supported Brokerages:**
- TD Ameritrade (OAuth + REST API, FREE)
- E*TRADE (OAuth + REST API, FREE)
- Charles Schwab (OAuth + REST API, FREE after TD Ameritrade acquisition)
- Plaid Investments (aggregated access to 15+ brokerages, $1.00/account/month)

**Data Retrieved:**
- Holdings (ticker, quantity, cost basis, current price, unrealized gain/loss)
- Transactions (trades, dividends, interest, fees, transfers)
- Account details (name, account number, type, tax treatment)
- Historical performance data

**Alternative Approach:**
- **Option A:** Direct API integrations (full control, lower cost, higher maintenance)
- **Option B:** Plaid Investments (covers 15+ brokerages, $1.00/account/month, faster to market)
- **Recommendation:** Start with Plaid Investments (Wave 12A), add direct integrations later (Wave 12B)

### 12.2: Implementation Plan

**Week 1-2: Plaid Investments Integration**
- Enable Plaid Investments product in dashboard
- Implement holdings sync (map Plaid holdings to PFMP Holdings table)
- Test with supported brokerages (Fidelity, Vanguard, Schwab, E*TRADE)

**Week 3-4: Direct Brokerage APIs**
- TD Ameritrade OAuth flow + holdings/transactions sync
- E*TRADE OAuth flow + holdings/transactions sync
- Schwab API integration

**Week 5: Testing & Polish**
- Test with real brokerage sandbox accounts
- Validate cost basis accuracy (compare to broker statements)
- Transaction deduplication testing
- Error handling (expired tokens, sync failures)

**See also:** [Wave 11+ Account Linking Strategy](./wave-11-account-linking-strategy.md) for detailed implementation.

---

## Wave 13: Cryptocurrency Exchange Integration

**Duration:** 3-4 weeks  
**Status:** 📋 **PLANNED - March 2026**  
**Priority:** 🟡 **MEDIUM** - Niche audience but high engagement

### 13.1: Overview

**Supported Exchanges:**
- Coinbase (API key + secret, FREE, read-only permissions)
- Binance (API key + secret, FREE, read-only permissions)
- Kraken (API key + secret, FREE, read-only permissions)
- Gemini (API key + secret, FREE, read-only permissions)

**Data Retrieved:**
- Holdings (ticker, quantity, average cost, current price, unrealized gain/loss)
- Transactions (trades, deposits, withdrawals, staking rewards, fees)
- Staking positions (locked assets, APY, reward frequency)
- Fiat on-ramps (USD deposits, withdrawals)

**Security Requirements:**
- **CRITICAL:** API keys must be READ-ONLY (no trading or withdrawal permissions)
- PFMP will validate key permissions on connection and reject keys with write access
- All API keys encrypted at rest using AES-256 + Azure Key Vault

### 13.2: Implementation Plan

**Week 1-2: Exchange APIs**
- Coinbase API integration (REST + WebSocket for real-time prices)
- Binance API integration (REST + WebSocket)
- Kraken API integration (REST + WebSocket)

**Week 3: Blockchain Integration (Optional)**
- Etherscan API for Ethereum wallet tracking (read-only, address-based)
- Bitcoin address tracking via Blockchain.com API

**Week 4: Testing & Polish**
- Test with demo API keys (exchange sandbox accounts)
- Validate staking position tracking
- DeFi position aggregation testing (if blockchain integration included)
- Error handling (invalid API keys, rate limits, network errors)

**See also:** [Wave 11+ Account Linking Strategy](./wave-11-account-linking-strategy.md) for detailed implementation.

---

## Phase 2 Exit Criteria

**Must Have:**
- ✅ Manual account creation from dashboard
- ✅ CSV import for accounts and holdings
- ✅ Holdings database with cost basis and current values
- ✅ Daily price updates from market data API (FMP)
- ✅ Asset allocation calculations
- ✅ Portfolio performance metrics (gain/loss)
- ✅ Type-specific account detail views (cash, investment)
- ✅ Manual refresh button functional
- ✅ Bank account linking via Plaid (Wave 11)
- ✅ Brokerage account linking via APIs or Plaid Investments (Wave 12)
- ✅ Crypto exchange linking via API keys (Wave 13)
- ✅ Background sync jobs running (Plaid daily sync, price updates)

**Should Have:**
- ✅ Transaction history tracking (Wave 9.3)
- ✅ Automated balance syncing (Wave 11-13)
- ✅ Dual-mode support (manual + linked accounts coexisting)
- ⚠️ Background jobs infrastructure (Hangfire) - **DEFERRED to Wave 11**
- ⚠️ Admin dashboard for monitoring jobs - **DEFERRED to Wave 11**

**Nice to Have:**
- ⏸️ Automated transaction categorization (Wave 14)
- ⏸️ Spending insights and analytics (Wave 14)
- ⏸️ Loan amortization calculators (Wave 9.3 Phase 4)
- ⏸️ Credit card spending breakdown (Wave 9.3 Phase 4)

**Success Metrics:**
- 80%+ of users link at least 1 account (Plaid, brokerage, or crypto)
- Average 3-5 linked accounts per user
- <5% sync failure rate across all connection types
- Dashboard shows accurate real-time net worth across all account types
- Manual and linked accounts display correctly with appropriate indicators
- Zero credential security incidents
- 90%+ user satisfaction with linked account UX

---

## Timeline & Milestones

**Phase 2 Extended Timeline:** December 2025 – March 2026 (4 months)

| Timeframe | Wave | Focus | Deliverables | Status |
|-----------|------|-------|--------------|--------|
| **Nov 2025** | Wave 9.3 | Account detail redesign | Cash account views, investment detail polish | ✅ **COMPLETE** |
| **Dec 2025** | Wave 10 | Background jobs (optional) | Hangfire setup, daily price updates | ⏸️ **DEFERRED** |
| **Jan 2026** | Wave 11 | Bank account linking | Plaid integration, balance syncing | 📋 **PLANNED** |
| **Feb 2026** | Wave 12 | Brokerage APIs | TD Ameritrade, E*TRADE, Schwab, Plaid Investments | 📋 **PLANNED** |
| **Mar 2026** | Wave 13 | Crypto exchanges | Coinbase, Binance, Kraken APIs | 📋 **PLANNED** |

**Target Completion:** End of March 2026

**Notes:**
- Wave 10 (Background Jobs) deferred until Wave 11 (Plaid requires Hangfire for sync jobs)
- Manual account entry remains fully functional throughout (dual-mode support)
- Users can mix manual and linked accounts freely

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
