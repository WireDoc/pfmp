# Wave 7.4: Enhanced AI Context & Fact-Checking

**Date:** October 31, 2024  
**Status:** Implemented, Ready for Testing

---

## Overview

This update addresses a critical issue where both primary and backup AIs were making the same data interpretation errors because the backup only received the primary's recommendation, not the original raw data.

---

## The Problem

### Original Issue
When GPT-4o was primary, it misidentified which account was the emergency fund. When we switched to Gemini as primary, **both Gemini AND Claude made the same mistake**:

**What they said:**
> "The user has only $30,000 in their designated Emergency Fund against a $40,000 target"

**Reality:**
- Main Checking: $30,000 (Transactional Account)
- Main Savings: $40,000 (Designated Emergency Fund ✓)
- Emergency Fund Target: $40,000

**Root Cause:** The backup AI only saw the primary's interpretation, not the raw data. No fact-checking was possible.

---

## The Solution

### 1. ✅ Backup AI Now Receives Raw Data

**File:** `PFMP-API/Services/AI/PrimaryBackupAIAdvisor.cs`

**Changes:**
- Backup prompt now includes full original user data
- Added explicit "FACT-CHECK" instruction
- Backup can now verify primary's data interpretation
- Increased context for better validation

**New Prompt Structure:**
```
PRIMARY AI RECOMMENDATION:
{primary's recommendation}

ORIGINAL USER DATA & CONTEXT (RAW):
{complete original data}

YOUR TASK:
1. FACT-CHECK: Verify the primary AI correctly interpreted the raw data
2. VALIDATE LOGIC: Review recommendation accuracy
3. IDENTIFY CONCERNS: Note oversights or risks
4. SUGGEST ADJUSTMENTS: Provide alternatives
5. STATE AGREEMENT: Level of agreement
```

**Token Impact:** Backup requests will use ~500-1000 more tokens (already accounted for with 3000 token limit)

---

### 2. ✅ Account Purpose Field Added

**Files Modified:**
- `PFMP-API/Models/Account.cs`
- `PFMP-API/Models/FinancialProfile/CashAccount.cs`

**New Field:**
```csharp
[MaxLength(500)]
public string? Purpose { get; set; }
```

**Examples:**
- "Transactional Account"
- "Emergency Fund"
- "Home Improvement Savings"
- "Vacation Fund"
- "Wedding Savings"

**Database Migration:** `Wave7_4_AddAccountPurposeAndUserPreferences`

---

### 3. ✅ User Preferences Added

**File:** `PFMP-API/Models/User.cs`

**New Field:**
```csharp
[Column(TypeName = "decimal(18,2)")]
public decimal? TransactionalAccountDesiredBalance { get; set; }
```

**Purpose:** Users can specify their desired checking account buffer (e.g., $5,000, $10,000, $15,000)

---

### 4. ✅ Enhanced AI Context

**File:** `PFMP-API/Services/AI/AIIntelligenceService.cs`

**Method:** `BuildCashContextAsync`

**Now Includes:**

```
USER FINANCIAL PREFERENCES:
- Emergency Fund Target: $40,000.00
- Desired Transactional (Checking) Balance: $10,000.00

CASH ACCOUNTS:
- Main Checking: $30,000.00 (APY: 1.00%) (Purpose: Transactional Account)
- Main Savings: $40,000.00 (APY: 1.00%) [DESIGNATED EMERGENCY FUND] (Purpose: Emergency Fund)
- Personal Care Savings: $2,000.00 (APY: 1.00%) (Purpose: Personal Care Savings Goal)
- Home Improvement Savings: $3,000.00 (APY: 1.00%) (Purpose: Home Improvement Savings Goal)
- Vacation Savings: $7,000.00 (APY: 1.00%) (Purpose: Vacation Savings Goal)

Total Cash: $82,000.00

IMPORTANT: 'Main Savings' is the designated emergency fund.
```

---

## Database Changes

### Migration: `Wave7_4_AddAccountPurposeAndUserPreferences`

**Tables Modified:**

1. **Accounts**
   - Added: `Purpose` (nvarchar(500), nullable)

2. **CashAccounts**
   - Added: `Purpose` (nvarchar(500), nullable)

3. **Users**
   - Added: `TransactionalAccountDesiredBalance` (decimal(18,2), nullable)

**Status:** ✅ Migration created and applied

---

## Frontend Changes Needed

### 1. Onboarding - Risks & Goals Section

**Add Field:**
```
Desired Checking Account Balance: $______
Help Text: "How much do you like to keep in checking for day-to-day expenses?"
Default: $10,000
```

### 2. Account Management

**Add Field to Account Forms:**
```
Purpose/Notes: ___________________________
Examples:
- Transactional Account
- Emergency Fund (auto-set if IsEmergencyFund checked)
- Home Improvement Savings
- Vacation Fund
```

### 3. Display Changes

**Account List:** Show purpose as subtitle or badge
```
Main Checking - $30,000
  Purpose: Transactional Account
  
Main Savings - $40,000 🛡️
  Purpose: Emergency Fund
```

---

## Testing Plan

### Phase 1: Verify Context is Sent ✅

