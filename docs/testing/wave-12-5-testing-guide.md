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

### Local User ↔ Plaid User Mapping

Each Plaid sandbox user is mapped to a local dev user. Switch users via the dev user selector.

| Local User | Plaid Username | Custom User # | Key Test Data |
|------------|----------------|---------------|---------------|
| **10** | `user_good` | (default) | 2 credit cards, mortgage, student loan, property (Plaid-synced), 13 holdings, 6 cash accts. CC#81 is overdue (Plaid native). |
| **11** | `custom_pfmp_new_investor` | Test User 1 | 3 investment holdings (all new buys, fully reconciled) |
| **12** | `custom_pfmp_established` | Test User 2 | 3 investment holdings (old positions, needs opening balance) |
| **13** | `custom_pfmp_mixed` | Test User 3 | 3 investment holdings (mix of new + old) |
| **14** | `custom_pfmp_401k` | Test User 4 | 1 holding (401k with employer match) |
| **15** | `custom_pfmp_closed` | Test User 5 | 1 holding (has fully sold position) |
| **16** | `custom_pfmp_credit_high_util` | Test User 6 | 1 credit card: $4,500/$5,000 (90% util). Overdue via one-off DB edit (PaymentDueDate set to 2026-03-05). |
| **17** | `custom_pfmp_mortgage` | Test User 7 | 1 mortgage ($285k). ⚠️ Property auto-creation did not trigger — needs investigation. |
| **18** | `custom_pfmp_student_loans` | Test User 8 | 2 student loans ($19.5k + $8.5k) with APR, due dates, min payments |
| **19** | `custom_pfmp_unified` | Test User 9 | Multi-product: 2 cash accts, 1 holding (VTI), 1 credit card (25% util), 1 mortgage ($320k). ⚠️ No property auto-created. |
| **20** | *(manual — no Plaid)* | N/A | 6 holdings, 3 cash accts. Leave alone — real manual entries. |

---

## Phase 1 & 2: Unified Plaid Connection

### Test 1.1: Unified Link Token Creation
**User**: Any (e.g. User 10 / `user_good`)
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
**User**: User 19 (`custom_pfmp_unified`) — has bank + investments + liabilities
**After completing Test 1.1** (or use existing connection):

1. New connection appears in Connections list
2. Check connection details for "Products" column

**Expected**:
- ✅ Connection shows with institution name
- ✅ Products listed (transactions, investments, liabilities based on selection)
- ✅ Last synced timestamp shown

### Test 1.3: Dashboard Reflects New Data
**User**: User 19 (`custom_pfmp_unified`) — all product types visible
**Location**: Dashboard (main view)

1. Refresh dashboard or wait for auto-refresh
2. Check each panel for new data

**Expected**:
- ✅ Accounts Panel: New bank accounts appear (checking + savings)
- ✅ Investment Panel: Holdings show (VTI)
- ✅ Liabilities Panel: Credit card + mortgage appear
- ✅ Net Worth: Updates to include all synced data

---

## Phase 3: Credit Card & Loan Integration

### Test 3.1: Credit Card Display
**User**: User 10 (`user_good`) — has 2 credit cards with full Plaid-provided data
**Location**: Dashboard → Liabilities Panel

1. Look for credit cards in the liabilities section
2. Click on a credit card to view details

**Expected**:
- ✅ Credit card shows current balance ("Plaid Credit Card" $410, "Plaid Business Credit Card" $5,020)
- ✅ Credit limit displayed ($2,000 and $10,000)
- ✅ Utilization percentage shown (20.5% and 50.2%)
- ✅ Payment due date visible
- ✅ APR shown (12.5% on personal card)

### Test 3.2: Credit Card Alerts (High Utilization)
**User**: User 16 (`custom_pfmp_credit_high_util`) — 90% utilization ($4,500/$5,000)
**Prerequisite**: Generate alerts if not already present: `POST http://localhost:5052/api/alerts/credit/generate?userId=16`

