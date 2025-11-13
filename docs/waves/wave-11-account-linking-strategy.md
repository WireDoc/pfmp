# Wave 11+: External Account Linking Strategy

**Created:** November 12, 2025  
**Author:** Development Team  
**Status:** 🎯 PLANNING - Critical Phase 2 Feature  
**Timeline:** Wave 11 (January 2026), Wave 12-13 (February-March 2026)

---

## Executive Summary

PFMP will support **both manual and linked accounts** to maximize flexibility and user value:

- **Manual accounts:** User enters data through UI or CSV import (current implementation)
- **Linked accounts:** Automated sync via Plaid (banks), brokerage APIs (investments), crypto exchange APIs (digital assets)

**Key Principle:** Manual and linked accounts coexist seamlessly. Users can:
1. Start with manual entry for immediate value
2. Link accounts progressively (one at a time)
3. Override linked data with manual adjustments when needed
4. Mix account types freely (some manual, some linked)

---

## Problem Statement

### Current State (Wave 9.3)
- ✅ Manual account creation fully functional
- ✅ CSV import for bulk account/holding uploads
- ✅ Type-specific detail views (cash, investment, loan, credit)
- ✅ Holdings management with cost basis tracking
- ✅ Market data integration (FMP API for stock prices)

### Gaps
- ❌ No automated bank account syncing
- ❌ No brokerage API integration (TD Ameritrade, E*TRADE, Schwab, Fidelity)
- ❌ No crypto exchange integration (Coinbase, Binance, Kraken)
- ❌ No automated transaction imports
- ❌ Users must manually update balances and holdings
- ❌ Risk of stale data and missed opportunities

### User Impact
**Without linked accounts:**
- High friction to onboard (30+ minutes of manual entry)
- Stale data leads to poor advice quality
- Users abandon platform before seeing value
- Competitive disadvantage vs Mint, Personal Capital, Empower

**With linked accounts:**
- 5-minute onboarding (link 3-5 accounts automatically)
- Always-fresh data enables real-time insights
- Automated transaction categorization
- Competitive parity with market leaders

---

## Strategic Approach: 3-Wave Rollout

### Wave 11: Bank Account Linking (Plaid)
**Timeline:** January 2026 (3-4 weeks)  
**Priority:** 🔥 CRITICAL - Highest user value, lowest complexity

**Scope:**
- Plaid Link integration for checking/savings accounts
- OAuth flow for bank authentication
- Automated balance syncing (daily)
- Transaction history imports (90 days back)
- Real-time balance updates via webhooks

**Supported Account Types:**
- Checking accounts
- Savings accounts (high-yield, traditional)
- Money market accounts
- Certificates of Deposit (CDs)
- Health Savings Accounts (HSAs)

**Supported Institutions (Plaid covers 12,000+):**
- Major banks: Chase, Bank of America, Wells Fargo, Citi, US Bank
- Credit unions: Navy Federal, USAA, PenFed
- Online banks: Ally, Marcus, Discover, Capital One 360, American Express Savings

**Technology Stack:**
- **Frontend:** `react-plaid-link` (v3.x) - already installed in package.json
- **Backend:** `plaid-dotnet` (v9.x) - NuGet package for .NET 9
- **Auth Flow:** OAuth 2.0 via Plaid Link web component
- **Webhook Server:** .NET minimal API endpoint for balance updates

---

### Wave 12: Brokerage API Integration
**Timeline:** February 2026 (4-5 weeks)  
**Priority:** ⚠️ HIGH - Core value for investment-focused users

**Scope:**
- TD Ameritrade API integration (OAuth + REST)
- E*TRADE API integration (OAuth + REST)
- Schwab API integration (OAuth + REST)
- Fidelity API integration (eMoney API or ByAllAccounts aggregator)
- Automated holdings sync (daily)
- Transaction history (buys, sells, dividends, fees)
- Cost basis tracking with wash sale adjustments

**Supported Account Types:**
- Individual brokerage accounts
- Joint brokerage accounts
- Traditional IRAs
- Roth IRAs
- SEP IRAs
- 401(k) accounts (if broker supports API access)

**Data Retrieved:**
- Holdings (ticker, quantity, cost basis, current price, unrealized gain/loss)
- Transactions (trades, dividends, interest, fees, transfers)
- Account details (name, account number, type, tax treatment)
- Historical performance data

**Technical Challenges:**
1. **Multiple API protocols:** Each broker has different REST/OAuth implementation
2. **Rate limits:** TD Ameritrade (120 req/min), E*TRADE (varies), Schwab (TBD)
3. **Cost basis complexity:** FIFO, LIFO, SpecID, wash sales
4. **Symbol normalization:** Options formats vary (e.g., AAPL250117C00150000 vs OCC format)

**Alternative Approach: Data Aggregation Service**
- **Option A:** Build direct integrations (full control, lower cost, higher maintenance)
- **Option B:** Use Plaid Investments (covers 15+ brokerages, $0.50-$1.00/user/month)
- **Option C:** Use ByAllAccounts/Yodlee (enterprise-grade, $2-$5/user/month)
- **Recommendation:** Start with Plaid Investments (Wave 12A), add direct integrations later (Wave 12B)

