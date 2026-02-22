# Wave 12.5 Frontend Testing Guide

> **Wave**: 12.5 - Unified Plaid Account Linking
> **Created**: January 2026
> **Prerequisites**: Dev servers running (`.\start-dev-servers.bat`)

---

## Quick Start

```powershell
cd C:\pfmp
.\restart-dev-servers.bat
# Wait for both servers to start, then open http://localhost:3000
```

---

## Test Credentials

### Plaid Sandbox (Default User)
- **Username**: `user_good`
- **Password**: `pass_good`
- **MFA Code**: `1234` (if prompted)

### Custom Users (Create in Plaid Dashboard First)
See `docs/testing/plaid-custom-users.md` for JSON configurations.

| Username | Scenario |
|----------|----------|
| `custom_pfmp_unified` | Multi-product (bank + investments + liabilities) |
| `custom_pfmp_mortgage` | Mortgage with property address |
| `custom_pfmp_credit_high_util` | Credit card 90% utilization + overdue |
| `custom_pfmp_student_loans` | Multiple student loans |

---

## Phase 1 & 2: Unified Plaid Connection

### Test 1.1: Unified Link Token Creation
**Location**: Dashboard → Settings (gear icon) → Connections

1. Click "Connect a Bank"
2. Plaid Link modal should open
3. Select "First Platypus Bank" (sandbox institution)
4. Login with `user_good` / `pass_good`
5. Complete MFA if prompted (`1234`)

**Expected**:
- ✅ Plaid Link opens without errors
- ✅ Can select accounts
- ✅ Modal closes after completion

### Test 1.2: Multi-Product Sync
**After completing Test 1.1**:

1. New connection appears in Connections list
2. Check connection details for "Products" column

**Expected**:
- ✅ Connection shows with institution name
- ✅ Products listed (transactions, investments, liabilities based on selection)
- ✅ Last synced timestamp shown

### Test 1.3: Dashboard Reflects New Data
**Location**: Dashboard (main view)

1. Refresh dashboard or wait for auto-refresh
2. Check each panel for new data

**Expected**:
- ✅ Accounts Panel: New bank accounts appear
- ✅ Investment Panel: Holdings show (if investments selected)
- ✅ Liabilities Panel: Credit cards/loans appear (if liabilities selected)
- ✅ Net Worth: Updates to include all synced data

---

## Phase 3: Credit Card & Loan Integration

### Test 3.1: Credit Card Display
**Location**: Dashboard → Liabilities Panel

1. Look for credit cards in the liabilities section
2. Click on a credit card to view details

**Expected**:
- ✅ Credit card shows current balance
- ✅ Credit limit displayed
- ✅ Utilization percentage shown
- ✅ Payment due date visible
- ✅ APR shown

### Test 3.2: Credit Card Alerts (High Utilization)
**Prerequisite**: Use `custom_pfmp_credit_high_util` or have a card with >80% utilization

1. Go to Dashboard → Alerts tab (or Alerts panel)
2. Look for credit utilization alert

**Expected**:
- ✅ Alert generated for high utilization (>80%)
- ✅ Alert shows card name and current utilization
- ✅ Alert priority reflects urgency

### Test 3.3: Overdue Payment Alert
**Prerequisite**: Credit card with `is_overdue: true`

1. Check Alerts panel
2. Look for overdue payment alert

**Expected**:
- ✅ Overdue alert appears with high priority
- ✅ Shows which account is overdue
- ✅ Shows amount due

### Test 3.4: Student Loan Display
**Location**: Dashboard → Liabilities Panel

1. Look for student loans
2. Check loan details

**Expected**:
- ✅ Each student loan shows as separate entry
- ✅ Current balance displayed
- ✅ Interest rate shown
- ✅ Payment due date visible
- ✅ Appears in Debt Payoff Dashboard

### Test 3.5: Debt Payoff Dashboard
**Location**: Dashboard → Liabilities Panel → "View Debt Payoff" (or direct route)

