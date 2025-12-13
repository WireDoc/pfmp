# Wave 11: Plaid Bank Account Linking

> **Status**: ✅ Complete  
> **Target**: January 2026 (4 weeks)  
> **Priority**: 🔥 Critical - Phase 2 keystone feature  
> **Prerequisites**: Wave 10 Complete ✅  
> **Started**: December 11, 2025
> **Completed**: December 12, 2025

---

## Implementation Progress

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1: Foundation** | ✅ Complete | Models, migration, services, encryption |
| **Phase 2: Plaid Integration** | ✅ Complete | PlaidService, PlaidController, Hangfire job |
| **Phase 3: Frontend** | ✅ Complete | Plaid Link UI, Settings page, Dashboard CTA |
| **Phase 4: Testing & Polish** | ✅ Complete | Sandbox testing, error handling, Vitest coverage |
| **Phase 5: Transactions** | ✅ Complete | Transaction sync, storage, and retrieval |

### Completed Items (December 11-12, 2025)

**Backend (Commits 61722e9, 78a3b2d):**
- ✅ Installed `Going.Plaid` v6.54.0 NuGet package
- ✅ Added Plaid configuration to `appsettings.Development.json` and `.local.json`
- ✅ Created EF migration `AddPlaidIntegration`:
  - `AccountConnections` table
  - `SyncHistory` table
  - Extended `CashAccounts` with Plaid fields
- ✅ Implemented `DataProtectionEncryptionService` for token encryption
- ✅ Created `PlaidService` with full Plaid API integration
- ✅ Created `PlaidController` with all REST endpoints
- ✅ Created `PlaidSyncJob` (Hangfire) - Daily at 10 PM ET
- ✅ Registered services and job in `Program.cs`
- ✅ Updated Postman collection v1.4.0

**Connection Lifecycle (December 12, 2025):**
- ✅ Reconnect endpoint - Creates update-mode link token for expired/failed connections
- ✅ Disconnect endpoint - Pauses sync without deleting data (status → Disconnected)
- ✅ Delete endpoint - Permanent removal with option to keep/delete linked accounts
- ✅ Plaid Item removal via API on permanent delete
- ✅ Status-based menu actions in ConnectedBanksList

**Frontend (Commits 1d98283, 78a3b2d):**
- ✅ Installed `react-plaid-link` v4.1.1
- ✅ Created `plaidApi.ts` service for backend communication
- ✅ Created `PlaidLinkButton` component with react-plaid-link integration
- ✅ Created `PlaidLinkCTA` component for dashboard use
- ✅ Created `ConnectedBanksList` component with sync/disconnect actions
- ✅ Created `ConnectionStatusChip` component with status indicators
- ✅ Created `ConnectionsSettingsView` at `/settings/connections`
- ✅ Added Dashboard CTA to `CashAccountManager`
- ✅ Added CD and HSA account types to CashAccountModal
- ✅ Protected Plaid-linked accounts from manual deletion
- ✅ Institution name auto-populated from Plaid metadata
- ✅ Moved Connections and Scheduler to HeaderBar navigation
- ✅ Added routes for `/dashboard/settings/connections` and `/dashboard/admin/scheduler`

**Testing & Documentation (December 12, 2025):**
- ✅ Plaid Sandbox testing with First Platypus Bank
- ✅ HeaderBar.test.tsx - 13 tests (branding, navigation, user display, dev mode)
- ✅ ConnectedBanksList.test.tsx - 15 tests (empty state, status menus, expand/collapse)
- ✅ ConnectionsSettingsView.test.tsx - 11 tests (layout, loading, sync, errors)
- ✅ Postman collection v1.4.0 with all connection lifecycle endpoints
- ✅ Environment file updated with all required variables

## Executive Summary

Wave 11 implements **Plaid bank account linking** for automated balance syncing of checking, savings, money market, CD, and HSA accounts. This is the first step toward full account aggregation, with brokerage and crypto integration planned for future waves.

**Scope Limitation:** Bank accounts only (balance sync). Transaction import deferred to Wave 14+.

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scope** | Banks only (Wave 11) | Brokerage adds complexity; ship faster |
| **Data Sync** | Balance only | Transactions add cost + deduplication complexity |
| **UI Placement** | Settings page + Dashboard CTA | Maximum discoverability |
| **Data Model** | Connection-first with shared fields | One Plaid "Item" = multiple accounts |
| **Sync Method** | Polling via Hangfire | Simpler; webhooks for production later |
| **Encryption** | Data Protection API (dev) / Azure Key Vault (prod) | .NET native solution |
| **Existing Code** | Fresh start | Current frontend code is insecure |

