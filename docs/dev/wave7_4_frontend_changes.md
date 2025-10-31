# Wave 7.4: Frontend Changes for Enhanced AI Context

**Date:** October 31, 2025  
**Status:** ✅ Completed

---

## Overview

Updated frontend forms to support the new database fields added in Wave 7.4:
- `User.TransactionalAccountDesiredBalance` 
- `Account.Purpose` / `CashAccount.Purpose`

---

## Files Modified

### 1. Type Definitions: `financialProfileApi.ts`

**RiskGoalsProfilePayload - Added field:**
```typescript
export interface RiskGoalsProfilePayload {
  riskTolerance?: number | null;
  targetRetirementDate?: string | null;
  passiveIncomeGoal?: number | null;
  liquidityBufferMonths?: number | null;
  emergencyFundTarget?: number | null;
  transactionalAccountDesiredBalance?: number | null;  // ← NEW
  optOut?: SectionOptOutPayload | null;
}
```

**CashAccountPayload - Added field:**
```typescript
export interface CashAccountPayload {
  nickname?: string | null;
  accountType?: string | null;
  institution?: string | null;
  balance?: number | null;
  interestRateApr?: number | null;
  isEmergencyFund?: boolean | null;
  rateLastChecked?: string | null;
  purpose?: string | null;  // ← NEW
}
```

---

### 2. Risks & Goals Form: `RiskGoalsSectionForm.tsx`

**Added UI Field:**
```tsx
<TextField
  type="number"
  label="Desired checking account balance ($)"
  value={formState.transactionalAccountDesiredBalance ?? ''}
  onChange={(event) =>
    setField('transactionalAccountDesiredBalance', 
      event.target.value === '' ? undefined : Number(event.target.value))
  }
  inputProps={{ min: 0, step: 500 }}
  helperText="How much do you like to keep in checking for day-to-day expenses?"
  fullWidth
/>
```

**Updated Logic:**
- `createInitialState()` - Added `transactionalAccountDesiredBalance: undefined`
- `hasCompletedRiskGoals()` - Added validation for new field
- `sanitizePayload()` - Added field to sanitization logic
- `mapPayloadToState()` - Added field to hydration logic

**Field Location:** After "Emergency fund target ($)"

---

### 3. Cash Accounts Form: `CashAccountsSectionForm.tsx`

**Added UI Field:**
```tsx
<TextField 
  label="Purpose/Notes (optional)" 
  placeholder="e.g. Emergency Fund, Vacation Savings, Home Down Payment"
  value={account.purpose} 
  onChange={(e) => handleAccountChange(account.id, 'purpose', e.target.value)} 
  helperText="Describe what this account is for (max 500 characters)"
  inputProps={{ maxLength: 500 }}
  fullWidth 
  multiline
  rows={2}
/>
```

**Updated Types:**
```typescript
type AccountFormState = {
  id: string;
  nickname: string;
  institution: string;
  accountType: string;
  balance: string;
  interestRateApr: string;
  isEmergencyFund: boolean;
  rateLastChecked: string;
  purpose: string;  // ← NEW
};

const DEFAULT_ACCOUNT: AccountFormState = {
  // ... other fields
  purpose: '',  // ← NEW
};
```

**Updated Logic:**
- `mapPayloadToState()` - Added `purpose: account.purpose ?? ''` to hydration
- `buildPayloadAccounts()` - Added `purpose: account.purpose.trim() || null` to payload

**Field Location:** After the "Emergency fund" checkbox, as a full-width multiline text field

---

## User Experience

### Risks & Goals Section

**Before:**
- Emergency fund target ($)
- [Next field]

**After:**
- Emergency fund target ($)
- **Desired checking account balance ($)** ← NEW
  - Helper text: "How much do you like to keep in checking for day-to-day expenses?"
  - Step: $500
  - Example: $10,000

### Cash Accounts Section

**Before:**
```
[Nickname] [Institution]
[Account Type] [Balance] [Interest Rate]
[Rate Last Checked] [☑ Emergency fund]
```

**After:**
```
[Nickname] [Institution]
[Account Type] [Balance] [Interest Rate]
[Rate Last Checked] [☑ Emergency fund]
[Purpose/Notes (optional)]  ← NEW
  e.g. Emergency Fund, Vacation Savings, Home Down Payment
  Describe what this account is for (max 500 characters)
```

---

## Testing Instructions

### 1. Test Risks & Goals Form

1. Navigate to Onboarding → Risks & Goals
2. Verify new field appears after "Emergency fund target"
3. Enter value: `10000`
4. Save and refresh - verify value persists
5. Check autosave indicator shows "Saved"

### 2. Test Cash Accounts Form

1. Navigate to Onboarding → Cash Accounts
2. For each account, verify "Purpose/Notes" field appears
3. Enter test values:
   - Main Checking: "Transactional Account"
   - Main Savings: "Emergency Fund"
   - Other accounts: "Vacation Savings", "Home Improvement", etc.
4. Save and refresh - verify values persist
5. Test max length (500 chars) validation

### 3. Test Backend Integration

After updating forms:

```powershell
# Generate new advice
. .\scripts\AdviceHelpers.ps1
New-Advice -UserId 2
Show-BothAdvice
```

**Verify AI output mentions:**
- Your desired checking balance preference
- Account purposes in context
- Correct emergency fund identification

---

## Validation Rules

### TransactionalAccountDesiredBalance
- Type: Number
- Min: 0
- Step: 500
- Optional (can be empty)
- Saves as `null` if empty

### Purpose
- Type: String
- Max Length: 500 characters
- Multiline (2 rows)
- Optional (can be empty)
- Saves as `null` if empty

---

## Example Values

### Risks & Goals
```
Risk Tolerance: 3 · Balanced
Target Retirement Date: 2055-01-01
Passive Income Goal: $5,000
Liquidity Buffer: 6 months
Emergency Fund Target: $40,000
Desired Checking Balance: $10,000  ← NEW
```

### Cash Accounts
```
Account 1:
  Nickname: Main Checking
  Institution: Navy Federal
  Type: Checking
  Balance: $30,000
  APR: 1.00%
  ☑ Emergency fund: No
  Purpose: Transactional Account  ← NEW

Account 2:
  Nickname: Main Savings
  Institution: Navy Federal
  Type: Savings
  Balance: $40,000
  APR: 1.00%
  ☑ Emergency fund: Yes
  Purpose: Emergency Fund  ← NEW
```

---

## Backend Context Enhancement

With these frontend changes, the AI now receives:

```
USER FINANCIAL PREFERENCES:
- Emergency Fund Target: $40,000
- Desired Transactional (Checking) Balance: $10,000  ← FROM NEW FIELD

CASH ACCOUNTS:
- Main Checking: $30,000 (Purpose: Transactional Account)  ← FROM NEW FIELD
- Main Savings: $40,000 [EMERGENCY FUND] (Purpose: Emergency Fund)  ← FROM NEW FIELD
```

This prevents the AI from:
- ❌ Misidentifying which account is the emergency fund
- ❌ Recommending transfers from checking when it's needed for day-to-day
- ❌ Ignoring the user's intended purpose for each account

---

## Rollback

If issues arise, revert these commits:
```bash
git revert HEAD  # Revert frontend changes
```

Forms will work without new fields (backward compatible).

---

## Next Steps

1. ✅ Frontend forms updated
2. ⏳ User fills in account purposes
3. ⏳ User sets desired checking balance
4. ⏳ Generate new AI advice
5. ⏳ Verify improved accuracy

---

**Status:** ✅ Ready for User Testing  
**Compilation:** ✅ No Errors  
**Servers:** ✅ Running