1. Navigate to Debt Payoff Dashboard
2. Review all debts listed

**Expected**:
- ✅ All credit cards and loans listed
- ✅ Totals calculated correctly
- ✅ Interest rates displayed
- ✅ Payoff strategies (avalanche/snowball) calculate correctly
- ✅ Click on debt navigates to detail view

---

## Phase 4: Property Integration

### Test 4.1: Mortgage → Property Auto-Creation
**Prerequisite**: Use `custom_pfmp_mortgage` with property address, or link a mortgage account

1. Link a mortgage account via Plaid
2. After sync completes, go to Dashboard

**Expected**:
- ✅ Property appears in Properties Panel
- ✅ Property address matches mortgage data
- ✅ Mortgage balance shows as property mortgage
- ✅ Equity calculated (value - mortgage)

### Test 4.2: Property Detail View
**Location**: Dashboard → Properties Panel → Click on property

1. Click on a property card
2. Review Property Detail View

**Expected**:
- ✅ Navigates to `/dashboard/properties/{propertyId}`
- ✅ Breadcrumb shows "Dashboard > Property Name"
- ✅ Property Summary card shows:
  - Estimated Value
  - Mortgage Balance
  - Equity (Value - Mortgage)
  - Equity %
  - Monthly cash flow info
- ✅ Linked Mortgage card shows:
  - Lender name
  - Current balance
  - Interest rate
  - Monthly payment
  - Next payment due date
- ✅ Address Details section shows parsed address
- ✅ Value History table shows records

### Test 4.3: Property Panel Navigation
**Location**: Dashboard → Properties Panel

1. Review Properties Panel
2. Click on a property card

**Expected**:
- ✅ Property cards are clickable (cursor: pointer)
- ✅ Hover effect on cards
- ✅ Click navigates to detail view
- ✅ Total value/mortgage/equity shown in summary

### Test 4.4: Properties with No Mortgage
**Scenario**: Manually created property without Plaid link

1. If you have a manual property (no mortgage), click to view
2. Check Linked Mortgage section

**Expected**:
- ✅ "No mortgage linked to this property" message
- ✅ Still shows estimated value and other details
- ✅ No errors

### Test 4.5: Plaid-Synced Property Indicator
**Location**: Property Detail View

1. View a property created from Plaid mortgage
2. Check for sync indicator

**Expected**:
- ✅ "Plaid Linked" chip/badge visible
- ✅ Last synced date shown
- ✅ Data source shows "Plaid" or "PlaidMortgage"

---

## Cross-Feature Tests

### Test X.1: Net Worth Calculation
**Location**: Dashboard → Net Worth panel

1. After syncing all products, check Net Worth

**Expected**:
- ✅ Assets include: Bank accounts + Investments + Property values
- ✅ Liabilities include: Credit cards + Loans + Mortgage balances
- ✅ Net Worth = Assets - Liabilities
- ✅ Matches sum of individual panels

### Test X.2: Net Worth Timeline
**Location**: Dashboard → "View Net Worth Timeline" or `/dashboard/net-worth`

1. Navigate to Net Worth Timeline
2. Check data points

**Expected**:
- ✅ Chart shows historical data
- ✅ Breakdown includes all account types
- ✅ Liabilities shown as negative
- ✅ Properties included in assets

### Test X.3: Connection Sync
**Location**: Settings → Connections

1. Find an existing connection
2. Click "Sync" or refresh button

**Expected**:
- ✅ Sync initiates without error
- ✅ Loading indicator shown
- ✅ "Last synced" timestamp updates
- ✅ All products re-sync (transactions, investments, liabilities)

### Test X.4: Connection Products Display
**Location**: Settings → Connections

1. View connection list
2. Check products column

**Expected**:
- ✅ Products listed for each connection
- ✅ Shows which products are enabled (transactions, investments, liabilities)
- ✅ Unified connections show multiple products