---

## Architecture: Linked Accounts Strategy

### Current Account Structure

PFMP has two parallel account systems:

| System | Table | Use Case |
|--------|-------|----------|
| **CashAccounts** | `CashAccounts` | Simple cash accounts from onboarding (checking, savings, CD, money market) |
| **Accounts** | `Accounts` | Investment accounts with SKELETON/DETAILED states and holdings |

**CashAccount Fields:**
- `CashAccountId` (Guid), `UserId`, `Nickname`, `Institution`, `AccountNumber`, `RoutingNumber`
- `AccountType` (checking/savings/cd/money_market), `Balance`, `InterestRateApr`
- `IsEmergencyFund`, `Purpose`, `RateLastChecked`

**Account Fields (for investments):**
- `AccountId`, `UserId`, `AccountName`, `AccountType`, `Category`, `Institution`, `AccountNumber`
- `CurrentBalance`, `State` (SKELETON/DETAILED), `HasAPIIntegration`, `APIProvider`
- Holdings relationship for DETAILED accounts

### Linked Account Strategy

**Recommendation:** Add Plaid linking capability to the **CashAccounts** table with new fields, preserving all existing manual entry fields.

```csharp
// Additions to CashAccount model
public AccountSource Source { get; set; } = AccountSource.Manual;
public string? PlaidItemId { get; set; }        // References AccountConnection
public string? PlaidAccountId { get; set; }     // Plaid's account identifier
public DateTime? LastSyncedAt { get; set; }
public SyncStatus SyncStatus { get; set; } = SyncStatus.NotConnected;
public string? SyncErrorMessage { get; set; }
public bool AllowManualOverride { get; set; } = true;
public decimal? ManualBalanceOverride { get; set; }  // User can override synced balance
```

**Why extend CashAccounts?**
1. CashAccounts already has `Institution`, `AccountNumber`, `RoutingNumber`, `Purpose` - all relevant for linked accounts
2. Plaid provides similar data (institution name, mask/last 4 digits)
3. User can fill in details Plaid doesn't provide (routing number, purpose, nickname)
4. Balance comes from Plaid but can be manually overridden
5. Keeps investment accounts (with SKELETON/DETAILED logic) separate

### New AccountConnections Table

One Plaid "Item" (bank login) yields multiple accounts. Track connections separately:

```csharp
[Table("AccountConnections")]
public class AccountConnection
{
    [Key]
    public Guid ConnectionId { get; set; } = Guid.NewGuid();
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    public AccountSource Source { get; set; }
    
    // Plaid-specific
    [MaxLength(100)]
    public string? PlaidItemId { get; set; }
    
    [MaxLength(500)]  // Encrypted access token
    public string? PlaidAccessToken { get; set; }
    
    [MaxLength(50)]
    public string? PlaidInstitutionId { get; set; }
    
    [MaxLength(200)]
    public string? PlaidInstitutionName { get; set; }
    
    // Connection state
    public SyncStatus Status { get; set; } = SyncStatus.Connected;
    
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    public int SyncFailureCount { get; set; } = 0;
    
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSyncedAt { get; set; }
    
    // Navigation
    public virtual User User { get; set; } = null!;
}

public enum AccountSource
{
    Manual = 0,
    CSV = 1,
    Plaid = 2,
    // Future: PlaidInvestments, TDAmeritrade, Coinbase, etc.
}

public enum SyncStatus
{
    NotConnected = 0,
    Connected = 1,
    Syncing = 2,
    SyncFailed = 3,
    Expired = 4,      // Token expired, re-auth needed
    Disconnected = 5  // User disconnected intentionally
}
```

### Sync History Table

Track all sync operations for debugging and user transparency:

```csharp
[Table("SyncHistory")]
public class SyncHistory
{
    [Key]
    public Guid SyncHistoryId { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ConnectionId { get; set; }
    
    public DateTime SyncStartedAt { get; set; }
    public DateTime? SyncCompletedAt { get; set; }
    public SyncStatus Status { get; set; }
    
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    public int AccountsUpdated { get; set; } = 0;
    public int DurationMs { get; set; }
    
    // Navigation
    public virtual AccountConnection Connection { get; set; } = null!;
}
```