1. Generate new advice
2. Check backend logs for context sent to AI
3. Verify purpose and preferences are included

### Phase 2: Verify Backup Gets Raw Data ✅

1. Generate advice with Gemini primary
2. Check if Claude's backup response references original data
3. Look for fact-checking behavior

### Phase 3: Test Fact-Checking

1. Manually create a scenario with wrong account designation
2. See if backup AI catches the error
3. Verify "Disagree" response with data correction

### Phase 4: User Testing

1. Add purposes through frontend
2. Set transactional balance preference
3. Generate advice and verify AI understands context

---

## Expected Behavior After Changes

### Before (Wave 7.3)
```
PRIMARY: "Transfer $10,000 from Main Checking to Emergency Fund"
BACKUP: "I agree with transferring to emergency fund"
❌ Both AIs misidentified which account was emergency fund
```

### After (Wave 7.4)
```
PRIMARY: "Transfer $10,000 from Main Checking to Emergency Fund"
BACKUP: "DISAGREE - Main Savings ($40,000) is already designated 
         as the emergency fund and meets the $40,000 target. 
         Main Checking ($30,000) is marked as 'Transactional Account' 
         with desired balance of $10,000. Recommend keeping $10,000 
         in checking, moving $20,000 to HYSA instead."
✅ Backup fact-checks and corrects primary's error
```

---

## Cost Impact

### Token Usage Changes

**Before (Wave 7.3):**
- Primary: ~500-800 tokens of context
- Backup: ~200-400 tokens (just primary's recommendation)
- Total: ~700-1200 tokens context

**After (Wave 7.4):**
- Primary: ~600-900 tokens of context (added user preferences)
- Backup: ~1000-1500 tokens (primary recommendation + full original data)
- Total: ~1600-2400 tokens context

**Cost Increase:** ~$0.003-0.005 per request (acceptable for accuracy)

### Response Quality

**Expected Improvements:**
1. Backup can catch data misinterpretations
2. Fewer wrong recommendations
3. Better alignment with user's actual goals
4. More personalized advice (respects user preferences)

---

## Files Changed

### Backend (C#)
1. `PFMP-API/Services/AI/PrimaryBackupAIAdvisor.cs` - Backup now gets raw data
2. `PFMP-API/Services/AI/AIIntelligenceService.cs` - Enhanced context building
3. `PFMP-API/Models/Account.cs` - Added Purpose field
4. `PFMP-API/Models/FinancialProfile/CashAccount.cs` - Added Purpose field
5. `PFMP-API/Models/User.cs` - Added TransactionalAccountDesiredBalance field
6. `PFMP-API/Migrations/Wave7_4_AddAccountPurposeAndUserPreferences.cs` - New migration

### Database
- Migration applied: ✅ Wave7_4_AddAccountPurposeAndUserPreferences

### Documentation
- Created: `docs/dev/wave7_4_enhanced_ai_context.md` (this file)

---

## Next Steps

1. **User Updates Data** (via frontend when ready)
   - Set account purposes
   - Set transactional balance preference ($10,000)

2. **Test with Real Data**
   - Generate advice after updating account purposes
   - Verify AI understands designations
   - Check if backup catches any errors

3. **Monitor Agreement Scores**
   - Track if backup disagrees more often (good = catching errors)
   - Review "Disagree" cases to verify they're valid corrections
   - Adjust thresholds if needed

4. **Update Frontend Forms**
   - Add "Purpose" field to account forms
   - Add "Desired Checking Balance" to onboarding
   - Update account displays to show purposes

---

## Success Criteria

✅ **Phase 1 Complete:**
- Backup AI receives full original data
- Account purpose field added to database
- User preferences field added to database
- AI context includes all new fields
- Migration applied successfully

🔄 **Phase 2 In Progress:**
- User updates account purposes via frontend
- User sets transactional balance preference
- Generate advice with new context

⏳ **Phase 3 Pending:**
- Verify backup AI catches data errors
- Monitor agreement scores
- Confirm improved recommendation accuracy

---

## Risk Assessment

**Low Risk Changes:**
- Adding optional fields (Purpose, TransactionalAccountDesiredBalance)
- Enhancing AI context (more data = better decisions)
- Backward compatible (old accounts work without Purpose)

**Medium Risk Changes:**
- Increased token usage for backup (cost impact)
- Backup may disagree more often (expected behavior)

**Mitigation:**
- Token limits already generous (3000 for backup)
- Disagreement is good = backup doing its job
- Can revert to Wave 7.3 prompt if needed

---

## Rollback Plan

If issues arise:

1. **Revert Prompt Changes:**
   - Remove raw data from backup prompt
   - Use simpler fact-checking instructions

2. **Keep Database Changes:**
   - Purpose and TransactionalAccountDesiredBalance are useful
   - Can be used by future features

3. **Migration Rollback:**
   ```bash
   dotnet ef migrations remove --context ApplicationDbContext
   ```

---

**Status:** ✅ Ready for User Testing  
**Next Action:** User updates account data via frontend, then generate new advice  
**Expected Outcome:** More accurate recommendations with proper fact-checking
