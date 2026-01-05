# Wave 12.5: Unified Plaid Account Linking

> **Status**: Phase 1 Complete - Phase 2 Ready
> **Target**: Q1 2026
> **Priority**: High
> **Prerequisites**: Wave 12 Complete ✅

---

## Phase 1 Completion Summary (Jan 2026)

### ✅ Completed Tasks
1. **Extended AccountSource enum** - Added `PlaidCreditCard`, `PlaidMortgage`, `PlaidStudentLoan`
2. **Extended AccountConnection** - Added `Products` (JSON string) and `IsUnified` flag
3. **Extended LiabilityAccount** - Added Plaid integration fields (Source, PlaidItemId, PlaidAccountId, LastSyncedAt, SyncStatus, IsOverdue, DaysUntilDue, payment tracking, YTD amounts, escrow)
4. **Extended PropertyProfile** - Added Source, LinkedMortgageLiabilityId, address fields, sync tracking
5. **Created PropertyValueHistory** - New model for tracking property equity over time
6. **Created PlaidLiabilitiesService** - Full implementation for credit cards, mortgages, student loans
7. **Created PlaidConnectionService** - Unified orchestrator for all Plaid products
8. **Added unified API endpoints** - `/api/plaid/unified/*` routes

### Migration Applied
- `AddUnifiedPlaidSupport` - All schema changes deployed to database

### New API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/plaid/unified/link-token` | Create unified Link token for multiple products |
| POST | `/api/plaid/unified/exchange-token` | Exchange token and create unified connection |
| POST | `/api/plaid/unified/connections/{id}/sync` | Sync all products for a connection |
| GET | `/api/plaid/unified/connections` | List user connections with product info |
| PUT | `/api/plaid/unified/connections/{id}/products` | Update products for a connection |

---

## Executive Summary

Wave 12.5 consolidates all Plaid integrations into a unified account linking experience. Users will have one interface to connect any account type (banks, investments, credit cards, mortgages) with granular control over which accounts to sync.

### Key Features
1. **Unified Link Interface**: Single Plaid Link session supporting all products
2. **Account Selection UX**: Post-link checkbox selection + ongoing management in connections list
3. **Credit Card Integration**: Transaction sync, utilization tracking, payment due dates
4. **Mortgage → Property Integration**: Auto-create/link property records with tracked history
5. **TSP Exclusion**: TSP is NOT supported by Plaid; keep manual fund-level tracking

---

## Research Findings

### TSP (Thrift Savings Plan)
**Status: NOT SUPPORTED by Plaid**

Plaid documentation confirms TSP is not available:
> "TSP is not commonly supported as a data source via the Plaid platform. The Thrift Savings Plan is a unique federal government retirement plan, and historically, government-backed plans like TSP have not provided the necessary connectivity."

**PFMP Strategy**: Keep existing manual TSP tracking with fund-level detail. Users can still track L/C/S/G/F/I funds with real prices and daily sync.

### Plaid Liabilities Product
**Status: Rich data available for credit cards and mortgages**

| Field | Credit Card | Mortgage |
|-------|:-----------:|:--------:|
| Payment due date | ✅ `next_payment_due_date` | ✅ `next_payment_due_date` |
| APR/Interest Rate | ✅ `aprs[].apr_percentage` | ✅ `interest_rate.percentage` |
| Credit limit | ✅ `balances.limit` | ❌ N/A |
| Minimum payment | ✅ `minimum_payment_amount` | ✅ `next_monthly_payment` |
| Current balance | ✅ `balances.current` | ✅ `balances.current` |
| Property address | ❌ N/A | ✅ `property_address` |
| Is overdue | ✅ `is_overdue` | ❌ |
| YTD Interest paid | ❌ | ✅ `ytd_interest_paid` |
| Original principal | ❌ | ✅ `origination_principal_amount` |
| Loan term/maturity | ❌ | ✅ `loan_term`, `maturity_date` |

---

## Current Architecture

### Account Connections Table
```
AccountConnections
├── ConnectionId (GUID, PK)
├── UserId
├── Source (AccountSource enum: Manual, CSV, Plaid, PlaidInvestments, ...)
├── PlaidItemId
├── PlaidAccessToken (encrypted)
├── PlaidInstitutionId
├── PlaidInstitutionName
├── Status (SyncStatus enum)
├── TransactionsCursor
└── TransactionsLastSyncedAt
```

