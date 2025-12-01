# Wave 9.3 Fix: Calculated Balance for DETAILED Accounts

> **Date**: November 30, 2025  
> **Status**: ✅ Complete  
> **Prerequisite for**: Wave 9.3 Option B (Loan & Credit Card Views)

## Problem Statement

When an investment account transitions from `SKELETON` to `DETAILED` state:
1. The `CurrentBalance` field retains the original skeleton estimate ($10,000 in account 95)
2. The actual holdings have market values that may differ (e.g., prices change over time)
3. The frontend already calculates totals from holdings for DETAILED accounts
4. But the database `CurrentBalance` becomes stale and misleading

### Example (Account 95, User 20)

| Field | Database Value | Calculated Value |
|-------|----------------|------------------|
| State | DETAILED | - |
| CurrentBalance | $10,000.00 | - |
| Holdings Sum | - | ~$9,999.99 |

**Holdings breakdown:**
- AG (Silver): 327.33 shares × $6.11 = ~$2,000
- IVV (S&P ETF): 3.31 shares × $605.07 = ~$2,000
- GC=F (Gold): 1.02 units × $2,951.30 = ~$3,000
- TMC (Metals): 3,529.41 shares × $0.85 = ~$3,000

## Solution: Option A - Calculated Balance at API Level

### Approach

1. **Update `TransitionToDetailed`**: Sync `CurrentBalance` with holdings total when transitioning
2. **Add recalculate endpoint**: Allow manual recalculation for existing DETAILED accounts
3. **Clarify semantics**: For DETAILED accounts, `CurrentBalance` represents the last-calculated market value

### Changes Required

#### 1. Backend (AccountsController.cs)

**Modify `TransitionToDetailed` method:**
```csharp
// After creating holdings, sync CurrentBalance
account.State = "DETAILED";
account.CurrentBalance = holdingsTotal;  // NEW: Sync balance
account.UpdatedAt = DateTime.UtcNow;
account.LastBalanceUpdate = DateTime.UtcNow;  // NEW: Mark balance update
```

**Add new endpoint:**
```csharp
// POST: api/Accounts/{id}/recalculate-balance
[HttpPost("{id}/recalculate-balance")]
public async Task<IActionResult> RecalculateBalance(int id)
```

This endpoint will:
- Load account with holdings
- Verify account is DETAILED
- Sum holdings: `quantity × currentPrice`
- Update `CurrentBalance` and `LastBalanceUpdate`
- Return updated account

#### 2. Postman Collection

Add to "Accounts" folder:
```json
{
  "name": "Recalculate Balance (DETAILED only)",
  "request": {
    "method": "POST",
    "url": "{{baseUrl}}/api/Accounts/{{accountId}}/recalculate-balance"
  }
}
```

#### 3. Database Fix

Execute SQL to fix account 95:
```sql
UPDATE "Accounts" 
SET "CurrentBalance" = (
  SELECT SUM(h."Quantity" * h."CurrentPrice")
  FROM "Holdings" h
  WHERE h."AccountId" = 95
),
"LastBalanceUpdate" = NOW(),
"UpdatedAt" = NOW()
WHERE "AccountId" = 95;
```

## Testing Checklist

- [x] TransitionToDetailed now syncs CurrentBalance
- [x] Recalculate endpoint works for DETAILED accounts
- [x] Recalculate returns error for SKELETON accounts
- [x] Account 95 fixed in database ✅ **$10,000 → $34,817.12**
- [x] RefreshPrices endpoint updates account balance with live FMP prices
- [x] Frontend displays correct total (already working via holdings calculation)
- [x] Postman collection updated and tested

## Live Price Integration (December 1, 2025)

After initial fix, it was discovered that holdings still had **stale wizard prices** rather than 
live market values. The `RefreshPrices` endpoint was enhanced to:

1. Fetch live quotes from FMP (Financial Modeling Prep)
2. Update all holdings with current market prices
3. Recalculate and update account `CurrentBalance` for DETAILED accounts
4. Return previous and new balance in response

### Test Results

```
POST /api/holdings/refresh-prices?accountId=95
{
  "accountId": 95,
  "updatedCount": 3,
  "failedCount": 1,
  "message": "Successfully updated 3 of 4 holdings",
  "errors": ["No quote found for GC=F"],
  "newAccountBalance": 34817.1175935206,
  "previousAccountBalance": 10000.00
}
```

**Updated Prices:**
| Symbol | Old Price | New Price | Change |
|--------|-----------|-----------|--------|
| AG | $6.11 | $15.22 | +149% |
| IVV | $605.07 | $686.88 | +14% |
| TMC | $0.85 | $6.96 | +719% |
| GC=F | $2,951.30 | (unchanged) | N/A (futures) |

> **Note**: `GC=F` (Gold Futures) is not supported by FMP. The original price was set during 
> the wizard and remains stale. Consider using a different symbol like `GLD` (Gold ETF) for 
> gold exposure.

## Files Changed

| File | Change |
|------|--------|
| `PFMP-API/Controllers/AccountsController.cs` | Add recalculate endpoint, fix TransitionToDetailed |
| `PFMP-API/Controllers/HoldingsController.cs` | RefreshPrices now updates account balance |
| `PFMP-API/postman/PFMP-API.postman_collection.json` | Add recalculate endpoint |
| `docs/waves/wave-9.3-calculated-balance-fix.md` | This document |
| `docs/documentation-map.md` | Add reference |

## Why This Matters

For Wave 9.3 Option B (Loan & Credit Card Views), we need consistent balance semantics:
- Loan accounts will have `CurrentBalance` = principal remaining
- Credit card accounts will have `CurrentBalance` = current owed
- Investment accounts need `CurrentBalance` = market value of holdings

Without this fix, the dashboard/portfolio views would show inconsistent totals.

## Completion Criteria

1. ✅ `TransitionToDetailed` syncs `CurrentBalance` with holdings total
2. ✅ New `POST /api/Accounts/{id}/recalculate-balance` endpoint
3. ✅ Account 95 corrected: **$10,000 → $34,817.12** (with live FMP prices)
4. ✅ `RefreshPrices` endpoint now updates account balance
5. ✅ Postman collection updated
6. ✅ Documentation map updated
7. ✅ Changes committed to main:
   - Commit 955e401: Add recalculate-balance endpoint
   - Commit 340b13b: Initial balance sync fix
   - Commit 0c4964a: RefreshPrices live price integration