---

### Wave 13: Cryptocurrency Exchange Integration
**Timeline:** March 2026 (3-4 weeks)  
**Priority:** 🟡 MEDIUM - Niche audience but high engagement

**Scope:**
- Coinbase API integration (API key + secret)
- Binance API integration (API key + secret)
- Kraken API integration (API key + secret)
- Gemini API integration (API key + secret)
- Automated crypto holdings sync (daily)
- Transaction history (buys, sells, trades, staking rewards, fees)
- Multi-currency support (USD, BTC, ETH, USDT, etc.)

**Supported Account Types:**
- Cryptocurrency exchange accounts (hot wallets)
- Cold wallet integration (read-only, address-based tracking)
- DeFi wallet tracking (MetaMask, Ledger via blockchain APIs)

**Data Retrieved:**
- Holdings (ticker, quantity, average cost, current price, unrealized gain/loss)
- Transactions (trades, deposits, withdrawals, staking rewards, fees)
- Staking positions (locked assets, APY, reward frequency)
- Fiat on-ramps (USD deposits, withdrawals)

**Technical Challenges:**
1. **Security:** API keys grant trading permissions (DANGER: read-only keys only)
2. **Rate limits:** Coinbase (10 req/sec), Binance (1200 req/min), Kraken (varies)
3. **Price volatility:** Real-time price updates needed for accurate net worth
4. **Tax reporting:** Complex cost basis calculations (FIFO, LIFO, SpecID, like-kind trades before 2018)
5. **Blockchain integration:** On-chain data requires Etherscan/Blockchair APIs

**Crypto-Specific Features:**
- **Staking dashboard:** Track locked assets, rewards earned, APY
- **DeFi position tracking:** Liquidity pool positions, yield farming, lending
- **Tax loss harvesting:** Crypto-specific (30-day wash sale rule doesn't apply to crypto... yet)
- **Wallet aggregation:** Combine exchange + cold wallet + DeFi for total crypto net worth

---

## Architecture Design

### 1. Data Model Extensions

#### Accounts Table (Existing + New Fields)
```csharp
public class Account
{
    // Existing fields
    public int AccountId { get; set; }
    public int UserId { get; set; }
    public string AccountName { get; set; }
    public AccountType AccountType { get; set; }
    public decimal CurrentBalance { get; set; }

    // NEW: Connection tracking
    public AccountSource Source { get; set; } = AccountSource.Manual;
    public string? ExternalAccountId { get; set; } // Plaid account_id or broker account_id
    public string? AccessToken { get; set; } // Encrypted Plaid access_token or API key
    public DateTime? LastSyncedAt { get; set; }
    public SyncStatus SyncStatus { get; set; } = SyncStatus.NotConnected;
    public string? SyncErrorMessage { get; set; }
    public bool AllowManualOverrides { get; set; } = true; // User can override synced data

    // API-specific fields (EXISTING)
    public bool HasAPIIntegration { get; set; } = false;
    public string? APIProvider { get; set; } // "Plaid", "TDAmeritrade", "Binance", etc.
    public bool IsAPIConnected { get; set; } = false;
    public DateTime? LastAPISync { get; set; }
    public string? APIConnectionStatus { get; set; }
}

public enum AccountSource
{
    Manual = 0,           // User-entered
    CSV = 1,              // Imported via CSV
    Plaid = 2,            // Plaid bank connection
    TDAmeritrade = 3,     // TD Ameritrade API
    ETrade = 4,           // E*TRADE API
    Schwab = 5,           // Charles Schwab API
    Fidelity = 6,         // Fidelity API
    BinanceAPI = 7,       // Binance crypto exchange
    CoinbaseAPI = 8,      // Coinbase crypto exchange
    KrakenAPI = 9,        // Kraken crypto exchange
    GeminiAPI = 10,       // Gemini crypto exchange
    PlaidInvestments = 11 // Plaid Investments (aggregated brokerage)
}

public enum SyncStatus
{
    NotConnected = 0,     // Manual account (no API)
    Connected = 1,        // Active connection
    Syncing = 2,          // Sync in progress
    SyncFailed = 3,       // Last sync failed (show error)
    Expired = 4,          // OAuth token expired (re-auth required)
    Disconnected = 5      // User disconnected (intentional)
}
```

#### New Table: AccountConnections
```csharp
public class AccountConnection
{
    public int ConnectionId { get; set; }
    public int UserId { get; set; }
    public int? AccountId { get; set; } // Nullable: connection may create multiple accounts
    public AccountSource Source { get; set; }
    
    // Plaid-specific
    public string? PlaidItemId { get; set; }
    public string? PlaidAccessToken { get; set; } // ENCRYPTED
    public string? PlaidInstitutionId { get; set; }
    public string? PlaidInstitutionName { get; set; }
    
    // Brokerage API-specific
    public string? BrokerageApiKey { get; set; } // ENCRYPTED
    public string? BrokerageApiSecret { get; set; } // ENCRYPTED
    public string? BrokerageOAuthToken { get; set; } // ENCRYPTED
    public DateTime? BrokerageOAuthExpiry { get; set; }
    
    // Crypto exchange-specific
    public string? CryptoApiKey { get; set; } // ENCRYPTED (read-only permissions only)
    public string? CryptoApiSecret { get; set; } // ENCRYPTED
    public string? CryptoApiPassphrase { get; set; } // ENCRYPTED (Coinbase Pro)
    
    // Connection metadata
    public DateTime ConnectedAt { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public SyncStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public int SyncFailureCount { get; set; } = 0;
    
    // Foreign keys
    public User User { get; set; } = null!;
    public Account? Account { get; set; }
}
```

#### New Table: SyncHistory
```csharp
public class SyncHistory
{
    public int SyncHistoryId { get; set; }
    public int ConnectionId { get; set; }
    public DateTime SyncStartedAt { get; set; }
    public DateTime? SyncCompletedAt { get; set; }
    public SyncStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    
    // Sync results
    public int AccountsUpdated { get; set; } = 0;
    public int HoldingsUpdated { get; set; } = 0;
    public int TransactionsImported { get; set; } = 0;
    public decimal? OldBalance { get; set; }
    public decimal? NewBalance { get; set; }
    public string? SyncDetails { get; set; } // JSON with detailed changes
    
    // Performance metrics
    public int DurationMs { get; set; }
    public string? ApiCallsInfo { get; set; } // Track rate limit usage
    
    // Foreign key
    public AccountConnection Connection { get; set; } = null!;
}
```

---

### 2. Service Layer Architecture

#### IAccountConnector Interface
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
    Task<List<ExternalHolding>> FetchHoldingsAsync(int accountId);
    Task<AccountBalance> GetBalanceAsync(int accountId);
    
    // Sync operations
    Task<SyncResult> SyncAccountAsync(int accountId);
    Task<SyncResult> SyncAllAccountsAsync(int userId);
    
    // Health checks
    Task<ConnectionHealth> CheckConnectionHealthAsync(int connectionId);
}

