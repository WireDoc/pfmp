# Wave 8.1 Recovery Plan: Dashboard Data Display Fix

**Date:** November 7, 2025  
**Issue:** Dashboard showing $323k instead of $785k - only TSP + one checking account visible  
**Root Cause:** Removed Accounts table logic but dashboard accounts list incomplete  
**Current Wave:** 8.1 - Enhanced Account Management (Phase 2: Data Aggregation)

---

## Problem Analysis

### What's Working ✅
1. **Backend calculations ARE correct**
   - Net worth: $785,659 (API returns this)
   - Total assets: $1,024,659
   - Total liabilities: $239,000
   - TSP: $322,659 (with real DailyTSP API prices - L2050: $40.53, S Fund: $98.56)

2. **Data exists in onboarding tables**
   - CashAccounts: 5 accounts ($82k total)
   - InvestmentAccounts: 1 account ($20k)
   - TspLifecyclePositions: 16 positions ($322k calculated)
   - Properties: 1 property ($600k)
   - FinancialProfileLiabilities: debt ($1k)

3. **DashboardController builds accounts array correctly**
   - Lines 104-150: Adds cash accounts
   - Lines 119-132: Adds investment accounts  
   - Lines 134-145: Adds TSP aggregate

### What's Broken ❌
**Dashboard DISPLAY shows only:**
- TSP: $322k
- One checking account: $1k (User #1's account, not User #20's)
- **Missing:** All 5 USAA cash accounts ($82k)
- **Missing:** Charles Schwab investment account ($20k)
- **Missing:** Property display ($600k)
- **Missing:** Liabilities display ($239k)

### Root Cause
Wave 8.1 disruption: We removed the unified `Accounts` table and disabled Add/Edit UI, but the **accounts list is being built from the correct onboarding tables**. The issue is likely:

1. **Frontend filtering or display logic** - AccountsPanel may be filtering accounts
2. **User ID mismatch** - Frontend showing User #1's data instead of User #20
3. **Missing account sections** - Properties and Liabilities not in AccountsPanel at all

---

## Current Wave 8 Objectives (Per Phase 2 Plan)

### Wave 8.1: Enhanced Account Management UI ✅ PARTIALLY COMPLETE
**Original Goal:** Enable post-onboarding account editing

**Completed:**
- ✅ AccountDetailModal created
- ✅ Backend PUT /api/accounts/{id} endpoint
- ✅ Edit button on account cards
- ✅ Dashboard refresh wiring

**Removed (during cleanup):**
- ❌ Add Account button (removed because unified Accounts table deprecated)
- ❌ AccountDetailModal/AddAccountModal (removed from AccountsPanel)

**Status:** We removed Wave 8.1 UI because it was tied to the deprecated Accounts table

### Wave 8.2: CSV Import ⏳ NOT STARTED
- Import accounts and holdings via CSV
- Bulk data entry

### Wave 8.3: Holdings Database Schema ⏳ NOT STARTED
- Create Holdings and Transactions tables
- Track individual securities

---

## Wave 8 Scope Clarification

**Key Question:** What types of accounts should Wave 8 manage?

### Option A: Cash Accounts Only (RECOMMENDED)
**Rationale:**
- Matches onboarding's separate sections (Cash, Investments, TSP, Real Estate, Liabilities)
- Cash accounts are simplest (no holdings tracking needed)
- Other account types already have dedicated onboarding flows
- Real Estate and Liabilities aren't "accounts" in the traditional sense

**Wave 8.1 Scope:**
- ✅ Edit Cash Accounts only (name, balance, institution, account number)
- ✅ Add new Cash Accounts
- ❌ Edit TSP (managed through onboarding)
- ❌ Edit Investment Accounts (holdings tracking needed - Wave 9)
- ❌ Edit Real Estate (separate Properties section)
- ❌ Edit Liabilities (separate debt management)

**Dashboard Display:**
- Show all account types (Cash, Investment, TSP, Properties, Liabilities)
- Only Cash Accounts get Edit/Add buttons
- Other sections get "View Details" → link to onboarding or dedicated view

### Option B: All Account Types (NOT RECOMMENDED)
- Would require building separate modals for each type
- Duplicates onboarding functionality
- Doesn't align with existing data model

---

## Recovery Plan: 3-Phase Approach

### PHASE 1: Fix Dashboard Display ✅ COMPLETE (November 7, 2025)
**Goal:** Show ALL accounts from onboarding tables

**Tasks:**
1. ✅ **Debug frontend display issue** - FIXED
   - **Root Cause:** `apiDashboardService.ts` was using `window.location.origin` instead of configured API base URL
   - **Solution:** Changed to use `import.meta.env.VITE_API_BASE_URL` from `.env.development`
   - **Missing Parameter:** Added `userId` query parameter to dashboard summary fetch
   - Frontend was calling itself (`http://localhost:3000`) instead of backend (`http://localhost:5052`)

2. **Add missing account sections to dashboard** - DEFERRED TO PHASE 2
   - Properties section (Real Estate cards)
   - Liabilities section (Debt cards)
   - Keep existing: Cash, Investment, TSP sections

3. ✅ **Verify API response structure** - CONFIRMED WORKING
   - Backend correctly returns all 7 accounts for User #20
   - Properties and liabilities calculated in net worth
   - Dashboard now displays correct totals

**Acceptance Criteria:**
- ✅ Dashboard shows net worth: $785k
- ✅ Accounts panel shows 7 cards: 5 cash + 1 investment + 1 TSP
- 🔶 Properties panel shows 1 property card ($600k) - NEXT STEP
- 🔶 Liabilities panel shows total debt ($239k) - NEXT STEP

**Files Modified:**
- `pfmp-frontend/src/services/dashboard/apiDashboardService.ts`
  - Changed API_ORIGIN from `window.location.origin` to use `VITE_API_BASE_URL`
  - Added userId parameter to dashboard summary URL
  - Fixed duplicate import of `TASK_STATUS_FROM_ENUM`
  - Added console logging for debugging (can be removed later)

---

### PHASE 2: Restore Wave 8.1 for Cash Accounts Only (1 week)
**Goal:** Re-enable Add/Edit functionality for Cash Accounts

**Tasks:**
1. **Re-enable AccountDetailModal** (already exists, just hidden)
   - Restore Edit button for Cash Account cards only
   - Update modal to work with CashAccounts table (not Accounts table)
   - Backend: Create PUT /api/cash-accounts/{id} endpoint

2. **Re-enable AddAccountModal**
   - Restore "Add Cash Account" button to Cash Accounts section
   - Modal creates new CashAccounts record
   - Backend: Use existing POST /api/financial-profile/{userId}/cash endpoint

3. **Update AccountsPanel**
   - Show Edit button ONLY on cash account cards
   - Show "Add Account" button ONLY in cash accounts section
   - TSP, Investments, Properties, Liabilities: "View Details" → link to onboarding

**Acceptance Criteria:**
- Users can edit existing cash accounts (balance, name, institution)
- Users can add new cash accounts
- TSP/Investment accounts show "View Details" instead of Edit
- Properties and Liabilities have their own dedicated sections

---

### PHASE 3: Complete Wave 8.2-8.3 (2-3 weeks)
**Goal:** CSV import and holdings tracking

**8.2: CSV Import for Cash Accounts**
- Import multiple cash accounts at once
- Validation and error handling

**8.3: Holdings Schema** (for Wave 9)
- Create Holdings table for investment accounts
- Track individual securities (stocks, bonds, ETFs)
- Enable detailed portfolio tracking

**Priority:** Lower - dashboard display fix is critical path

---

## Updated Wave 8.1 Definition

**Scope:** Cash Accounts Management Only

**Included:**
- ✅ Edit cash account details (name, institution, balance, account number)
- ✅ Add new cash accounts
- ✅ Delete cash accounts (with confirmation)
- ✅ Dashboard refresh after changes

**Explicitly Excluded:**
- ❌ TSP account editing (use onboarding)
- ❌ Investment account editing (needs holdings tracking - Wave 9)
- ❌ Real estate editing (use Properties section)
- ❌ Liability editing (use Liabilities section)

**Justification:**
- Aligns with onboarding's data model (separate tables for each type)
- Cash accounts are atomic (no child records like holdings)
- Other account types require specialized workflows
- Follows principle: "Dashboard for viewing, onboarding for complex editing"

---

## Immediate Next Steps (Priority Order)

### ✅ 1. DEBUG: Why is dashboard showing $323k? - COMPLETE
**Solution Found:** Frontend was calling wrong URL (`window.location.origin` instead of configured API base) and missing `userId` parameter.

### ✅ 2. FIX: Display all accounts - COMPLETE
Dashboard now correctly displays all 7 accounts with proper net worth calculation.

### ✅ 3. ADD: Properties and Liabilities sections - COMPLETE
**Implementation:**
- ✅ Created PropertySnapshot and LiabilitySnapshot types
- ✅ Extended DashboardData interface with properties and liabilities arrays
- ✅ Updated backend DashboardController to return properties/liabilities in summary response
- ✅ Created PropertiesPanel.tsx component with equity calculations
- ✅ Created LiabilitiesPanel.tsx component with debt totals
- ✅ Added both panels to DashboardWave4 grid layout
- ✅ Created comprehensive unit tests (11 tests, all passing)

**Backend Changes:**
- Properties list includes: id, address, type, estimatedValue, mortgageBalance, lastUpdated
- Liabilities list includes: standalone liabilities + mortgages from properties
- Mortgages use offset ID (100000+) to avoid collisions

**Frontend Components:**
- PropertiesPanel shows property cards with equity percentage and calculations
- LiabilitiesPanel shows liability cards with interest rates and minimum payments
- Both panels display totals and handle empty states

### 4. TEST: Verify full data display - COMPLETE
- ✅ Net worth: $785k displayed correctly
- ✅ 7 account cards visible (5 cash, 1 investment, 1 TSP)
- ✅ Property panel visible showing $600k property with $238k mortgage = $362k equity
- ✅ Liabilities panel visible showing $239k total debt (includes mortgage + $1k liability)
- ✅ All 11 automated tests passing (propertiesPanel.test.tsx + liabilitiesPanel.test.tsx)

### 5. NEXT: Proceed with Phase 2 (Cash Account Management)
- Phase 1 is now 100% COMPLETE ✅
- Dashboard correctly displays all financial data ($785k net worth with all components)
- Ready to proceed with Phase 2: Restore Add/Edit functionality for cash accounts only
- Or prioritize Wave 8.2 (CSV Import) or other features based on user needs

---

## Files to Check/Modify

### Backend (Already Correct)
- ✅ `DashboardController.cs` - Correctly builds accounts array
- ✅ Calculates net worth including all sources
- ✅ Uses real DailyTSP API for TSP prices

### Frontend (Needs Investigation)
1. **AccountsPanel.tsx** - Check rendering logic
   - Line where accounts are mapped to cards
   - Any filtering that excludes accounts?
   - User ID being used correctly?

2. **DashboardWave4.tsx** - Check data fetching
   - API call to /api/dashboard/summary?userId=20
   - Response parsing
   - Data passed to AccountsPanel

3. **.env.development** - Check user ID
   - VITE_PFMP_DASHBOARD_USER_ID=20 (not 1!)

### Missing Components (To Add)
1. **PropertiesPanel.tsx** - New component for real estate
2. **LiabilitiesPanel.tsx** - New component for debt summary
3. Update DashboardWave4 to include new panels

---

## Success Criteria

### ✅ Phase 1 Complete (Dashboard Display Fixed)
- ✅ Dashboard shows $785k net worth correctly
- ✅ All 7 accounts visible (5 cash, 1 investment, 1 TSP)
- ✅ Properties panel visible showing $600k property with equity calculation
- ✅ Liabilities panel visible showing $239k total debt
- ✅ No Edit buttons (read-only view maintained)
- ✅ All automated tests passing (11 tests for Properties and Liabilities panels)
- ✅ Backend correctly returns properties and liabilities in dashboard summary
- ✅ Git commit ac05fc9 pushed to main

**Phase 1 Status: 100% COMPLETE** 🎉

### Phase 2 Pending (Wave 8.1 Restored for Cash)
- ⏳ Cash accounts have Edit button
- ⏳ Cash section has "Add Account" button
- ⏳ Other sections remain read-only
- ⏳ Changes persist and refresh dashboard

### Phase 3 Pending (Wave 8 Complete)
- ⏳ CSV import functional
- ⏳ Holdings schema in place
- ⏳ Ready for Wave 9 (investment account details)

---

## Communication

**Status:** Wave 8.1 was disrupted by Accounts table deprecation. We correctly removed the unified table approach, but inadvertently removed dashboard display functionality. Recovery plan splits work into:
1. Fix display (immediate)
2. Restore cash account editing (Wave 8.1 scope clarification)
3. Complete remaining Wave 8 objectives (CSV, holdings schema)

**Recommendation:** Execute Phase 1 immediately to restore dashboard visibility, then reassess Wave 8.1 scope based on user needs.
