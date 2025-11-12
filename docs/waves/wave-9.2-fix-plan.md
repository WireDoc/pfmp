# Wave 9.2 Critical Issues - Root Cause Analysis & Fix Plan

**Date:** November 8, 2025  
**Status:** CRITICAL - Multiple Architectural Issues Identified

## Executive Summary

Wave 9.2 implementation has exposed fundamental architectural problems in PFMP:

1. **Split-Brain Data Architecture**: Two parallel table structures with no sync
2. **Missing Investment Display**: Dashboard intentionally filters out investments
3. **Broken Navigation**: No route from dashboard to account detail views  
4. **Onboarding Confusion**: Complex guard logic with missing status fields

**Bottom Line:** Wave 9.2 cannot be tested until data architecture is consolidated.

---

## Root Causes Identified

### Issue 1: Dual Table Architecture (Split Brain)

**Problem:** System maintains TWO complete sets of financial data tables with no synchronization.

**Old Tables (Onboarding/Dashboard):**
- `CashAccounts` - Cash holdings
- `InvestmentAccounts` - Investment accounts (no position detail)
- `TspLifecyclePositions` - TSP fund positions
- `RealEstateProperties` - Real estate
- **Read by:** DashboardController, OnboardingController

**New Tables (Wave 9):**
- `Accounts` - Unified account model (all types)
- `Holdings` - Detailed security positions (symbol, quantity, price)
- **Read by:** HoldingsController, AccountDetailView

**Why This Exists:**
- Old tables created in Wave 5 for onboarding flow
- New tables created in Wave 9 for detailed portfolio management
- No migration strategy implemented
- No sync mechanism between them

**Impact:**
- Data entered in onboarding goes to old tables
- Dashboard reads old tables only
- Holdings data in new tables invisible to dashboard
- Portfolio totals incomplete
- Holdings detail inaccessible from dashboard

---

### Issue 2: Dashboard Intentionally Hides Investments

**File:** `pfmp-frontend/src/views/dashboard/AccountsPanel.tsx`

**Line 30:**
```typescript
const cashAccounts = data?.accounts.filter(a => a.type === 'cash') || [];
```

**Problem:** `AccountsPanel` component **intentionally filters out all non-cash accounts**. Comment says "investments/TSP managed elsewhere" but there is no "elsewhere."

**API Returns Investment Accounts:**
```json
{
  "id": "investment_937cd3b8-3863-47b2-bc62-da4395a337f7",
  "name": "Roth IRA",
  "institution": "Vanguard",
  "type": "brokerage",
  "balance": { "amount": 85020.00 }
}
```

**But Dashboard Filters Them Out**, showing only:
- Cash accounts ($142,200)
- TSP account ($323,826)

**Missing from display:**
- 4 investment accounts ($314,410)
- Result: Net worth correct in header, but accounts list incomplete

---

### Issue 3: No Navigation to Account Detail Views

**Problem:** No way to navigate from dashboard to `/dashboard/accounts/:accountId`

**What's Missing:**
1. Account cards not clickable
2. No "View Details" button on accounts
3. AccountId from new `Accounts` table not mapped to dashboard display
4. User has no path to access Wave 9.2 features (price chart, refresh button)

**Confusion About AccountId:**
- Old tables use UUID: `investment_937cd3b8-3863-47b2-bc62-da4395a337f7`
- New Accounts table uses integer: `46`
- Dashboard shows old UUIDs
- AccountDetailView expects new integer IDs
- No mapping between them

**Result:** `/dashboard/accounts/46` route exists but is unreachable from UI.

---

### Issue 4: Onboarding Guard Logic Issues

**File:** `pfmp-frontend/src/components/routing/DashboardGuard.tsx`

**Code:**
```typescript
const complete = statuses.review === 'completed';
if (!complete) {
  return <Navigate to="/onboarding" replace />;
}
```

**Problem:** Guard checks `statuses.review` but:

1. **For User 2:** No "review" status exists in `FinancialProfileSectionStatuses` table
2. **OnboardingProgress table** has `review` in `CompletedStepIds`, but frontend doesn't read it
3. **Two different status systems:**
   - `OnboardingProgress` (single row per user with JSON arrays)
   - `FinancialProfileSectionStatuses` (one row per section)
4. Frontend `useOnboarding()` hook reads from `FinancialProfileSectionStatuses`, not `OnboardingProgress`