### Account Tables
| Table | Purpose | Plaid Integration |
|-------|---------|-------------------|
| `CashAccounts` | Checking, savings, money market | Wave 11 - Plaid `transactions` |
| `Accounts` | Investment accounts (brokerage, IRA, 401k) | Wave 12 - Plaid `investments` |
| `FinancialProfileLiabilities` | Credit cards, loans, mortgages | ❌ Manual only |
| `Properties` | Real estate with equity tracking | ❌ Manual only |

### Current Services
- `PlaidService.cs` - Bank account linking (`transactions` product)
- `PlaidInvestmentsService.cs` - Investment linking (`investments` product)

---

## Proposed Architecture

### Phase 1: Backend Refactoring

#### 1.1 Extend AccountSource Enum
```csharp
public enum AccountSource
{
    Manual = 0,
    CSV = 1,
    Plaid = 2,              // transactions product (banks)
    PlaidInvestments = 3,   // investments product
    PlaidCreditCard = 4,    // liabilities product - credit
    PlaidMortgage = 5,      // liabilities product - mortgage
    PlaidStudentLoan = 6,   // liabilities product - student loans
    // Future sources...
}
```

#### 1.2 Extend AccountConnection Model
```csharp
// Add to AccountConnection.cs
public List<string> Products { get; set; } = new(); // ["transactions", "investments", "liabilities"]
public bool IsUnified { get; set; } = false; // true if created via unified flow
```

#### 1.3 Add Plaid Fields to LiabilityAccount
```csharp
// Add to LiabilityAccount.cs
public AccountSource Source { get; set; } = AccountSource.Manual;
public string? PlaidItemId { get; set; }
public string? PlaidAccountId { get; set; }
public DateTime? LastSyncedAt { get; set; }
public SyncStatus SyncStatus { get; set; } = SyncStatus.NotConnected;

// Credit card specific from Plaid
public bool? IsOverdue { get; set; }
public DateTime? LastStatementDate { get; set; }
public decimal? LastStatementBalance { get; set; }

// Mortgage specific from Plaid
public string? PropertyAddressStreet { get; set; }
public string? PropertyAddressCity { get; set; }
public string? PropertyAddressState { get; set; }
public string? PropertyAddressZip { get; set; }
public decimal? YtdInterestPaid { get; set; }
public decimal? OriginationPrincipal { get; set; }
public DateTime? MaturityDate { get; set; }
```

#### 1.4 Extend PropertyProfile Model
```csharp
// Add to PropertyProfile.cs
public AccountSource Source { get; set; } = AccountSource.Manual;
public int? LinkedMortgageLiabilityId { get; set; } // FK to LiabilityAccount
public string? PlaidPropertyAddress { get; set; } // Full address from Plaid
public DateTime? LastSyncedAt { get; set; }

// Address fields for auto-population
public string? AddressStreet { get; set; }
public string? AddressCity { get; set; }
public string? AddressState { get; set; }
public string? AddressZip { get; set; }
```

#### 1.5 Create Unified PlaidLiabilitiesService
```csharp
// New service: Services/Plaid/PlaidLiabilitiesService.cs
public class PlaidLiabilitiesService
{
    // Sync credit cards to LiabilityAccount table
    public async Task<List<LiabilityAccount>> SyncCreditCards(string accessToken, int userId);
    
    // Sync mortgages to LiabilityAccount + auto-create PropertyProfile
    public async Task<(List<LiabilityAccount> mortgages, List<PropertyProfile> properties)> 
        SyncMortgages(string accessToken, int userId);
    
    // Get all liabilities from Plaid
    public async Task<PlaidLiabilitiesResponse> GetLiabilities(string accessToken);
}
```

#### 1.6 Unified PlaidConnectionService
```csharp
// New service: Services/Plaid/PlaidConnectionService.cs
// Orchestrates unified linking across all Plaid products
public class PlaidConnectionService
{
    private readonly PlaidService _bankService;
    private readonly PlaidInvestmentsService _investmentsService;
    private readonly PlaidLiabilitiesService _liabilitiesService;
    
    // Create unified connection with multiple products
    public async Task<ConnectionResult> CreateUnifiedConnection(
        int userId, 
        string publicToken, 
        List<string> selectedProducts,  // ["transactions", "investments", "liabilities"]
        List<string> selectedAccountIds);
    
    // Get all accounts from a connection (across all products)
    public async Task<UnifiedAccountsResponse> GetConnectionAccounts(Guid connectionId);
    
    // Update which accounts are synced for a connection
    public async Task UpdateSyncedAccounts(Guid connectionId, List<string> accountIds);
    
    // Full sync across all products for a connection
    public async Task SyncConnection(Guid connectionId);
}
```

