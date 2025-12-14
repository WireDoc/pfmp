# Wave 12: Brokerage & Investment Linking

> **Status**: � In Progress (Phase 1 Complete)  
> **Target**: Q1 2026  
> **Priority**: High  
> **Prerequisites**: Wave 11 Complete ✅

---

## Progress Summary

### ✅ Phase 1: Backend Foundation (Complete - Dec 13, 2025)
- PlaidInvestmentsService with sandbox seeding capability
- PlaidSecurity model for securities reference data
- Extended Account/Holding models with Plaid fields
- Investment endpoints added to PlaidController
- EF migration AddPlaidInvestmentsSupport applied
- Sandbox seeding tested: 2 accounts, 13 holdings created

### 🔄 Phase 2: Frontend Integration (Not Started)
- Investments-specific PlaidLinkButton
- Settings page investments section
- Holdings display on portfolio

### ⏳ Phase 3: Testing & Documentation (Not Started)

---

## Executive Summary

Wave 12 extends Plaid integration to investment accounts (brokerages, retirement accounts, robo-advisors). This enables automatic holdings sync, cost basis tracking, and unified portfolio views.

**Key Question Answered**: Should we use Plaid Investments or direct brokerage APIs?

### Recommendation: Plaid Investments

**Use Plaid Investments** for the following reasons:

| Factor | Plaid Investments | Direct APIs (Schwab, E*TRADE) |
|--------|-------------------|-------------------------------|
| **Coverage** | 1,600+ brokerages | 2 brokerages |
| **Implementation** | Same as Wave 11 (already built) | 2 separate OAuth flows |
| **Maintenance** | Plaid handles API changes | We maintain each integration |
| **User Experience** | One consistent Link flow | Different auth per broker |
| **Cost** | ~$0.50-1.50/account/month | Free but complex |
| **Time to Ship** | 1-2 weeks | 4-6 weeks |

**Major Brokerages Covered by Plaid:**
- ✅ Charles Schwab / TD Ameritrade (merged)
- ✅ Fidelity
- ✅ Vanguard
- ✅ E*TRADE (Morgan Stanley)
- ✅ Robinhood
- ✅ Webull
- ✅ Interactive Brokers
- ✅ Merrill Edge
- ✅ Most 401(k) providers

**Brokerages NOT in Plaid** (rare edge cases):
- Some smaller regional brokers
- Some employer stock plan providers
- Crypto-only platforms (see Wave 13)

### Direct API Strategy: Optional Phase B

Direct brokerage APIs (Schwab, E*TRADE) could be added later as an **optional enhancement** for power users who want free access. This would be a separate effort, not blocking Wave 12.

---

## Sandbox Testing Strategy

### The Problem
Plaid's default `user_good` test user does **NOT** have investment accounts. Only bank accounts (checking, savings) are included.

### The Solution: Custom Sandbox Users

Plaid provides a "Custom Sandbox User" feature that allows us to define investment accounts with specific holdings for testing.