// DTOs
public class ConnectionRequest
{
    public AccountSource Source { get; set; }
    public string? PublicToken { get; set; } // Plaid
    public string? ApiKey { get; set; } // Brokerage/Crypto
    public string? ApiSecret { get; set; } // Brokerage/Crypto
    public string? OAuthCode { get; set; } // Brokerage OAuth
}

public class ExternalAccount
{
    public string ExternalId { get; set; }
    public string Name { get; set; }
    public AccountType Type { get; set; }
    public string? Institution { get; set; }
    public string? Mask { get; set; } // Last 4 digits
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "USD";
}

public class SyncResult
{
    public bool Success { get; set; }
    public DateTime SyncedAt { get; set; }
    public int AccountsUpdated { get; set; }
    public int HoldingsUpdated { get; set; }
    public int TransactionsImported { get; set; }
    public string? ErrorMessage { get; set; }
}
```

#### Implementations

**PlaidConnector** (Wave 11)
```csharp
public class PlaidConnector : IAccountConnector
{
    private readonly PlaidClient _client;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<PlaidConnector> _logger;
    
    public async Task<ConnectionResult> InitiateConnectionAsync(int userId, ConnectionRequest request)
    {
        // Exchange public_token for access_token
        var response = await _client.ItemPublicTokenExchangeAsync(new()
        {
            PublicToken = request.PublicToken
        });
        
        // Store encrypted access_token
        var connection = new AccountConnection
        {
            UserId = userId,
            Source = AccountSource.Plaid,
            PlaidAccessToken = EncryptToken(response.AccessToken),
            PlaidItemId = response.ItemId,
            ConnectedAt = DateTime.UtcNow,
            Status = SyncStatus.Connected
        };
        
        _db.AccountConnections.Add(connection);
        await _db.SaveChangesAsync();
        
        // Fetch accounts immediately
        await FetchAccountsAsync(connection.ConnectionId);
        
        return new ConnectionResult { Success = true, ConnectionId = connection.ConnectionId };
    }
    