---

## Error Handling Tests

### Test E.1: Invalid Property ID
1. Navigate to `/dashboard/properties/00000000-0000-0000-0000-000000000000`

**Expected**:
- ✅ Error message: "Property not found"
- ✅ No crash or blank screen
- ✅ Back navigation works

### Test E.2: Plaid Link Cancellation
1. Open Plaid Link
2. Close without completing

**Expected**:
- ✅ Modal closes gracefully
- ✅ No error messages
- ✅ No orphan data created

### Test E.3: Sync Failure Handling
1. If a sync fails (simulate by disconnecting network during sync)

**Expected**:
- ✅ Error message displayed
- ✅ Connection shows error status
- ✅ Retry option available

---

## Regression Tests

### Test R.1: Existing Bank Connection Still Works
1. If you have pre-existing bank connections, verify they still sync

**Expected**:
- ✅ Transactions still sync
- ✅ Balances still update
- ✅ No migration errors

### Test R.2: Manual Entries Unaffected
1. Check manually entered accounts/liabilities/properties

**Expected**:
- ✅ Manual data unchanged
- ✅ Coexists with Plaid data
- ✅ Can still edit manual entries

### Test R.3: TSP Still Works (Manual Only)
1. Go to TSP panel or detail view
2. Verify TSP data displays

**Expected**:
- ✅ TSP contributions show
- ✅ Fund allocations correct
- ✅ Price refresh works
- ✅ No Plaid integration attempted (TSP is manual only)

---

## Checklist Summary

| Test | Feature | Pass/Fail |
|------|---------|-----------|
| 1.1 | Unified Link Token | ⬜ |
| 1.2 | Multi-Product Sync | ⬜ |
| 1.3 | Dashboard Data | ⬜ |
| 3.1 | Credit Card Display | ⬜ |
| 3.2 | High Util Alert | ⬜ |
| 3.3 | Overdue Alert | ⬜ |
| 3.4 | Student Loan Display | ⬜ |
| 3.5 | Debt Payoff Dashboard | ⬜ |
| 4.1 | Mortgage → Property | ⬜ |
| 4.2 | Property Detail View | ⬜ |
| 4.3 | Property Panel Nav | ⬜ |
| 4.4 | No Mortgage Property | ⬜ |
| 4.5 | Plaid Sync Indicator | ⬜ |
| X.1 | Net Worth Calculation | ⬜ |
| X.2 | Net Worth Timeline | ⬜ |
| X.3 | Connection Sync | ⬜ |
| X.4 | Connection Products | ⬜ |
| E.1 | Invalid Property ID | ⬜ |
| E.2 | Plaid Cancellation | ⬜ |
| E.3 | Sync Failure | ⬜ |
| R.1 | Existing Connections | ⬜ |
| R.2 | Manual Entries | ⬜ |
| R.3 | TSP Still Works | ⬜ |

---

## Known Limitations

1. **TSP Not Plaid-Supported**: TSP remains manual-only; Plaid does not support federal retirement plans
2. **Sandbox Data**: Plaid sandbox returns mock data; amounts may not match real-world scenarios
3. **Custom Users Required**: Some tests require creating custom sandbox users in Plaid Dashboard first
4. **Property Value History**: Initial sync creates one history entry; manual updates add more

---

## Troubleshooting

### Plaid Link Won't Open
- Check browser console for errors
- Verify API server is running on port 5052
- Check `appsettings.Development.json` for valid Plaid credentials

### Data Not Syncing
- Check connection status in Connections view
- Try manual sync
- Check API logs for Plaid API errors

### Property Not Auto-Created
- Verify mortgage has property address data
- Check API logs during sync
- Mortgage must have `property_address` field from Plaid

### Alerts Not Generating
- Check AlertsController is returning data
- Verify alert thresholds (80% utilization)
- Run alert generation job manually if needed