---

## Balance Sync Logic

### Linked Account Balance Behavior

```csharp
// When displaying balance:
public decimal GetDisplayBalance(CashAccount account)
{
    // Manual override takes precedence if set
    if (account.AllowManualOverride && account.ManualBalanceOverride.HasValue)
    {
        return account.ManualBalanceOverride.Value;
    }
    
    // Otherwise use synced or manual balance
    return account.Balance;
}
```

### Sync Process

1. **Plaid Link completes** → Exchange public_token for access_token
2. **Fetch accounts** → Create/update CashAccount records
3. **Update balance** → Set `CashAccount.Balance` from Plaid
4. **Track sync** → Update `LastSyncedAt`, create SyncHistory record
5. **Daily job** → Hangfire refreshes all connected accounts at 10 PM

---

## Manual Override Feature

Users can override Plaid's balance when:
- Pending transactions affect displayed balance
- Plaid data is stale or incorrect
- User wants to track "available" vs "current" balance

**UI Indicator:**
```tsx
<AccountCard>
  <Typography variant="h5">${displayBalance}</Typography>
  
  {account.source === 'Plaid' && (
    <Chip 
      size="small" 
      icon={<Link />}
      label={`Synced ${formatRelativeTime(account.lastSyncedAt)}`}
      color="success"
    />
  )}
  
  {account.manualBalanceOverride && (
    <Tooltip title={`Plaid balance: $${account.balance} | You set: $${account.manualBalanceOverride}`}>
      <Chip size="small" color="warning" label="Manual override" />
    </Tooltip>
  )}
</AccountCard>
```

---

## Plaid Integration Details

### Plaid Products Required

| Product | Cost | Wave 11? | Notes |
|---------|------|----------|-------|
| **Balance** | $0.25/acct/mo | ✅ Yes | Real-time balance fetch |
| **Auth** | $0.25/acct/mo | ❌ No | Account/routing numbers (user can enter manually) |
| **Transactions** | $0.50/acct/mo | ❌ Wave 14+ | 24 months of transaction history |
| **Investments** | $1.00/acct/mo | ❌ Wave 12+ | Brokerage holdings and transactions |

**Wave 11 Cost:** ~$0.25/account/month (Balance product only)

### Plaid Environments

| Environment | Purpose | Credentials |
|-------------|---------|-------------|
| **Sandbox** | Development testing | Fake credentials, instant responses |
| **Development** | Live bank testing | Real credentials, limited usage |
| **Production** | Live users | Real credentials, paid usage |

### API Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │    Plaid    │    │    Bank     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ GET /plaid/link-token             │                  │
       │─────────────────>│                  │                  │
       │                  │ POST /link/token/create            │
       │                  │─────────────────>│                  │
       │                  │<─────────────────│                  │
       │<─────────────────│ link_token       │                  │
       │                  │                  │                  │
       │ Open Plaid Link (link_token)       │                  │
       │────────────────────────────────────>│                  │
       │                  │                  │ OAuth/Credentials│
       │                  │                  │─────────────────>│
       │                  │                  │<─────────────────│
       │<────────────────────────────────────│ public_token     │
       │                  │                  │                  │
       │ POST /plaid/exchange (public_token)│                  │
       │─────────────────>│                  │                  │
       │                  │ POST /item/public_token/exchange   │
       │                  │─────────────────>│                  │
       │                  │<─────────────────│ access_token     │
       │                  │                  │                  │
       │                  │ Store encrypted access_token       │
       │                  │                  │                  │
       │                  │ GET /accounts/balance/get          │
       │                  │─────────────────>│                  │
       │                  │<─────────────────│ accounts[]       │
       │                  │                  │                  │
       │<─────────────────│ Created accounts │                  │
       │                  │                  │                  │
```

---

## Backend Implementation

### NuGet Package

```xml
<PackageReference Include="Going.Plaid" Version="7.*" />
```

### Configuration

```json
// appsettings.Development.json
{
  "Plaid": {
    "ClientId": "your_client_id",
    "Secret": "your_secret",
    "Environment": "sandbox"  // sandbox | development | production
  }
}
```

### PlaidService

```csharp
public interface IPlaidService
{
    // Link flow
    Task<string> CreateLinkTokenAsync(int userId);
    Task<AccountConnection> ExchangePublicTokenAsync(int userId, string publicToken, string? institutionId = null, string? institutionName = null);
    