    public async Task<List<ExternalAccount>> FetchAccountsAsync(int connectionId)
    {
        var connection = await _db.AccountConnections.FindAsync(connectionId);
        var accessToken = DecryptToken(connection.PlaidAccessToken);
        
        var response = await _client.AccountsGetAsync(new()
        {
            AccessToken = accessToken
        });
        
        var accounts = response.Accounts.Select(a => new ExternalAccount
        {
            ExternalId = a.AccountId,
            Name = a.Name,
            Type = MapPlaidAccountType(a.Type),
            Institution = connection.PlaidInstitutionName,
            Mask = a.Mask,
            Balance = (decimal)a.Balances.Current
        }).ToList();
        
        // Create or update Account records
        foreach (var extAccount in accounts)
        {
            var account = await _db.Accounts.FirstOrDefaultAsync(a => 
                a.UserId == connection.UserId && 
                a.ExternalAccountId == extAccount.ExternalId);
            
            if (account == null)
            {
                // Create new account
                account = new Account
                {
                    UserId = connection.UserId,
                    AccountName = extAccount.Name,
                    AccountType = extAccount.Type,
                    Source = AccountSource.Plaid,
                    ExternalAccountId = extAccount.ExternalId,
                    Institution = extAccount.Institution,
                    AccountNumber = extAccount.Mask,
                    CurrentBalance = extAccount.Balance,
                    LastSyncedAt = DateTime.UtcNow,
                    SyncStatus = SyncStatus.Connected
                };
                _db.Accounts.Add(account);
            }
            else
            {
                // Update existing account
                account.CurrentBalance = extAccount.Balance;
                account.LastSyncedAt = DateTime.UtcNow;
                account.SyncStatus = SyncStatus.Connected;
            }
        }
        
        await _db.SaveChangesAsync();
        return accounts;
    }
    
    // Implement other interface methods...
}
```

**TDAmeritradeConnector** (Wave 12)
```csharp
public class TDAmeritradeConnector : IAccountConnector
{
    private readonly HttpClient _httpClient;
    private readonly ApplicationDbContext _db;
    
    public async Task<List<ExternalHolding>> FetchHoldingsAsync(int accountId)
    {
        var account = await _db.Accounts.FindAsync(accountId);
        var connection = await _db.AccountConnections.FirstAsync(c => 
            c.UserId == account.UserId && c.Source == AccountSource.TDAmeritrade);
        
        var token = DecryptToken(connection.BrokerageOAuthToken);
        
        var response = await _httpClient.GetAsync(
            $"https://api.tdameritrade.com/v1/accounts/{account.ExternalAccountId}?fields=positions",
            new() { Authorization = new("Bearer", token) }
        );
        
        var data = await response.Content.ReadFromJsonAsync<TDAccountResponse>();
        
        return data.SecuritiesAccount.Positions.Select(p => new ExternalHolding
        {
            Symbol = p.Instrument.Symbol,
            Quantity = (decimal)p.LongQuantity,
            CostBasis = (decimal)p.AverageCost * (decimal)p.LongQuantity,
            CurrentPrice = (decimal)p.MarketValue / (decimal)p.LongQuantity,
            CurrentValue = (decimal)p.MarketValue
        }).ToList();
    }
}
```

**BinanceConnector** (Wave 13)
```csharp
public class BinanceConnector : IAccountConnector
{
    private readonly BinanceClient _client; // Use Binance.Net NuGet package
    private readonly ApplicationDbContext _db;
    
    public async Task<List<ExternalHolding>> FetchHoldingsAsync(int accountId)
    {
        var account = await _db.Accounts.FindAsync(accountId);
        var connection = await _db.AccountConnections.FirstAsync(c => 
            c.UserId == account.UserId && c.Source == AccountSource.BinanceAPI);
        
        var apiKey = DecryptToken(connection.CryptoApiKey);
        var apiSecret = DecryptToken(connection.CryptoApiSecret);
        
        _client.SetApiCredentials(apiKey, apiSecret);
        
        var balances = await _client.SpotApi.Account.GetBalancesAsync();
        
        return balances.Data
            .Where(b => b.Available > 0 || b.Locked > 0)
            .Select(b => new ExternalHolding
            {
                Symbol = b.Asset,
                Quantity = b.Available + b.Locked,
                CurrentValue = 0 // Need to fetch prices separately
            }).ToList();
    }
}
```

---

### 3. Background Sync Jobs

#### Daily Sync Job (Hangfire)
```csharp
public class DailySyncJob
{
    private readonly IAccountConnector _plaidConnector;
    private readonly IAccountConnector _tdConnector;
    private readonly IAccountConnector _binanceConnector;
    private readonly ApplicationDbContext _db;
    