1. Go to Dashboard → Alerts panel
2. Look for credit utilization alert

**Expected**:
- ✅ Alert generated: "Critical: Credit card at 90% utilization" (Severity: High, Impact: 80)
- ✅ Alert shows card name and current utilization
- ✅ Alert priority reflects urgency

> **Also verify on User 10**: `user_good` has a business CC at 50.2% which should trigger a "High" utilization alert (threshold is 50%).

### Test 3.3: Overdue Payment Alert
**User**: User 10 (`user_good`) — has Plaid-native overdue credit card (due date 2020-05-28, `IsOverdue: true`)
**Prerequisite**: Generate alerts if not already present: `POST http://localhost:5052/api/alerts/credit/generate?userId=10`

1. Check Alerts panel
2. Look for overdue payment alert

**Expected**:
- ✅ Overdue alert appears: "Overdue: Plaid Credit Card payment is X days late" (Severity: Critical, Impact: 90)
- ✅ Shows which account is overdue
- ✅ Shows amount due ($20.00 minimum payment)

> **Note**: User 10's overdue data comes from `user_good` Plaid sandbox defaults — no DB modification needed.
> User 16 also has an overdue alert via one-off DB edit (PaymentDueDate changed to 2026-03-05).
> The overdue alert and high-utilization alert are independent (different alert keys) and can coexist on the same card.

### Test 3.4: Student Loan Display
**User**: User 18 (`custom_pfmp_student_loans`) — 2 student loans with full data
**Location**: Dashboard → Liabilities Panel

1. Look for student loans
2. Check loan details

**Expected**:
- ✅ Each student loan shows as separate entry ("Federal Direct - Subsidized" $19,580 and "Federal Direct - Unsubsidized" $8,523)
- ✅ Current balance displayed
- ✅ Interest rate shown (5.05% and 6.55%)
- ✅ Payment due date visible (Mar 15 and Apr 10)
- ✅ Appears in Debt Payoff Dashboard

> **Also visible on User 10**: `user_good` has 1 student loan ("Consolidation" $65,262 at 5.25%).

### Test 3.5: Debt Payoff Dashboard
**User**: User 10 (`user_good`) — has the most diverse debt portfolio (2 credit cards + 1 mortgage + 1 student loan = 4 debts)
**Location**: Dashboard → Liabilities Panel → "View Debt Payoff" (or direct route)

1. Navigate to Debt Payoff Dashboard
2. Review all debts listed

**Expected**:
- ✅ All credit cards and loans listed (4 debts for User 10)
- ✅ Totals calculated correctly (~$126,994 total)
- ✅ Interest rates displayed
- ✅ Payoff strategies (avalanche/snowball) calculate correctly
- ✅ Click on debt navigates to detail view

---

## Phase 4: Property Integration