    // Account operations
    Task<List<CashAccount>> FetchAndSyncAccountsAsync(Guid connectionId);
    Task<SyncResult> SyncConnectionAsync(Guid connectionId);
    Task<SyncResult> SyncAllUserConnectionsAsync(int userId);
    
    // Connection management
    Task DisconnectAsync(Guid connectionId);
    Task<List<AccountConnection>> GetUserConnectionsAsync(int userId);
    Task<List<CashAccount>> GetConnectionAccountsAsync(Guid connectionId);
    Task<List<SyncHistory>> GetSyncHistoryAsync(Guid connectionId, int limit = 10);
}
```

### PlaidController Endpoints (Implemented)

All endpoints require authentication via JWT Bearer token.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `POST` | `/api/plaid/link-token` | Create Plaid Link token | None | `{ linkToken: string }` |
| `POST` | `/api/plaid/exchange-token` | Exchange public token, create connection & accounts | `{ publicToken: string }` | `{ connection, accounts[] }` |
| `GET` | `/api/plaid/connections` | List user's connected banks | None | `ConnectionDto[]` |
| `GET` | `/api/plaid/connections/{id}/accounts` | Get accounts for a connection | None | `AccountDto[]` |
| `POST` | `/api/plaid/connections/{id}/sync` | Manual balance refresh | None | `{ success, accountsUpdated, errorMessage }` |
| `POST` | `/api/plaid/sync-all` | Sync all user connections | None | `{ success, accountsUpdated, errorMessage }` |
| `DELETE` | `/api/plaid/connections/{id}` | Disconnect bank | None | 204 No Content |
| `GET` | `/api/plaid/connections/{id}/history` | Get sync history | `?limit=10` | `SyncHistoryDto[]` |

#### Response DTOs

```typescript
interface ConnectionDto {
  connectionId: string;        // GUID
  institutionName: string;
  institutionId?: string;
  status: string;              // Connected, SyncFailed, Expired, Disconnected
  errorMessage?: string;
  connectedAt: string;         // ISO 8601
  lastSyncedAt?: string;
}

interface AccountDto {
  cashAccountId: string;       // GUID
  name: string;
  balance: number;
  plaidAccountId?: string;
  syncStatus: string;
  lastSyncedAt?: string;
}

interface SyncHistoryDto {
  syncHistoryId: string;       // GUID
  syncStartedAt: string;
  syncCompletedAt?: string;
  status: string;
  errorMessage?: string;
  accountsUpdated: number;
  durationMs?: number;
}
```

### Hangfire Job

```csharp
public class PlaidSyncJob
{
    [AutomaticRetry(Attempts = 3)]
    public async Task SyncAllUsersAsync()
    {
        var connections = await _db.AccountConnections
            .Where(c => c.Status == SyncStatus.Connected)
            .Where(c => c.Source == AccountSource.Plaid)
            .ToListAsync();
        
        foreach (var connection in connections)
        {
            await _plaidService.SyncConnectionAsync(connection.ConnectionId);
        }
    }
}

// Schedule: Daily at 10 PM ET (before price refresh at 11 PM)
RecurringJob.AddOrUpdate<PlaidSyncJob>(
    "daily-plaid-sync",
    job => job.SyncAllUsersAsync(),
    "0 22 * * *",
    TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time")
);
```

---

## Frontend Implementation

### New Components

```
src/
├── views/
│   └── settings/
│       └── ConnectionsSettingsView.tsx    # /settings/connections
├── components/
│   └── plaid/
│       ├── PlaidLinkButton.tsx            # Triggers Plaid Link
│       ├── ConnectedBanksList.tsx         # Shows connected banks
│       ├── ConnectionStatusChip.tsx       # Sync status indicator
│       └── SyncHistoryDrawer.tsx          # Past sync details
└── services/
    └── plaidApi.ts                        # API client