### Phase 2: Frontend Integration

#### 2.1 Unified Plaid Link Hook
```typescript
// hooks/usePlaidLink.ts - extend to support multiple products
interface UsePlaidLinkOptions {
  products: PlaidProduct[]; // ['transactions', 'investments', 'liabilities']
  onSuccess: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => void;
}

// Single Link session can request multiple products
const config = {
  products: ['transactions', 'investments', 'liabilities'],
  // ...
};
```

#### 2.2 Post-Link Account Selection Dialog
```typescript
// components/plaid/AccountSelectionDialog.tsx
interface AccountSelectionDialogProps {
  open: boolean;
  accounts: PlaidDiscoveredAccount[];
  onConfirm: (selectedAccountIds: string[]) => void;
  onCancel: () => void;
}

// Shows after Plaid Link completes
// User selects which accounts to actually sync
// Groups by type: Checking, Savings, Credit Card, Mortgage, Investment
```

#### 2.3 Enhanced ConnectionsSettingsView
```typescript
// views/connections/ConnectionsSettingsView.tsx
// Already has Banks/Investments tabs
// Add: Credit Cards, Mortgages tabs (or collapse into "Liabilities")
// Add: Per-account toggle switches for sync on/off
// Add: "Link New Account" button → opens unified Plaid Link
```

#### 2.4 Property Integration
```typescript
// When mortgage synced:
// 1. Check if PropertyProfile exists with matching address
// 2. If exists: Link mortgage to property, update fields
// 3. If not: Auto-create PropertyProfile from Plaid data
// 4. Show user notification: "Property 'X' created from mortgage data"
```

### Phase 3: Property Value History

#### 3.1 New PropertyValueHistory Table
```csharp
[Table("PropertyValueHistory")]
public class PropertyValueHistory
{
    [Key]
    public int HistoryId { get; set; }
    public Guid PropertyId { get; set; }
    public decimal EstimatedValue { get; set; }
    public string? Source { get; set; } // "manual", "plaid", "zillow"
    public DateTime RecordedAt { get; set; }
}
```

#### 3.2 Task Integration
- Create task when property value needs updating (monthly or quarterly)
- Task: "Update estimated value for [Property Name]"
- Similar to net worth timeline tasks

### Phase 4: Credit Card Features

#### 4.1 Transaction Sync
- Sync credit card transactions to CashTransaction table
- Add `AccountType` or use LiabilityAccountId as foreign key
- Show in spending analysis

#### 4.2 Alerts Integration
- Add alert types: `CreditUtilizationHigh`, `PaymentDueSoon`
- Threshold: Credit utilization > 30%
- Threshold: Payment due within 3 days

#### 4.3 Dashboard Widget
- Credit card summary showing:
  - Total credit available
  - Total credit used
  - Utilization percentage
  - Next payment due date

---

## Migration Plan

### Data Migration Strategy
**Decision**: Clean slate approach for test users

1. Unlink all existing Plaid connections for test users
2. Delete all Plaid-sourced accounts, transactions, holdings
3. Clear orphaned data (mortgages, properties if needed)
4. Re-link using new unified flow

### SQL Migration Script (Pre-Deployment)
```sql
-- For test environment only
-- Identify test users with Plaid connections
SELECT DISTINCT UserId FROM "AccountConnections" WHERE "PlaidItemId" IS NOT NULL;

-- Clear Plaid data for test users (run per user or for all)
-- 1. Delete holdings for Plaid accounts
-- 2. Delete Plaid accounts
-- 3. Delete Plaid cash accounts
-- 4. Delete Plaid transactions
-- 5. Delete account connections
-- (Actual script to be generated during implementation)
```

---

## Task Breakdown