    [AutomaticRetry(Attempts = 3)]
    public async Task SyncAllUsersAsync()
    {
        var users = await _db.Users.Where(u => u.HasActiveConnections).ToListAsync();
        
        foreach (var user in users)
        {
            try
            {
                await SyncUserAccountsAsync(user.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync accounts for user {UserId}", user.UserId);
                // Continue with next user (don't fail entire job)
            }
        }
    }
    
    private async Task SyncUserAccountsAsync(int userId)
    {
        var connections = await _db.AccountConnections
            .Where(c => c.UserId == userId && c.Status == SyncStatus.Connected)
            .ToListAsync();
        
        foreach (var connection in connections)
        {
            var connector = GetConnector(connection.Source);
            
            try
            {
                connection.Status = SyncStatus.Syncing;
                await _db.SaveChangesAsync();
                
                var result = await connector.SyncAllAccountsAsync(userId);
                
                connection.LastSyncedAt = DateTime.UtcNow;
                connection.Status = SyncStatus.Connected;
                connection.SyncFailureCount = 0;
                
                // Log sync history
                _db.SyncHistory.Add(new SyncHistory
                {
                    ConnectionId = connection.ConnectionId,
                    SyncStartedAt = DateTime.UtcNow.AddSeconds(-result.DurationMs / 1000),
                    SyncCompletedAt = DateTime.UtcNow,
                    Status = SyncStatus.Connected,
                    AccountsUpdated = result.AccountsUpdated,
                    HoldingsUpdated = result.HoldingsUpdated,
                    TransactionsImported = result.TransactionsImported,
                    DurationMs = result.DurationMs
                });
            }
            catch (Exception ex)
            {
                connection.Status = SyncStatus.SyncFailed;
                connection.ErrorMessage = ex.Message;
                connection.SyncFailureCount++;
                
                _db.SyncHistory.Add(new SyncHistory
                {
                    ConnectionId = connection.ConnectionId,
                    SyncStartedAt = DateTime.UtcNow,
                    Status = SyncStatus.SyncFailed,
                    ErrorMessage = ex.Message
                });
                
                // Disable connection after 5 consecutive failures
                if (connection.SyncFailureCount >= 5)
                {
                    connection.Status = SyncStatus.Expired;
                    // TODO: Send notification to user
                }
            }
            
            await _db.SaveChangesAsync();
        }
    }
}
```

---

### 4. Security & Encryption

#### Credential Storage
```csharp
public class CredentialEncryptionService
{
    private readonly IConfiguration _config;
    private readonly byte[] _encryptionKey;
    