```

### Settings Page: /settings/connections

```tsx
<ConnectionsSettingsView>
  <Typography variant="h4">Connected Accounts</Typography>
  
  <Card sx={{ p: 3, textAlign: 'center', border: '2px dashed', borderColor: 'divider' }}>
    <AccountBalance sx={{ fontSize: 48, color: 'text.secondary' }} />
    <Typography variant="h6" gutterBottom>Link Your Bank Accounts</Typography>
    <Typography color="text.secondary" gutterBottom>
      Securely connect your bank accounts to automatically sync balances.
    </Typography>
    <PlaidLinkButton variant="contained" startIcon={<Add />}>
      Link Bank Account
    </PlaidLinkButton>
  </Card>
  
  {connections.length > 0 && (
    <ConnectedBanksList connections={connections} onDisconnect={handleDisconnect} />
  )}
</ConnectionsSettingsView>
```

### Dashboard Integration

Add "Link Bank Account" card to the Cash Accounts section:

```tsx
// In Dashboard or AccountsView
{!hasLinkedAccounts && (
  <Card sx={{ p: 2, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
    <Typography variant="h6" color="white">Automate Your Finances</Typography>
    <Typography color="white" variant="body2" sx={{ mb: 2 }}>
      Link your bank accounts for automatic balance updates
    </Typography>
    <PlaidLinkButton variant="contained" color="inherit" size="small">
      Connect Banks
    </PlaidLinkButton>
  </Card>
)}
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3) ✅ Complete
- [x] Create Plaid developer account
- [x] Install `Going.Plaid` NuGet package
- [x] Add Plaid configuration to appsettings
- [x] Create EF migration:
  - `AccountConnections` table
  - `SyncHistory` table
  - Add `Source`, `PlaidItemId`, `PlaidAccountId`, `LastSyncedAt`, `SyncStatus` to `CashAccounts`
- [x] Implement `CredentialEncryptionService` (Data Protection API)
- [x] Create `IPlaidService` interface

### Phase 2: Plaid Integration (Days 4-7) ✅ Complete
- [x] Implement `PlaidService`:
  - `CreateLinkTokenAsync`
  - `ExchangePublicTokenAsync`
  - `FetchAndSyncAccountsAsync`
  - `SyncConnectionAsync`
  - `GetUserConnectionsAsync`
  - `GetConnectionAccountsAsync`
  - `GetSyncHistoryAsync`
  - `DisconnectAsync`
- [x] Create `PlaidController` with all endpoints
- [x] Create `PlaidSyncJob` (Hangfire)
- [x] Register job: Daily at 10 PM ET

### Phase 3: Frontend (Days 8-12)
- [ ] Create `PlaidLinkButton` component
- [ ] Create `/settings/connections` page
- [ ] Create `ConnectedBanksList` component
- [ ] Create `ConnectionStatusChip` component
- [ ] Add "Link Bank Account" CTA to dashboard
- [ ] Update cash account cards with sync status
- [ ] Add manual override UI

### Phase 4: Testing & Polish (Days 13-15)
- [ ] Plaid Sandbox testing (Chase, Wells Fargo, Citi)
- [ ] Test sync job execution
- [ ] Error handling (expired tokens, rate limits)
- [x] Update Postman collection
- [ ] Documentation

---

## Testing Strategy

### Plaid Sandbox Credentials

Plaid provides test credentials:
- **Username:** `user_good`
- **Password:** `pass_good`
- **MFA (if prompted):** `1234`

### Test Scenarios

| Scenario | Test Data |
|----------|-----------|
| Successful link | `user_good` / `pass_good` |
| MFA challenge | `user_good` / `pass_good` → `1234` |
| Wrong password | `user_bad` / `pass_bad` |
| Institution down | Use error simulation in sandbox |
| Token expiration | Force with sandbox controls |

---

## Security Considerations

### Access Token Storage

- Encrypted at rest using Data Protection API
- Never logged or exposed in API responses
- Stored in `AccountConnections.PlaidAccessToken`

### Production Migration

For production (Azure Key Vault):

```csharp
// Replace Data Protection with Azure Key Vault
public class AzureKeyVaultEncryptionService : ICredentialEncryptionService
{
    private readonly SecretClient _secretClient;
    
    public async Task<string> EncryptAsync(string plainText)
    {
        // Store in Key Vault as a secret
        await _secretClient.SetSecretAsync($"plaid-{Guid.NewGuid()}", plainText);
        return secretId;
    }
    
    public async Task<string> DecryptAsync(string secretId)
    {
        var secret = await _secretClient.GetSecretAsync(secretId);
        return secret.Value.Value;
    }
}
```

---

## Future Roadmap Integration

### Brokerage Integration (Wave 12+)

**Brokerage API Options Analysis:**

| Broker | Free API? | API Type | Holdings | Transactions | Notes |
|--------|-----------|----------|----------|--------------|-------|
| **TD Ameritrade** | ✅ Free | OAuth + REST | ✅ | ✅ | Schwab merger complete |
| **Schwab** | ✅ Free | OAuth + REST | ✅ | ✅ | Absorbed TD API |
| **E*TRADE** | ✅ Free | OAuth + REST | ✅ | ✅ | Good documentation |
| **Fidelity** | ❌ No public API | N/A | ❌ | ❌ | Use Plaid Investments |
| **Vanguard** | ❌ No public API | N/A | ❌ | ❌ | Use Plaid Investments |
| **Ally Invest** | ❌ Limited | N/A | ⚠️ | ⚠️ | Poor API support |
| **Robinhood** | ❌ No official API | Unofficial | ⚠️ | ⚠️ | TOS violation risk |

**Plaid Investments:** Covers Fidelity, Vanguard, and 10+ other brokerages at $1.00/account/month.

**Recommendation for Wave 12:**
1. **Phase A:** Plaid Investments for broad coverage (Fidelity, Vanguard, etc.)
2. **Phase B:** Direct TD/Schwab API for cost savings on high-volume users

### Transaction Import (Wave 14+ → Moved to Wave 11 Phase 5)

> **Status**: ✅ Implemented December 13, 2025

Since the Transactions product is already requested during Link (and billed monthly regardless), transaction sync was moved up from Wave 14.

**Implemented:**
- ✅ `PlaidTransaction` model and migration
- ✅ `/transactions/sync` cursor-based syncing in PlaidService
- ✅ `GET /api/Plaid/connections/{id}/transactions` endpoint
- ✅ `POST /api/Plaid/connections/{id}/transactions/sync` endpoint
- ✅ Automatic transaction sync in PlaidSyncJob (daily)
- ✅ Transaction cursor stored on AccountConnection for incremental syncs
- ✅ Postman collection updated (v1.5.0)

**Deferred to future waves:**
- Spending analysis and categorization UI
- Budget vs actual tracking
- Transaction deduplication with manual entries
- Transaction search and filtering UI

### Crypto Exchange Integration (Wave 13+)

| Exchange | Free API? | Holdings | Transactions |
|----------|-----------|----------|--------------|
| **Coinbase** | ✅ Free | ✅ | ✅ |
| **Binance** | ✅ Free | ✅ | ✅ |
| **Kraken** | ✅ Free | ✅ | ✅ |
| **Robinhood Crypto** | ❌ | ❌ | ❌ |

---

## Azure Migration Notes

> **See also:** `docs/history/roadmap.md` → "Phase 4: Production Deployment"

When migrating to Azure:

1. **Database:** PostgreSQL → Azure PostgreSQL Flexible Server
2. **Secrets:** Data Protection API → Azure Key Vault
3. **Webhooks:** Add Plaid webhook endpoint for real-time updates
4. **App Service:** Enable "Always On" for Hangfire jobs

---

## Success Criteria

- [ ] Users can link bank accounts via Plaid in <60 seconds
- [ ] Linked account balances auto-sync daily
- [ ] Manual override feature works correctly
- [ ] Sync status visible on all linked accounts
- [ ] Error handling for expired tokens with re-auth prompt
- [ ] Zero credential exposure in logs/API

---

## Dependencies

### NuGet Packages
```xml
<PackageReference Include="Going.Plaid" Version="7.*" />
```

### NPM Packages (already installed)
```json
"react-plaid-link": "^3.x"  // Already in package.json
"plaid": "^26.0.0"          // Already in package.json (can remove - backend only)
```

### Environment Variables
```
Plaid__ClientId=your_client_id
Plaid__Secret=your_secret
Plaid__Environment=sandbox
```

---

## Phase 4: Sandbox Testing & Development Plan

> **Status**: ⏳ In Progress  
> **Added**: December 11, 2025

### Current Implementation Status

The backend is already configured for **Sandbox mode** (see `PlaidService.cs` line 19):
```csharp
public string Environment { get; set; } = "sandbox";  // Default
```

The environment mapping in `PlaidService` supports:
- `sandbox` → `Going.Plaid.Environment.Sandbox` (default)
- `development` → `Going.Plaid.Environment.Development`  
- `production` → `Going.Plaid.Environment.Production`

### Plaid Sandbox Overview

The Plaid Sandbox is a **free, fully-featured** environment for development and testing. Key features:

| Feature | Description |
|---------|-------------|
| **Unlimited Items** | Create unlimited test connections |
| **Test Institutions** | 10+ test banks including "First Platypus Bank" (`ins_109508`) |
| **Default Credentials** | `user_good` / `pass_good` work for all institutions |
| **Special Credentials** | Simulate different scenarios (MFA, errors, account types) |
| **Custom Users** | Define custom account structures via Dashboard or API |
| **Sandbox Endpoints** | Special endpoints to bypass Link, trigger webhooks, reset logins |

### Testing Approach: Three Options

#### Option 1: Pre-populated Test Users (Recommended for Quick Testing)

Plaid provides several built-in test users. Use with `user_good` password or specified password:

| Username | Password | Use Case |
|----------|----------|----------|
| `user_good` | `pass_good` | Basic account access, default balances |
| `user_transactions_dynamic` | any | Realistic transactions that update over time |
| `user_ewa_user` | any | EWA/payroll advance user persona |
| `user_yuppie` | any | High-income professional persona |
| `user_small_business` | any | Small business account persona |
| `user_bank_income` | any | Wide variety of income streams |
| `user_credit_profile_poor` | any | Net loss cash flow, no consistent income |
| `user_credit_profile_good` | any | Neutral cash flow, gig economy income |
| `user_credit_profile_excellent` | any | Positive cash flow, high salary + rental |

**How to use:** Enter these credentials in Plaid Link when connecting a test institution.

#### Option 2: Custom Sandbox Users (via Plaid Dashboard)

Plaid provides a GitHub repo with pre-built JSON files for complex testing: [plaid/sandbox-custom-users](https://github.com/plaid/sandbox-custom-users)

**Available custom user templates:**
- `transactions/` - Transaction history users
- `investments/` - Investment account users  
- `income/` - Bank income testing
- `liabilities/` - Debt/liability accounts
- `auth/` - Auth flow testing
- `identity/` - Identity verification

**Setup:**
1. Download JSON files from the repo
2. Go to [Plaid Dashboard → Developers → Sandbox → Test Users](https://dashboard.plaid.com/developers/sandbox?tab=testUsers)
3. Upload the JSON to create custom users
4. Use the custom username/password specified in the JSON

#### Option 3: Bypass Link via API (Recommended for Automated Testing)

Use the `/sandbox/public_token/create` endpoint to create test Items without going through Link UI:

```csharp
// Backend endpoint to create test connections (dev-only)
[HttpPost("sandbox/create-test-item")]
public async Task<ActionResult> CreateTestItem([FromQuery] int userId, [FromBody] TestItemRequest request)
{
    // Only allow in sandbox environment
    if (_options.Environment != "sandbox")
        return BadRequest("Only available in sandbox");

    // Create public token via Sandbox API
    var response = await _plaidClient.SandboxPublicTokenCreateAsync(new()
    {
        ClientId = _options.ClientId,
        Secret = _options.Secret,
        InstitutionId = request.InstitutionId ?? "ins_109508", // First Platypus Bank
        InitialProducts = new[] { Products.Transactions },
        Options = new()
        {
            OverrideUsername = request.Username ?? "user_good",
            OverridePassword = request.Password ?? "pass_good"
        }
    });

    // Exchange for access token (reuse existing flow)
    var connection = await _plaidService.ExchangePublicTokenAsync(
        userId, 
        response.PublicToken,
        request.InstitutionId,
        "Test Bank"
    );

    return Ok(new { ConnectionId = connection.ConnectionId });
}
```

### Plaid Sandbox MCP Server

Plaid offers an **MCP (Model Context Protocol) server** for AI-assisted development. This enables Copilot/Claude to:
- Generate mock financial data
- Search Plaid documentation
- Create sandbox access tokens
- Trigger test webhooks

**Installation for VS Code:**

Add to `.vscode/mcp.json` (or create if doesn't exist):
```json
{
  "mcp": {
    "servers": {
      "plaid": {
        "command": "uvx",
        "args": [
          "mcp-server-plaid",
          "--client-id", "${input:plaid_client_id}",
          "--secret", "${input:plaid_secret}"
        ]
      }
    },
    "inputs": [
      {
        "type": "promptString",
        "id": "plaid_client_id",
        "description": "Plaid Client ID (from Dashboard)"
      },
      {
        "type": "promptString",
        "id": "plaid_secret",
        "description": "Plaid Sandbox Secret",
        "password": true
      }
    ]
  }
}
```

**MCP Tools Available:**
1. `get_mock_data_prompt` - Generate customized mock financial data
2. `search_documentation` - Search Plaid docs for API/product info
3. `get_sandbox_access_token` - Create sandbox access tokens programmatically
4. `simulate_webhook` - Trigger webhook events for testing

### Recommended Test Data Setup

**Goal:** Create test users in PFMP that mirror different Plaid personas

| PFMP Test User | Plaid Credentials | Purpose |
|----------------|-------------------|---------|
| User 1 (default) | `user_good` / `pass_good` | Basic testing, default accounts |
| User 2 | `user_yuppie` / any | High-income scenario |
| User 3 | `user_small_business` / any | Business accounts |
| User 4 | `user_credit_profile_poor` / any | Financial stress scenario |
| User 5 | Custom JSON (investments) | Investment account testing |

**Implementation Steps:**
1. Create "Link Test Bank" button (dev-only) that bypasses Link UI
2. Use `/sandbox/public_token/create` to create Items with different test credentials
3. Store connections against specific PFMP test users
4. Sync balances to populate Cash Accounts view

### Test Institutions

| Institution | ID | Notes |
|-------------|-----|-------|
| First Platypus Bank | `ins_109508` | Primary test bank, non-OAuth |
| Platypus OAuth Bank | `ins_127287` | OAuth flow testing |
| Houndstooth Bank | `ins_109512` | Additional test bank |
| Tattersall Federal Credit Union | `ins_109511` | Credit union testing |

### Error Simulation

Use password patterns to simulate errors:
```
password: error_ITEM_LOCKED          → ITEM_LOCKED error
password: error_INVALID_CREDENTIALS  → Invalid login
password: error_INSTITUTION_DOWN     → Bank unavailable
password: mfa_device                 → Trigger MFA flow (code: 1234)
```

### Development vs Production Checklist

| Aspect | Development (Sandbox) | Production |
|--------|----------------------|------------|
| **API Endpoint** | `sandbox.plaid.com` | `production.plaid.com` |
| **Credentials** | Sandbox keys from Dashboard | Production keys (requires approval) |
| **Data** | Fake, test data | Real bank data |
| **Webhooks** | Optional, can use `/sandbox/item/fire_webhook` | Required for real-time updates |
| **Token Encryption** | Data Protection API | Azure Key Vault |
| **Sync Frequency** | On-demand for testing | Nightly job + webhooks |
| **Error Handling** | Can ignore edge cases | Must handle all edge cases |
| **Link Recovery** | Not critical | Critical for token expiration |

### Next Steps (Phase 4 Completion)

- [ ] Add Plaid Sandbox MCP server to `.vscode/mcp.json`
- [ ] Create dev-only endpoint for `/sandbox/public_token/create` bypass
- [ ] Test with `user_good` / `pass_good` credentials
- [ ] Test with persona users (`user_yuppie`, `user_small_business`)
- [ ] Create custom users via Dashboard for edge cases
- [ ] Document test account mappings
- [ ] Verify balance sync end-to-end
- [ ] Test error scenarios (locked, expired, MFA)

---

## References

- [Plaid Quickstart Guide](https://plaid.com/docs/quickstart/)
- [Plaid Sandbox Overview](https://plaid.com/docs/sandbox/)
- [Plaid Test Credentials](https://plaid.com/docs/sandbox/test-credentials/)
- [Plaid Custom Users](https://plaid.com/docs/sandbox/user-custom/)
- [Sandbox Custom Users Repo](https://github.com/plaid/sandbox-custom-users)
- [Plaid MCP Server](https://github.com/plaid/ai-coding-toolkit/tree/main/sandbox)
- [Going.Plaid .NET SDK](https://github.com/viceroypenguin/Going.Plaid)
- [react-plaid-link](https://github.com/plaid/react-plaid-link)

---

**Document Version:** 1.1  
**Created:** December 10, 2025  
**Last Updated:** December 11, 2025