### Phase 1: Backend Foundation (Est. 3-4 days)
- [ ] 1.1 Extend AccountSource enum with new values
- [ ] 1.2 Add Products field to AccountConnection
- [ ] 1.3 Add Plaid fields to LiabilityAccount model
- [ ] 1.4 Add Plaid fields to PropertyProfile model
- [ ] 1.5 Create PropertyValueHistory model
- [ ] 1.6 EF Migration: AddUnifiedPlaidSupport
- [ ] 1.7 Create PlaidLiabilitiesService
- [ ] 1.8 Create PlaidConnectionService (orchestrator)
- [ ] 1.9 Add unified endpoints to PlaidController

### Phase 2: Frontend Integration (Est. 3-4 days)
- [ ] 2.1 Update usePlaidLink hook for multi-product
- [ ] 2.2 Create AccountSelectionDialog component
- [ ] 2.3 Add "Link Account" flow to ConnectionsSettingsView
- [ ] 2.4 Add per-account sync toggles to connections list
- [ ] 2.5 Add Credit Cards section to connections view
- [ ] 2.6 Add Mortgages section with property linking

### Phase 3: Credit Card Features (Est. 2-3 days)
- [ ] 3.1 Sync credit card transactions
- [ ] 3.2 Add credit utilization calculation
- [ ] 3.3 Create CreditUtilizationHigh alert
- [ ] 3.4 Create PaymentDueSoon alert
- [ ] 3.5 Credit card summary on dashboard

### Phase 4: Property Integration (Est. 2-3 days)
- [ ] 4.1 Auto-create property from mortgage
- [ ] 4.2 Link existing property to mortgage
- [ ] 4.3 Property value history tracking
- [ ] 4.4 Create property value update task
- [ ] 4.5 Property detail page (if not exists)

### Phase 5: Testing & Documentation (Est. 2 days)
- [ ] 5.1 Create custom Plaid sandbox users for liabilities
- [ ] 5.2 Test unified flow end-to-end
- [ ] 5.3 Test credit card sync + alerts
- [ ] 5.4 Test mortgage → property linking
- [ ] 5.5 Update documentation
- [ ] 5.6 Clean up test data, final validation

---

## Wave 12 Prerequisites (All Complete)

Wave 12 has been completed (January 5, 2026):

1. ✅ Unified ConnectionsSettingsView
2. ✅ Delete protection for synced data
3. ✅ Investment transactions sync - buy/sell/dividend/contribution
4. ✅ Opening balance detection - banner with dialog for adding cost basis
5. ✅ Test custom Plaid sandbox users - all 5 user scenarios validated
6. ✅ Fixed FMP API nullable fields for price refresh
7. ✅ Fixed account balance recalculation after price updates
8. ✅ Fixed tax lot holding period calculation

**Ready to proceed with Wave 12.5**

---

## API Endpoints (New/Modified)

### New Endpoints
```
POST   /api/plaid/unified-link          Create unified connection with multiple products
GET    /api/plaid/connections/{id}/accounts   Get all accounts for a connection
PUT    /api/plaid/connections/{id}/accounts   Update which accounts are synced
POST   /api/plaid/sync-liabilities      Sync credit cards and mortgages
GET    /api/liabilities/{id}/transactions     Get credit card transactions
GET    /api/properties/{id}/value-history     Get property value history
POST   /api/properties/{id}/value-history     Record property value update
```

### Modified Endpoints
```
GET    /api/plaid/connections           Include products array in response
POST   /api/plaid/link-investments      Deprecate (merged into unified-link)
POST   /api/plaid/link-accounts         Deprecate (merged into unified-link)
```

---

## Success Criteria

1. **Unified Flow Works**: User can link any Plaid-supported institution and select specific accounts
2. **Account Selection Persists**: User can toggle accounts on/off after initial link
3. **Credit Cards Sync**: Transactions, balances, due dates, utilization all visible
4. **Alerts Fire**: Credit utilization and payment due alerts work with existing system
5. **Mortgages Create Properties**: Property auto-created with address and linked mortgage
6. **Property History Tracked**: Value history recorded with task reminders
7. **TSP Unchanged**: Manual TSP tracking continues to work (Plaid doesn't support it)
8. **No Duplicate Data**: Linking same account doesn't create duplicates

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Plaid liabilities product not enabled | Medium | High | Check Plaid dashboard, may need to request access |
| Credit card transactions high volume | Medium | Medium | Implement pagination, consider date range limits |
| Property matching fails | Low | Medium | Always auto-create, let user merge duplicates |
| Existing data conflicts | Low | Low | Clean slate approach for test users |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-18 | Initial plan created from user requirements |
