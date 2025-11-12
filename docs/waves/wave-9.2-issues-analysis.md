# Wave 9.2 Issues - Comprehensive Analysis & Fix Plan

**Date:** November 8, 2025  
**Status:** Critical Issues Identified

## Problem Summary

Wave 9.2 created a new `Accounts` and `Holdings` table structure, but the existing dashboard and onboarding systems still use the old table structure. This has created a **split-brain** data architecture where:

1. New data goes into `Accounts` and `Holdings` tables
2. Dashboard reads from `CashAccounts`, `InvestmentAccounts`, `TspLifecyclePositions`, `RealEstateProperties`
3. Users cannot navigate to account detail views
4. Portfolio values are incorrect

## Root Causes

### 1. **Dual Table Architecture**
The system has TWO parallel data structures:

**Old Onboarding Tables (Wave 5):**
- `CashAccounts` - Cash/savings accounts
- `InvestmentAccounts` - Investment accounts (no holdings detail)
- `TspLifecyclePositions` - TSP fund positions
- `RealEstateProperties` - Real estate holdings
- Used by: DashboardController, OnboardingController

**New Wave 9 Tables:**
- `Accounts` - Unified account model (all types)
- `Holdings` - Detailed holdings (symbol, quantity, price)
- Used by: HoldingsController, AccountDetailView

### 2. **DashboardController Only Reads Old Tables**
```csharp
// From DashboardController.cs line 50-60
var cashAccounts = await _context.CashAccounts
    .Where(a => a.UserId == effectiveUserId)
    .ToListAsync();

var investmentAccounts = await _context.InvestmentAccounts
    .Where(a => a.UserId == effectiveUserId)
    .ToListAsync();

// NEVER reads from Accounts or Holdings tables!
```

### 3. **Routing Guards Block Access**
`DashboardGuard` checks onboarding completion status. If User 2 is not marked as completed in `OnboardingProgress`, they get redirected to `/onboarding`, preventing access to `/dashboard/accounts/:accountId`.

### 4. **No Data Migration Strategy**
Wave 9 implementation added new tables without:
- Migrating existing data from old tables to new tables
- Updating DashboardController to read from new tables
- Providing sync mechanism between table structures

## Current State Per User

### User 2 (michael.smith@test.gov)

**Old Tables (Read by Dashboard):**
- CashAccounts: 5 accounts, $82,000
- InvestmentAccounts: 3 accounts, $303,775 (includes new Roth IRA $166k + Taxable $117k that I just added)
- TSP: $323,826
- Properties: 1 property, $600k value, $238k mortgage
- **Dashboard Shows: $1,070,601 net worth** ✅ (updated after I added to old tables)

**New Tables (Read by Account Detail View):**
- Accounts: 5 accounts, $721,979
- Holdings: 22 holdings with real symbols (AAPL, MSFT, NVDA, etc.)
- **Account Detail Views: Cannot access due to onboarding redirect** ❌

**Onboarding Status:**
- OnboardingProgress: No record (NULL)
- Result: DashboardGuard redirects to /onboarding
- Cannot access /dashboard or /dashboard/accounts/:accountId

### User 20 (dev+fresh+...)

**Old Tables (Read by Dashboard):**
- CashAccounts: 12 accounts, $142,200
- InvestmentAccounts: 1 account, $20,000
- TSP: $685,000
- **Dashboard Shows: $847,200 net worth** ❌ (missing $399k from new Accounts table)

**New Tables (Read by Account Detail View):**
- Accounts: 7 accounts, $398,960 (4 investment accounts with holdings)
- Holdings: 27 holdings including crypto (BTC, ETH), stocks, ETFs
- **Account Detail Views: Should work if onboarding complete**

**Onboarding Status:**
- OnboardingProgress: No record (NULL)
- Result: May be redirected depending on guard logic

## Architecture Decision Required

We need to choose ONE of these paths:

### Option A: Migrate to New Tables Only (RECOMMENDED)
**Pros:**
- Clean architecture
- Supports detailed holdings (Wave 9.2 goal)
- Better data model for portfolio management
- Eliminates dual-source confusion

**Cons:**
- Requires migrating all onboarding data
- Must update DashboardController
- Must update OnboardingController to write to new tables
- Larger refactoring effort

**Work Required:**
1. Create migration script: Old tables → New Accounts/Holdings tables
2. Update DashboardController to read from Accounts/Holdings
3. Update OnboardingController to write to Accounts
4. Add TSP integration to Holdings model
5. Deprecate old tables after migration verified
6. Update all API documentation