### Test 4.1: Mortgage → Property Auto-Creation
**User**: User 10 (`user_good`) — has a Plaid-synced property at "2992 Cameron Road, Malakoff, NY" linked to mortgage (liability #82)
**Prerequisite**: Property should already exist from initial Plaid mortgage sync.

1. Go to Dashboard → Properties Panel
2. Verify property exists

**Expected**:
- ✅ Property appears in Properties Panel
- ✅ Property address matches mortgage data ("2992 Cameron Road")
- ✅ Mortgage balance shows ($56,302)
- ✅ Equity calculated (value – mortgage)

> **⚠️ Gap**: Users 17 (`custom_pfmp_mortgage`) and 19 (`custom_pfmp_unified`) both have mortgages but no property was auto-created. Needs investigation — may need to re-trigger Plaid sync or fix property auto-creation for custom sandbox mortgages.

### Test 4.2: Property Detail View
**User**: User 10 (`user_good`) — property ID `b81911dd-45c1-4d71-a64a-763a25e12cb0`
**Location**: Dashboard → Properties Panel → Click on property

1. Click on a property card
2. Review Property Detail View

**Expected**:
- ✅ Navigates to `/dashboard/properties/{propertyId}`
- ✅ Breadcrumb shows "Dashboard > 2992 Cameron Road, Malakoff"
- ✅ Property Summary card shows:
  - Estimated Value
  - Mortgage Balance ($56,302)
  - Equity (Value – Mortgage)
  - Equity %
  - Monthly cash flow info
- ✅ Linked Mortgage card shows:
  - Lender name ("Plaid Mortgage")
  - Current balance ($56,302)
  - Interest rate (3.99%)
  - Monthly payment ($3,141.54)
  - Next payment due date
- ✅ Address Details section shows parsed address (Street: 2992 Cameron Road, City: Malakoff, State: NY)
- ✅ Value History table shows records

### Test 4.3: Property Panel Navigation
**User**: User 10 (`user_good`)
**Location**: Dashboard → Properties Panel

1. Review Properties Panel
2. Click on a property card

**Expected**:
- ✅ Property cards are clickable (cursor: pointer)
- ✅ Hover effect on cards
- ✅ Click navigates to detail view
- ✅ Total value/mortgage/equity shown in summary

### Test 4.4: Properties with No Mortgage
**User**: User 20 (manual) — or create a manual property on any user
**Scenario**: Manually created property without Plaid link

1. If you have a manual property (no mortgage), click to view
2. Check Linked Mortgage section

**Expected**:
- ✅ "No mortgage linked to this property" message
- ✅ Still shows estimated value and other details
- ✅ No errors

> **⚠️ Gap**: No user currently has a manual property without a mortgage. User 20 has no properties. Need to manually create one to test this scenario.

### Test 4.5: Plaid-Synced Property Indicator
**User**: User 10 (`user_good`) — property Source=5 (PlaidMortgage)
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
**User**: User 10 (`user_good`) — richest data set across all product types
**Location**: Dashboard → Net Worth panel

1. After syncing all products, check Net Worth

**Expected**:
- ✅ Assets include: Bank accounts + Investments + Property values
- ✅ Liabilities include: Credit cards + Loans + Mortgage balances (~$126,994)
- ✅ Net Worth = Assets – Liabilities
- ✅ Matches sum of individual panels

> **Alternative**: User 19 (`custom_pfmp_unified`) also has multi-product data for cross-checking.

### Test X.2: Net Worth Timeline
**User**: User 10 (`user_good`) — has 1 NW snapshot; or User 20 (manual) — has 2 NW snapshots
**Location**: Dashboard → "View Net Worth Timeline" or `/dashboard/net-worth`

1. Navigate to Net Worth Timeline
2. Check data points

**Expected**:
- ✅ Chart shows historical data
- ✅ Breakdown includes all account types
- ✅ Liabilities shown as negative
- ✅ Properties included in assets

### Test X.3: Connection Sync
**User**: User 10 (`user_good`) — established connection
**Location**: Settings → Connections

1. Find an existing connection
2. Click "Sync" or refresh button

**Expected**:
- ✅ Sync initiates without error
- ✅ Loading indicator shown
- ✅ "Last synced" timestamp updates
- ✅ All products re-sync (transactions, investments, liabilities)

### Test X.4: Connection Products Display
**User**: User 19 (`custom_pfmp_unified`) — multi-product connection
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
**User**: Any
1. Navigate to `/dashboard/properties/00000000-0000-0000-0000-000000000000`

**Expected**:
- ✅ Error message: "Property not found"
- ✅ No crash or blank screen
- ✅ Back navigation works

### Test E.2: Plaid Link Cancellation
**User**: Any
1. Open Plaid Link
2. Close without completing

**Expected**:
- ✅ Modal closes gracefully
- ✅ No error messages
- ✅ No orphan data created

### Test E.3: Sync Failure Handling
**User**: Any connected user
1. If a sync fails (simulate by disconnecting network during sync)

**Expected**:
- ✅ Error message displayed
- ✅ Connection shows error status
- ✅ Retry option available

---

## Regression Tests

### Test R.1: Existing Bank Connection Still Works
**User**: User 10 (`user_good`) — longest-standing Plaid connection
1. Verify pre-existing bank connection still syncs

**Expected**:
- ✅ Transactions still sync
- ✅ Balances still update
- ✅ No migration errors

### Test R.2: Manual Entries Unaffected
**User**: User 20 (manual — no Plaid connection)
1. Check manually entered accounts/liabilities/properties

**Expected**:
- ✅ Manual data unchanged (6 holdings, 3 cash accounts)
- ✅ Coexists with Plaid data
- ✅ Can still edit manual entries

### Test R.3: TSP Still Works (Manual Only)
**User**: User 20 (manual) — or any user (all 10–20 have TSP profiles)
1. Go to TSP panel or detail view
2. Verify TSP data displays

**Expected**:
- ✅ TSP contributions show
- ✅ Fund allocations correct
- ✅ Price refresh works
- ✅ No Plaid integration attempted (TSP is manual only)

---

## Checklist Summary

| Test | Feature | User | Pass/Fail |
|------|---------|------|-----------|
| 1.1 | Unified Link Token | Any (10) | ⬜ |
| 1.2 | Multi-Product Sync | 19 | ⬜ |
| 1.3 | Dashboard Data | 19 | ⬜ |
| 3.1 | Credit Card Display | 10 | ⬜ |
| 3.2 | High Util Alert | 16 | ⬜ |
| 3.3 | Overdue Alert | 10 | ⬜ |
| 3.4 | Student Loan Display | 18 | ⬜ |
| 3.5 | Debt Payoff Dashboard | 10 | ⬜ |
| 4.1 | Mortgage → Property | 10 | ⬜ |
| 4.2 | Property Detail View | 10 | ⬜ |
| 4.3 | Property Panel Nav | 10 | ⬜ |
| 4.4 | No Mortgage Property | 20 ⚠️ | ⬜ |
| 4.5 | Plaid Sync Indicator | 10 | ⬜ |
| X.1 | Net Worth Calculation | 10 | ⬜ |
| X.2 | Net Worth Timeline | 10 or 20 | ⬜ |
| X.3 | Connection Sync | 10 | ⬜ |
| X.4 | Connection Products | 19 | ⬜ |
| E.1 | Invalid Property ID | Any | ⬜ |
| E.2 | Plaid Cancellation | Any | ⬜ |
| E.3 | Sync Failure | Any | ⬜ |
| R.1 | Existing Connections | 10 | ⬜ |
| R.2 | Manual Entries | 20 | ⬜ |
| R.3 | TSP Still Works | 20 | ⬜ |

---

## Known Limitations

1. **TSP Not Plaid-Supported**: TSP remains manual-only; Plaid does not support federal retirement plans
2. **Sandbox Data**: Plaid sandbox returns mock data; amounts may not match real-world scenarios
3. **Custom Users Required**: Some tests require creating custom sandbox users in Plaid Dashboard first
4. **Property Value History**: Initial sync creates one history entry; manual updates add more
5. **Alert Automation**: Credit alerts (overdue, high utilization) are generated automatically during nightly Plaid sync (10 PM ET) and on manual re-sync. Push notifications (text, Discord, etc.) are a future wave — for now alerts appear in the dashboard Alerts panel only.

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
- Alerts auto-generate during nightly Plaid sync (10 PM ET) and on manual Connection Sync for connections with the `liabilities` product
- For existing data or first-time setup, trigger manually: `POST http://localhost:5052/api/alerts/credit/generate?userId={id}`
- Utilization thresholds: 50% = High, 75% = Critical
- Overdue: any `PaymentDueDate < now` triggers Critical alert
- Check API logs for errors during generation