**Method 1: Dashboard Configuration**
1. Go to [Plaid Dashboard → Developers → Sandbox](https://dashboard.plaid.com/developers/sandbox?tab=testUsers)
2. Create a custom test user with investment accounts
3. Define holdings (stocks, ETFs, mutual funds)

**Method 2: API-Based Custom User**
```csharp
// Create sandbox token with custom investment data
var request = new SandboxPublicTokenCreateRequest
{
    InstitutionId = "ins_109508", // First Platypus Bank
    InitialProducts = new[] { Products.Investments },
    Options = new SandboxPublicTokenCreateRequestOptions
    {
        OverrideUsername = "user_custom",
        OverridePassword = JsonSerializer.Serialize(new
        {
            investment_accounts = new[]
            {
                new
                {
                    name = "Plaid Roth IRA",
                    type = "investment",
                    subtype = "ira",
                    balance = 125000.50m,
                    holdings = new[]
                    {
                        new { security_id = "AAPL", quantity = 50, institution_price = 180.25m },
                        new { security_id = "VTSAX", quantity = 100, institution_price = 120.00m },
                        new { security_id = "SPY", quantity = 25, institution_price = 450.00m }
                    }
                },
                new
                {
                    name = "Plaid 401k",
                    type = "investment",
                    subtype = "401k",
                    balance = 85000.00m,
                    holdings = new[]
                    {
                        new { security_id = "VFIAX", quantity = 200, institution_price = 425.00m }
                    }
                }
            }
        })
    }
};
```

---

## Data Model Changes

### Extend CashAccounts vs New InvestmentAccounts Table

**Decision**: Use the existing `Accounts` table (investment accounts) rather than `CashAccounts`.

The `Accounts` table already has:
- `Category` (retirement, taxable, etc.)
- `AccountType` (401k, IRA, brokerage, etc.)
- `HasAPIIntegration` flag
- `Holdings` relationship
- `State` (SKELETON/DETAILED)

**New Fields for Accounts Table:**
```csharp
// Plaid-specific fields (matching CashAccounts pattern)
public AccountSource Source { get; set; } = AccountSource.Manual;
public string? PlaidItemId { get; set; }
public string? PlaidAccountId { get; set; }
public DateTime? LastSyncedAt { get; set; }
public SyncStatus SyncStatus { get; set; } = SyncStatus.NotConnected;
public string? SyncErrorMessage { get; set; }
```

### Holdings Sync

Plaid `/investments/holdings/get` returns:
- Security info (ticker, name, type, CUSIP, ISIN)
- Quantity and current price
- Cost basis (when available)
- Account association

**Map to existing Holdings table:**
```csharp
public class Holding
{
    public int HoldingId { get; set; }
    public int AccountId { get; set; }
    public string Symbol { get; set; }  // From security.ticker_symbol
    public string Name { get; set; }    // From security.name
    public decimal Quantity { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal? CostBasis { get; set; }  // From holding.cost_basis
    public string? PlaidSecurityId { get; set; }  // NEW: For sync matching
    public string? PlaidHoldingId { get; set; }   // NEW: For sync matching
    public DateTime? LastSyncedAt { get; set; }   // NEW
}
```

### Securities Reference Table (New)

Store Plaid security details for reference:
```csharp
[Table("Securities")]
public class Security
{
    [Key]
    [MaxLength(100)]
    public string PlaidSecurityId { get; set; }
    
    [MaxLength(20)]
    public string? TickerSymbol { get; set; }
    
    [MaxLength(200)]
    public string Name { get; set; }
    
    [MaxLength(50)]
    public string Type { get; set; }  // equity, etf, mutual_fund, etc.
    
    [MaxLength(20)]
    public string? Cusip { get; set; }
    
    [MaxLength(20)]
    public string? Isin { get; set; }
    
    public decimal? ClosePrice { get; set; }
    public DateTime? ClosePriceAsOf { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

---

## API Endpoints

### New Plaid Controller Endpoints

```csharp
// Create link token for investments product
POST /api/plaid/investments/link-token

// Exchange public token (creates accounts + syncs holdings)
POST /api/plaid/investments/exchange-token

// Manual refresh of investment holdings
POST /api/plaid/connections/{id}/investments/sync

// Get investment transactions (optional)
GET /api/plaid/connections/{id}/investments/transactions
```

### Data Retrieval

```csharp
// Get holdings for an investment account
GET /api/accounts/{id}/holdings

// Get account with holdings summary
GET /api/accounts/{id}?include=holdings
```

---

## Implementation Phases

### Phase 1: Backend Foundation (3-4 days)

**Database:**
- [ ] Add Plaid fields to `Accounts` table (migration)
- [ ] Add `PlaidSecurityId`, `PlaidHoldingId` to `Holdings` table
- [ ] Create `Securities` reference table
- [ ] Update `AccountConnections` to support investments

**Services:**
- [ ] Extend `PlaidService` with investments methods:
  - `CreateInvestmentsLinkTokenAsync()`
  - `SyncInvestmentHoldingsAsync()`
  - `GetInvestmentTransactionsAsync()` (optional)
- [ ] Create `InvestmentSyncService` for holdings reconciliation

### Phase 2: Plaid Integration (2-3 days)

**Controller:**
- [ ] Add investments endpoints to `PlaidController`
- [ ] Handle investments product in token exchange

**Sync Logic:**
- [ ] Map Plaid holdings to our `Holdings` table
- [ ] Handle security lookup/creation
- [ ] Cost basis preservation (don't overwrite manual entries)

**Hangfire Job:**
- [ ] Extend `PlaidSyncJob` to sync investments daily
- [ ] Add investments-specific error handling

### Phase 3: Frontend (3-4 days)

**Link Integration:**
- [ ] Update `PlaidLinkButton` to support investments product
- [ ] Show investment accounts in `ConnectedBanksList`
- [ ] Add investment-specific icons and status indicators

**Account Views:**
- [ ] Update investment account cards to show Plaid sync status
- [ ] Show "Last synced" timestamp on holdings
- [ ] Add manual refresh button

**Settings:**
- [ ] Investment connections in ConnectionsSettingsView
- [ ] Separate section for bank vs investment connections

### Phase 4: Testing & Polish (2 days)

- [ ] Create custom sandbox user with investment accounts
- [ ] Test holdings sync and reconciliation
- [ ] Test cost basis handling
- [ ] Add Vitest coverage for new components
- [ ] Update Postman collection

---

## Acceptance Criteria

### Must Have
- [ ] Link investment accounts via Plaid
- [ ] Sync holdings with quantities and current prices
- [ ] Display holdings in investment account views
- [ ] Daily automatic sync via Hangfire job
- [ ] Handle connection errors gracefully

### Should Have
- [ ] Cost basis sync when available from Plaid
- [ ] Securities reference table for consistent data
- [ ] Investment transaction history

### Nice to Have
- [ ] Duplicate detection with manually-entered holdings
- [ ] "Refresh prices now" button for on-demand updates

---

## Cost Analysis

### Plaid Investments Pricing

Plaid does not publish exact pricing, but typical ranges:
- **Pay-as-you-go**: ~$1.00-1.50 per account per month
- **Growth tier**: ~$0.50-0.75 per account per month (with commitment)

For a user with 3 investment accounts:
- Monthly cost: $1.50 - $4.50
- Annual cost: $18 - $54

### Alternative: Direct APIs

**Schwab Developer Portal:**
- Free API access
- OAuth 2.0 authentication
- Provides: Accounts, Positions, Transactions, Orders
- Requires: Individual developer registration

**E*TRADE Developer Portal:**
- Free API access
- OAuth 1.0a authentication (older, more complex)
- Provides: Accounts, Positions, Transactions, Orders
- Requires: Developer registration

**Implementation Cost Comparison:**

| Factor | Plaid | Direct APIs |
|--------|-------|-------------|
| Development time | 1-2 weeks | 4-6 weeks |
| Maintenance | Low | High |
| Coverage | 1,600+ | 2 brokers |
| Recurring cost | ~$1/account/month | $0 |
| User experience | Consistent | Varied |

**Recommendation**: Start with Plaid. Add direct APIs only if users request it and cost becomes a concern.

---

## Future Considerations

### Wave 13: Crypto Exchanges
Crypto exchanges (Coinbase, Binance, Kraken) provide **free** read-only APIs. These are better handled directly rather than through Plaid.

### Phase B: Direct Brokerage APIs (Optional)
If Plaid costs become significant, we could add:
1. Schwab API integration (free, OAuth 2.0)
2. E*TRADE API integration (free, OAuth 1.0a)

This would give users a choice:
- Quick setup: Use Plaid (small monthly cost)
- Free option: Connect directly (more setup steps)

---

## References

- [Plaid Investments Documentation](https://plaid.com/docs/investments/)
- [Plaid Custom Sandbox Users](https://plaid.com/docs/sandbox/user-custom/)
- [Schwab Developer Portal](https://developer.schwab.com/)
- [E*TRADE Developer Portal](https://developer.etrade.com/)
- [Wave 11 Complete](./wave-11-complete.md) - Bank account linking (reference implementation)