### Option B: Keep Old Tables, Sync from New
**Pros:**
- Minimal disruption to dashboard
- Onboarding flow unchanged
- Quick fix

**Cons:**
- Maintains technical debt
- Data sync complexity
- Confusing for future development
- Holdings detail lost in old tables

**Work Required:**
1. Create sync service: Accounts/Holdings → Old tables
2. Run sync after every Holdings update
3. Add triggers or scheduled jobs
4. Document dual-table architecture

### Option C: Hybrid - Use Both Tables
**Pros:**
- Gradual migration possible

**Cons:**
- Most complex
- Highest maintenance burden
- Confusing data ownership
- Not sustainable

## Immediate Fixes Needed (Regardless of Option)

### 1. Fix Onboarding Status for Testing
```sql
-- Mark User 2 as onboarding complete
INSERT INTO "OnboardingProgress" ("UserId", "CurrentStepId", "UpdatedUtc", "CompletedStepIds")
VALUES (2, 'review', NOW(), '["welcome", "income", "expenses", "cash", "investments", "liabilities", "profile", "review"]'::jsonb)
ON CONFLICT ("UserId") DO UPDATE SET
  "CurrentStepId" = 'review',
  "CompletedStepIds" = '["welcome", "income", "expenses", "cash", "investments", "liabilities", "profile", "review"]'::jsonb;

-- Mark User 20 as onboarding complete
INSERT INTO "OnboardingProgress" ("UserId", "CurrentStepId", "UpdatedUtc", "CompletedStepIds")
VALUES (20, 'review', NOW(), '["welcome", "income", "expenses", "cash", "investments", "liabilities", "profile", "review"]'::jsonb)
ON CONFLICT ("UserId") DO UPDATE SET
  "CurrentStepId" = 'review',
  "CompletedStepIds" = '["welcome", "income", "expenses", "cash", "investments", "liabilities", "profile", "review"]'::jsonb;
```

### 2. Sync Accounts Data to Old Tables for Dashboard Display
For User 20, add investment accounts to `InvestmentAccounts` table so dashboard shows correct totals.

### 3. Add Navigation from Dashboard to Account Detail
Dashboard account cards need to link to `/dashboard/accounts/{accountId}` using the NEW Accounts table AccountId.

## Recommended Implementation Plan

### Phase 1: Immediate Testing Fixes (Today)
1. ✅ Mark users 2 & 20 as onboarding complete
2. ✅ Sync User 20's Accounts data to InvestmentAccounts table
3. ✅ Test account detail navigation
4. ✅ Verify Wave 9.2 features (price refresh, charts)

### Phase 2: Short-term Solution (This Sprint)
Choose Option A or B based on roadmap priorities.

**If Option A (Migrate to New Tables):**
1. Create data migration script
2. Update DashboardController
3. Test thoroughly with existing users
4. Deploy migration
5. Deprecate old tables

**If Option B (Sync to Old Tables):**
1. Create sync service
2. Add to Holdings update flow
3. Test sync reliability
4. Document architecture

### Phase 3: Long-term Clean-up (Next Sprint)
- Remove technical debt
- Consolidate to single source of truth
- Update all documentation
- Add integration tests

## Testing Requirements

Before considering Wave 9.2 complete:
1. ✅ User can access dashboard without redirects
2. ✅ Dashboard shows correct portfolio totals
3. ✅ User can navigate to account detail views
4. ✅ Holdings display with current prices
5. ✅ Refresh Prices button updates holdings
6. ✅ Price chart displays historical data
7. ✅ All 8 timeframe selectors work
8. ✅ Crypto symbols (BTC-USD, ETH-USD) work
9. ✅ Data consistency between dashboard and detail views

## Questions for Product Owner

1. **Timeline Priority:** Do we need Wave 9.2 features working this sprint?
2. **Migration Scope:** Should we migrate all users or just test users?
3. **Old Table Deprecation:** Can we remove CashAccounts, InvestmentAccounts after migration?
4. **Onboarding Flow:** Should new onboarding write to Accounts table going forward?
5. **TSP Integration:** How should TSP positions map to new Holdings model?

## Next Steps

**Waiting for decision on Option A vs Option B before proceeding with full fix.**

For now, I'll apply immediate fixes to unblock testing.