**Why User 2 Gets Redirected:**
- `FinancialProfileSectionStatuses` has 14 rows for User 2, but no "review" row
- DashboardGuard checks for `statuses.review === 'completed'`
- Check fails → redirect to onboarding

**Why My "Fix" Didn't Work:**
- I added data to `OnboardingProgress` table
- But frontend reads from `FinancialProfileSectionStatuses` table
- Wrong table = no effect

---

### Issue 5: `/dashboard/accounts` Route Shows Placeholder

**File:** `pfmp-frontend/src/views/dashboard/AccountsView.tsx`

**Current Content:**
```typescript
export function AccountsView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Accounts</Typography>
      <Typography>Accounts view coming soon...</Typography>
    </Box>
  );
}
```

**Problem:** This is just a placeholder. It should show:
- List of all accounts (cash + investments)
- Click to navigate to account detail
- Add/edit/delete accounts
- Import functionality

---

## Data Verification

### User 20 Current State

**Old Tables (Read by Dashboard):**
- CashAccounts: 12 accounts, $142,200
- InvestmentAccounts: 4 accounts, $314,410 (I added 3 new ones)
- TSP: $323,826
- **Total: $780,436** (but dashboard shows $1,141,436 because it also counts properties/liabilities)

**New Tables (Read by Account Detail):**
- Accounts: 7 accounts (4 investment + 3 cash), $398,960
- Holdings: 27 positions (AAPL, MSFT, BTC-USD, ETH-USD, etc.)

**Dashboard API Response:**
- Returns ALL 16 investment accounts (old UUID format)
- Frontend filters to show only 12 cash accounts
- Investment accounts in response but hidden by UI filter

**What User Sees:**
- Net worth: $1,141,436 ✅ (correct)
- Accounts list: Only 13 items (12 cash + 1 TSP) ❌ (missing 4 investments)
- Cannot navigate to account detail ❌

### User 2 Current State

**Old Tables:**
- CashAccounts: 5 accounts, $82,000
- InvestmentAccounts: 3 accounts (I added Roth IRA + Taxable, total $303,775)
- TSP: $323,827
- **Total: $709,602**

**New Tables:**
- Accounts: 5 accounts, $721,979
- Holdings: 22 positions

**What User Sees:**
- Redirected to onboarding immediately ❌
- Cannot access dashboard at all ❌
- Cannot test Wave 9.2 features ❌

---

## Why This Happened

**Historical Context:**

1. **Wave 5 (Oct 2025):** Built onboarding flow with dedicated tables per financial category (CashAccounts, InvestmentAccounts, etc.). Dashboard reads from these.

2. **Wave 9 (Nov 2025):** Built portfolio management with unified Accounts + Holdings tables for detailed position tracking.

3. **No Integration:** Wave 9 created new tables without:
   - Migrating existing data
   - Updating dashboard to read new tables
   - Creating sync mechanism
   - Planning for dual-table coexistence

4. **Assumption Mismatch:**
   - Wave 9 developer assumed old tables would be deprecated
   - Dashboard still depends on old tables
   - Result: Data exists in new tables but invisible to UI

---

## Fix Plan: Consolidate to Single Source of Truth

### Decision Required: Choose ONE Architecture

#### Option A: Migrate Everything to New Tables (RECOMMENDED)

**Rationale:**
- New tables support detailed holdings (Wave 9.2 requirement)
- Better data model for portfolio features
- Eliminates ongoing sync complexity
- Clear path forward

**Work Required:**

1. **Data Migration Script** (2-3 hours)
   ```sql
   -- Migrate CashAccounts → Accounts
   -- Migrate InvestmentAccounts → Accounts
   -- Create TSP Holdings from TspLifecyclePositions
   -- Migrate RealEstateProperties → separate handling
   ```

2. **Update DashboardController** (1-2 hours)
   - Read from `Accounts` table instead of old tables
   - Calculate TSP value from `Holdings` table
   - Keep TSP fund price API integration

3. **Update OnboardingController** (2-3 hours)
   - Write to `Accounts` table instead of old tables
   - Map form data to new schema
   - Handle backward compatibility

4. **Update AccountsPanel Component** (1 hour)
   - Remove filter that hides investments
   - Add navigation to account detail
   - Map UUIDs to AccountIds

5. **Fix Navigation** (1 hour)
   - Make account cards clickable
   - Pass correct AccountId (integer from new table)
   - Add "View Details" buttons

6. **Add AccountsView Implementation** (2-3 hours)
   - List all accounts with search/filter
   - Click to navigate to detail
   - Add/edit/delete functionality
   - CSV import integration