    public CredentialEncryptionService(IConfiguration config)
    {
        // In production: Use Azure Key Vault or AWS Secrets Manager
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

#### API Key Permissions (Crypto Exchanges)
```text
CRITICAL: Crypto exchange API keys must be READ-ONLY

Coinbase Pro API Permissions:
✅ View: Enabled (account balances, transaction history)
❌ Trade: DISABLED (prevent unauthorized trading)
❌ Transfer: DISABLED (prevent withdrawals)
❌ Staking: DISABLED

Binance API Permissions:
✅ Enable Reading: Enabled
❌ Enable Spot & Margin Trading: DISABLED
❌ Enable Withdrawals: DISABLED
❌ Enable Futures: DISABLED

TD Ameritrade OAuth Scopes:
✅ AccountAccess: Read account balances and positions
✅ MarginTrading: Read margin requirements (NO trading)
❌ PlaceOrders: MUST NOT REQUEST

User must generate API keys with read-only permissions before linking.
PFMP will validate key permissions on connection and reject keys with write access.
```

---

### 5. Dual-Mode Conflict Resolution

#### Problem: Manual vs Automated Data
- User manually enters account balance: $10,000
- Plaid syncs real balance: $9,850
- **Which value should we show?**

#### Solution: Configurable Override Strategy

**Option 1: Always Use Synced Data (Default)**
```csharp
if (account.Source != AccountSource.Manual && account.LastSyncedAt != null)
{
    // Show synced balance (most accurate)
    displayBalance = account.CurrentBalance;
}
else
{
    // Show manual balance
    displayBalance = account.CurrentBalance;
}
```

**Option 2: User-Controlled Overrides**
```csharp
if (account.AllowManualOverrides && account.ManualBalanceOverride != null)
{
    // User explicitly set manual override
    displayBalance = account.ManualBalanceOverride;
    showWarning = true; // "Manual override active (synced: $9,850)"
}
else if (account.LastSyncedAt != null)
{
    displayBalance = account.CurrentBalance;
}
```

**Option 3: Hybrid Mode (Best UX)**
```csharp
// Show synced data by default
displayBalance = account.CurrentBalance;

// Show manual adjustment UI if synced balance is stale (>24 hours)
if (DateTime.UtcNow - account.LastSyncedAt > TimeSpan.FromHours(24))
{
    showManualAdjustmentPrompt = true;
}

// Allow manual override but show diff
if (account.ManualBalanceOverride != null)
{
    displayBalance = account.ManualBalanceOverride;
    syncedDiff = account.CurrentBalance - account.ManualBalanceOverride;
    showDiffBadge = true; // "+$150 from last sync"
}
```

#### UI Indicators
```tsx
<AccountCard>
  <Balance>$10,000.00</Balance>
  
  {account.source !== 'Manual' && (
    <>
      <SyncBadge status={account.syncStatus}>
        {account.syncStatus === 'Connected' && '✓ Synced 2h ago'}
        {account.syncStatus === 'SyncFailed' && '⚠️ Sync failed'}
        {account.syncStatus === 'Expired' && '🔒 Re-authenticate required'}
      </SyncBadge>
      
      {account.manualOverride && (
        <Chip size="small" color="warning">
          Manual override (+$150 vs synced)
        </Chip>
      )}
    </>
  )}
  
  <IconButton onClick={() => setShowSyncOptions(true)}>
    <MoreVert />
  </IconButton>
</AccountCard>

// Sync Options Menu
<Menu>
  <MenuItem onClick={handleSyncNow}>
    <Refresh /> Sync now
  </MenuItem>
  <MenuItem onClick={handleSetManualOverride}>
    <Edit /> Set manual balance
  </MenuItem>
  <MenuItem onClick={handleDisconnect}>
    <LinkOff /> Disconnect account
  </MenuItem>
</Menu>
```

---

### 6. Transaction Import Strategy

#### Problem: Duplicate Detection
- Manual entry: User enters "Costco gas $45.00" on 11/10/2025
- Plaid imports: "COSTCO GASOLINE #1234" $45.00 on 11/10/2025
- **Are these the same transaction?**

#### Solution: Fuzzy Matching Algorithm
```csharp
public class TransactionDeduplicator
{
    public async Task<List<Transaction>> DeduplicateAsync(
        List<Transaction> existingTransactions,
        List<ExternalTransaction> newTransactions)
    {
        var deduplicated = new List<Transaction>();
        
        foreach (var newTx in newTransactions)
        {
            var isDuplicate = existingTransactions.Any(existing =>
                IsProbableDuplicate(existing, newTx)
            );
            
            if (!isDuplicate)
            {
                deduplicated.Add(MapToTransaction(newTx));
            }
        }
        
        return deduplicated;
    }
    
    private bool IsProbableDuplicate(Transaction existing, ExternalTransaction incoming)
    {
        // Match criteria (must match ALL):
        // 1. Same account
        if (existing.AccountId != incoming.AccountId) return false;
        
        // 2. Same amount (exact match)
        if (existing.Amount != incoming.Amount) return false;
        
        // 3. Same date (±2 days for settlement delays)
        var daysDiff = Math.Abs((existing.TransactionDate - incoming.Date).TotalDays);
        if (daysDiff > 2) return false;
        
        // 4. Similar description (fuzzy match)
        var similarity = CalculateLevenshteinSimilarity(
            existing.Description?.ToLower() ?? "",
            incoming.Description?.ToLower() ?? ""
        );
        if (similarity < 0.7) return false; // 70% similarity threshold
        
        return true; // Likely duplicate
    }
    
    private double CalculateLevenshteinSimilarity(string s1, string s2)
    {
        var distance = LevenshteinDistance(s1, s2);
        var maxLength = Math.Max(s1.Length, s2.Length);
        return 1.0 - ((double)distance / maxLength);
    }
}
```

#### User Review Workflow
```tsx
// After import, show review page
<TransactionImportReview>
  <Alert severity="success">
    Imported 127 new transactions from Plaid
  </Alert>
  
  <Alert severity="info">
    Found 5 potential duplicates. Please review:
  </Alert>
  
  <List>
    {duplicates.map(dup => (
      <ListItem key={dup.id}>
        <ListItemText
          primary={dup.description}
          secondary={`${dup.amount} on ${dup.date}`}
        />
        <ButtonGroup>
          <Button onClick={() => handleKeepBoth(dup)}>Keep both</Button>
          <Button onClick={() => handleMerge(dup)} color="primary">
            Merge (replace manual entry)
          </Button>
        </ButtonGroup>
      </ListItem>
    ))}
  </List>
</TransactionImportReview>
```

---

## Implementation Plan

### Wave 11: Plaid Bank Linking (January 2026)

#### Week 1: Database & Backend Foundation
**Tasks:**
1. Create migration for `AccountConnections` and `SyncHistory` tables
2. Add `Source`, `ExternalAccountId`, `LastSyncedAt`, `SyncStatus` to `Accounts` table
3. Implement `CredentialEncryptionService`
4. Create `IAccountConnector` interface
5. Install `Plaid.Net` NuGet package
6. Configure Plaid credentials in `appsettings.json`

**Deliverables:**
- ✅ Database schema updated
- ✅ Encryption service ready
- ✅ Interface defined

#### Week 2: Plaid Integration
**Tasks:**
1. Implement `PlaidConnector` class
2. Create `PlaidController` with endpoints:
   - `POST /api/plaid/link-token` - Generate Plaid Link token
   - `POST /api/plaid/exchange-token` - Exchange public token for access token
   - `GET /api/plaid/accounts` - Fetch accounts
   - `POST /api/plaid/sync` - Trigger sync
   - `DELETE /api/plaid/disconnect` - Remove connection
3. Set up Plaid webhooks endpoint (`POST /api/plaid/webhook`)
4. Implement sync job (Hangfire)

**Deliverables:**
- ✅ PlaidConnector functional
- ✅ API endpoints operational
- ✅ Webhook server running

#### Week 3: Frontend Integration
**Tasks:**
1. Create `PlaidLinkButton` component (already exists in `RealBankAccountDashboard.tsx`)
2. Build `ConnectAccountModal` with Plaid Link flow
3. Add "Link Bank Account" button to AccountsView
4. Show sync status badges on account cards
5. Create `SyncHistoryDrawer` to show past sync results
6. Add "Disconnect" option to account menu

**Deliverables:**
- ✅ Users can link bank accounts via UI
- ✅ Sync status visible on dashboard
- ✅ Manual sync button functional

#### Week 4: Testing & Polish
**Tasks:**
1. E2E testing with Plaid Sandbox (Chase, Wells Fargo, Citi)
2. Test sync job execution
3. Test webhook processing
4. Error handling (expired tokens, sync failures)
5. Documentation (user guide, developer setup)

**Deliverables:**
- ✅ All flows tested
- ✅ Production-ready

---

### Wave 12: Brokerage APIs (February 2026)

#### Week 1: Plaid Investments Integration
**Tasks:**
1. Enable Plaid Investments product in dashboard
2. Implement holdings sync
3. Test with supported brokerages (Fidelity, Vanguard, Schwab, E*TRADE)

#### Week 2-3: Direct Brokerage APIs
**Tasks:**
1. TD Ameritrade OAuth flow
2. E*TRADE OAuth flow
3. Schwab API integration
4. Holdings and transaction sync

#### Week 4: Testing & Polish
**Tasks:**
1. Test with real brokerage sandbox accounts
2. Cost basis accuracy validation
3. Transaction deduplication testing

---

### Wave 13: Crypto Exchanges (March 2026)

#### Week 1-2: Exchange APIs
**Tasks:**
1. Coinbase API integration
2. Binance API integration
3. Kraken API integration

#### Week 3: Blockchain Integration
**Tasks:**
1. Etherscan API for Ethereum wallets
2. Bitcoin address tracking via Blockchain.com API

#### Week 4: Testing & Polish
**Tasks:**
1. Test with demo API keys
2. Validate staking position tracking
3. DeFi position aggregation testing

---

## Cost Analysis

### Plaid Pricing (Production)
- **Development (Sandbox):** FREE unlimited
- **Production:**
  - Auth (bank balances): $0.25 per connected account/month
  - Transactions: $0.50 per connected account/month
  - Investments: $1.00 per connected account/month
  - **Total per user (all products):** ~$1.75/month for 1 bank account

**Example:** 100 users with 2 linked accounts each = 200 connections × $1.75 = **$350/month**

### Brokerage APIs
- **TD Ameritrade:** FREE (OAuth + REST API)
- **E*TRADE:** FREE (OAuth + REST API, but rate limits)
- **Schwab:** FREE (after TD Ameritrade acquisition)
- **Fidelity:** No public API (must use aggregator or eMoney API partnership)

### Crypto Exchange APIs
- **Coinbase:** FREE (REST + WebSocket)
- **Binance:** FREE (REST + WebSocket, rate limits apply)
- **Kraken:** FREE (REST + WebSocket)

### Data Storage Costs
- **PostgreSQL:** $0.115/GB-month (AWS RDS)
- **Estimate:** 500 users × 1,000 transactions each × 1KB per transaction = 500MB = **$0.06/month**

### Encryption Key Storage (Azure Key Vault)
- **Secrets:** $0.03 per 10,000 operations
- **Estimate:** 1,000 encryption/decryption operations per day = 30,000/month = **$0.09/month**

### Total Infrastructure Cost
- **Plaid:** $350/month (100 users, 2 accounts each)
- **Database:** $0.06/month
- **Key Vault:** $0.09/month
- **Total:** **~$350/month** (scales with user count)

**Per-User Economics:**
- Plaid cost: $1.75/month per user (2 accounts)
- Target pricing: $9.99/month subscription
- **Gross margin: 82%** (before server/AI costs)

---

## Risks & Mitigation

### Risk 1: API Rate Limits
**Impact:** HIGH - Could prevent real-time syncing  
**Mitigation:**
- Queue sync requests (max 10 per minute)
- Implement exponential backoff on rate limit errors
- Cache account balances (update every 4 hours, not every page load)
- Use Plaid webhooks instead of polling

### Risk 2: Credential Security Breach
**Impact:** CRITICAL - User accounts compromised  
**Mitigation:**
- Encrypt all credentials at rest (AES-256)
- Use Azure Key Vault for encryption keys (not in code)
- Implement IP whitelisting for webhook endpoints
- Require read-only API keys (crypto exchanges)
- Log all credential access (audit trail)
- Implement 2FA for account disconnection

### Risk 3: Sync Failures & Stale Data
**Impact:** MEDIUM - Poor user experience, bad advice  
**Mitigation:**
- Show last sync timestamp on all accounts
- Retry failed syncs 3 times with exponential backoff
- Send notification if sync fails 5+ times
- Allow manual override (user enters correct balance)
- Display sync status badges (green/yellow/red)

### Risk 4: Duplicate Transactions
**Impact:** MEDIUM - Inflated spending reports  
**Mitigation:**
- Implement fuzzy matching algorithm (70% similarity threshold)
- Show review page after import (user confirms merges)
- Store manual transaction IDs for tracking
- Add "Mark as duplicate" option in UI

### Risk 5: OAuth Token Expiry
**Impact:** MEDIUM - Connections break after 90 days  
**Mitigation:**
- Store OAuth refresh tokens securely
- Automatically refresh tokens before expiry
- Send notification 7 days before expiry
- Guide user through re-authentication flow

### Risk 6: Cost Overruns (Plaid)
**Impact:** MEDIUM - $1.75/user/month can scale fast  
**Mitigation:**
- Limit free tier to 2 connected accounts
- Charge premium for 3+ accounts ($4.99/month)
- Offer annual discount to lock in revenue
- Monitor per-user costs in admin dashboard

---

## Success Metrics

### Wave 11 (Plaid Bank Linking)
- ✅ 80%+ of new users link at least 1 bank account
- ✅ <5% sync failure rate (excluding user-caused errors)
- ✅ 95%+ of syncs complete in <10 seconds
- ✅ Zero credential security incidents
- ✅ 90%+ user satisfaction with linked account UX

### Wave 12 (Brokerage APIs)
- ✅ 50%+ of users with investment accounts link via API
- ✅ Cost basis accuracy >99% (validated against broker statements)
- ✅ <2% duplicate transaction rate
- ✅ Support 5+ major brokerages (Fidelity, Vanguard, Schwab, E*TRADE, TD Ameritrade)

### Wave 13 (Crypto Exchanges)
- ✅ 25%+ of users with crypto link via API
- ✅ Support 3+ major exchanges (Coinbase, Binance, Kraken)
- ✅ Real-time price updates (<5 min delay)
- ✅ Accurate staking position tracking

---

## Open Questions

1. **Should we support manual overrides of synced data?**
   - **Recommendation:** YES - Users know their balances better than APIs sometimes (pending transactions, etc.)

2. **How do we handle pending transactions?**
   - **Option A:** Show separately (Pending: $45.00)
   - **Option B:** Deduct from available balance immediately
   - **Recommendation:** Option A (more transparent)

3. **Should we allow users to disconnect accounts?**
   - **Recommendation:** YES - GDPR compliance requires ability to delete data

4. **Do we support multiple Plaid connections per user?**
   - **Recommendation:** YES - Users may have accounts at multiple banks

5. **How do we handle account closures (user closes bank account)?**
   - **Recommendation:** Archive account (don't delete), show "Closed" badge, exclude from net worth

6. **Should we import transaction history (90 days back)?**
   - **Recommendation:** YES for first connection, then incremental syncs daily

7. **Do we auto-categorize transactions?**
   - **Recommendation:** YES - Use Plaid's category mapping + custom rules (Wave 14)

8. **How do we handle investment account tax lots (cost basis)?**
   - **Recommendation:** Store per-lot data, calculate wash sales, support FIFO/LIFO/SpecID

---

## Next Steps

### Immediate (This Week)
1. ✅ Review and approve this strategy document
2. ✅ Update roadmap with Wave 11-13 milestones
3. ✅ Create technical design document for dual-mode architecture
4. Create Plaid developer account (sandbox mode)
5. Set up Azure Key Vault for credential encryption

### Before Wave 11 (December 2025)
1. Complete Wave 9.3 Phase 3 (investment metrics) or Phase 4 (loan/credit views)
2. Complete Wave 10 (background jobs infrastructure)
3. Set up Hangfire for scheduled sync jobs
4. Implement encryption service and test with dummy credentials

### Wave 11 Kickoff (January 2026)
1. Database migration (AccountConnections, SyncHistory tables)
2. Install Plaid.Net NuGet package
3. Build PlaidConnector service
4. Frontend Plaid Link integration
5. E2E testing with Plaid Sandbox

---

## Appendix

### A. Plaid Supported Institutions (12,000+)
- All major US banks (Chase, BofA, Wells Fargo, Citi, US Bank)
- Credit unions (Navy Federal, USAA, PenFed)
- Online banks (Ally, Marcus, Discover, Capital One 360, Chime)
- International banks (Canada, UK, Europe via Plaid partnerships)

### B. Brokerage API Coverage
| Broker | API Type | Holdings | Transactions | Cost Basis | OAuth |
|--------|----------|----------|--------------|------------|-------|
| TD Ameritrade | REST | ✅ | ✅ | ✅ | ✅ |
| E*TRADE | REST | ✅ | ✅ | ✅ | ✅ |
| Schwab | REST | ✅ | ✅ | ✅ | ✅ |
| Fidelity | eMoney | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Vanguard | Plaid | ✅ | ✅ | ❌ | ✅ |
| Robinhood | Unofficial | ⚠️ | ⚠️ | ❌ | ❌ |

### C. Crypto Exchange API Features
| Exchange | API Type | Read-Only Keys | WebSocket | Staking | DeFi |
|----------|----------|----------------|-----------|---------|------|
| Coinbase | REST + WS | ✅ | ✅ | ✅ | ❌ |
| Binance | REST + WS | ✅ | ✅ | ✅ | ⚠️ |
| Kraken | REST + WS | ✅ | ✅ | ✅ | ❌ |
| Gemini | REST + WS | ✅ | ✅ | ❌ | ❌ |

### D. References
- Plaid API Docs: https://plaid.com/docs/
- TD Ameritrade API: https://developer.tdameritrade.com/
- Binance API: https://binance-docs.github.io/apidocs/spot/en/
- Coinbase API: https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs

---

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Next Review:** December 1, 2025 (before Wave 11 kickoff)