7. **Testing** (2-3 hours)
   - Verify all existing data migrated correctly
   - Test onboarding writes to new tables
   - Verify dashboard reads from new tables
   - Test navigation to account detail
   - Validate Wave 9.2 features work

**Total Effort:** 12-18 hours

**Risks:**
- Data migration bugs could corrupt data
- Breaking changes to onboarding flow
- Need rollback plan

#### Option B: Keep Old Tables, Dual-Write Pattern

**Rationale:**
- Minimal changes to existing flows
- Lower risk to onboarding
- Faster short-term fix

**Work Required:**

1. **Create Sync Service** (2-3 hours)
   - Whenever Holdings updated → sync to old tables
   - Whenever old tables updated → sync to new tables
   - Handle conflicts

2. **Update AccountsPanel** (1 hour)
   - Show investments
   - Add navigation

3. **Add AccountsView** (2-3 hours)

**Total Effort:** 5-7 hours

**Risks:**
- Technical debt accumulates
- Data consistency issues
- Two sources of truth = confusion
- Holdings detail lost when syncing to old tables

---

## Immediate Actions to Unblock Testing

### 1. Fix Onboarding Redirect for User 2

**Add missing "review" status:**
```sql
INSERT INTO "FinancialProfileSectionStatuses" ("UserId", "SectionKey", "Status", "UpdatedAt")
VALUES (2, 'review', 'needs_info', NOW())
ON CONFLICT ("UserId", "SectionKey") DO NOTHING;
```

This keeps User 2 in onboarding (as you requested) but allows manual completion later.

### 2. Show Investments on Dashboard (Temp Fix)

**Update AccountsPanel.tsx line 30:**
```typescript
// BEFORE
const cashAccounts = data?.accounts.filter(a => a.type === 'cash') || [];

// AFTER
const accounts = data?.accounts || [];
```

This makes investments visible on dashboard immediately.

### 3. Add Navigation to Account Detail (Temp Fix)

**Problem:** Dashboard accounts use old UUID format (`investment_xxx`), but AccountDetailView needs new integer AccountId from Accounts table.

**Temporary Solution:**
Cannot easily map between UUID and integer without a lookup table. Need to decide on Option A or B first.

### 4. Implement AccountsView Placeholder

**For now, add message:**
"Account detail view requires selecting an account from the dashboard. Coming soon: Direct account management here."

---

## Testing Plan After Fix

### Phase 1: Data Verification
- ✅ Run migration script (if Option A)
- ✅ Verify row counts match
- ✅ Spot-check sample accounts
- ✅ Validate totals unchanged

### Phase 2: Dashboard Testing
- ✅ User 20 dashboard shows correct net worth
- ✅ All accounts visible (cash + investments)
- ✅ Account cards clickable
- ✅ Navigation to account detail works

### Phase 3: Onboarding Testing
- ✅ User 2 stays in onboarding
- ✅ Complete onboarding flow
- ✅ Verify data writes to correct tables
- ✅ Dashboard accessible after completion

### Phase 4: Wave 9.2 Feature Testing
- ✅ Navigate to account detail view
- ✅ Holdings table displays
- ✅ Refresh Prices button works
- ✅ Price chart renders
- ✅ All 8 timeframes work
- ✅ Crypto symbols (BTC-USD, ETH-USD) work

---

## Recommendation

**I strongly recommend Option A (Migrate to New Tables).**

**Reasons:**
1. Option B creates permanent technical debt
2. New tables are superior design for portfolio features
3. Migration is one-time pain vs ongoing sync complexity
4. Clean architecture enables future features
5. 12-18 hours now vs months of maintenance later

**Next Steps:**

1. **You decide:** Option A or Option B?
2. **I apply immediate fixes** (onboarding redirect, show investments)
3. **I implement chosen option**
4. **We test thoroughly**
5. **Wave 9.2 complete**

**Time Estimate:**
- Immediate fixes: 30 minutes
- Option A implementation: 2-3 days
- Option B implementation: 1 day
- Testing: 1 day

**Please advise which option you prefer before I proceed.**

---

## Questions for You

1. **Option A or B?** (Migrate vs Dual-Write)
2. **Can I apply immediate fixes now?** (Show investments, fix onboarding for User 2)
3. **Timeline?** Do you need Wave 9.2 working this week?
4. **Data Safety?** Should I backup database before migration?
5. **User 2 Status?** Confirm you want them to stay in onboarding (not complete)

I'm ready to proceed once you provide direction.
