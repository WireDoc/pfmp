# Wave 9.2 - Table Migration Complete

## Summary
Successfully migrated from dual table architecture (CashAccounts/InvestmentAccounts) to unified Accounts/Holdings tables.

## Changes Made

### Backend (C#)

#### 1. DashboardController.cs ✅
- **Changed**: Reads from `Accounts` table instead of `CashAccounts`/`InvestmentAccounts`
- **Updated**: Account type filtering uses `AccountType` enum
- **Fixed**: Net worth calculations aggregate from unified table
- **Added**: `holdingsCount` to account responses

#### 2. FinancialProfileService.cs ✅
- **`UpsertCashAccountsAsync`**: Writes to `Accounts` table with proper enum mapping
- **`UpsertInvestmentAccountsAsync`**: Writes to `Accounts` table with category mapping
- **`GetCashAccountsAsync`**: Reads from `Accounts` table, maps back to legacy format
- **`GetInvestmentAccountsAsync`**: Reads from `Accounts` table, maps back to legacy format
- **`RecalculateSnapshotAsync`**: Calculates totals from `Accounts` table

#### 3. CsvImportService.cs ✅
- **Changed**: Imports CSV to `Accounts` table instead of `CashAccounts`
- **Updated**: Maps account types to `AccountType` enum
- **Fixed**: Interest rate conversion (APR% → decimal)
- **Fixed**: Returns integer `AccountId` instead of GUID

### Frontend (TypeScript/React)

#### 4. AccountsPanel.tsx ✅
- **Removed**: Cash-only filter (`filter(a => a.type === 'cash')`)
- **Changed**: Displays all account types (cash, investments, crypto, etc.)
- **Updated**: Title changed from "Cash Accounts" to "Accounts"
- **Added**: Check for integer AccountId before edit (old GUID accounts skip edit)

#### 5. apiDashboardService.ts ✅
- **Added**: `getEffectiveUserId()` function to respect dev user selector
- **Changed**: Dynamic URL builders (`getAlertsUrl`, `getAdviceUrl`, `getTasksUrl`)
- **Fixed**: Dashboard now uses selected user instead of env variable
- **Priority**: Dev user selector > Env variable > Default (1)

#### 6. .env.development ✅
- **Commented out**: `VITE_PFMP_DASHBOARD_USER_ID=20`
- **Reason**: Dashboard should use actual logged-in/selected user

### Database Cleanup

#### 7. Data Migration ✅
- **Deleted**: All data from `CashAccounts` table
- **Deleted**: All data from `InvestmentAccounts` table
- **Deleted**: TSP accounts from `Accounts` table (TSP uses separate `TspLifecyclePositions` table)
- **Result**: Clean separation - Accounts table for user-managed accounts, TSP table for TSP data

## Old Tables Status

### Tables Cleared (Data Deleted, Schema Remains)
- `CashAccounts` - Legacy cash account storage
- `InvestmentAccounts` - Legacy investment account storage

### Tables Still Active
- `Accounts` - **NEW unified table** for all user-managed accounts
- `Holdings` - **NEW detailed positions table**
- `TspLifecyclePositions` - TSP-specific data (unchanged)
- `RealEstateProperties` - Property data (unchanged)

## Testing Status

### ✅ Completed
1. DashboardController reads from new tables correctly
2. FinancialProfileService writes to new tables during onboarding
3. CSV import creates accounts in new table
4. Dashboard respects user selector
5. Old data cleared from legacy tables

### ⏳ Needs Testing
1. Complete onboarding flow with new user
2. CSV import with various account types
3. Dashboard display for multiple users
4. Navigation to account detail views (integer AccountId routing)
5. Refresh prices functionality
6. Price charts display

## Remaining Tasks

### High Priority
1. **Vitest Tests**: Update test files to reference new table structure
2. **End-to-End Testing**: Validate full onboarding→dashboard flow
3. **Rename DashboardWave4**: Remove wave-specific naming

### Medium Priority
4. **Remove Old Models**: Archive `CashAccount` and `InvestmentAccount` model classes
5. **Drop Old Tables**: Consider dropping `CashAccounts` and `InvestmentAccounts` tables after validation
6. **Documentation**: Update API docs and architectural diagrams

### Low Priority
7. **AccountDetailView Navigation**: Add proper routing from dashboard to account details
8. **Legacy Data Migration Script**: If needed for production data (not needed for dev/test)

## Known Issues / Limitations

1. **Old Account Editing**: Dashboard shows old accounts with GUID IDs but clicking edit does nothing (by design - they're deprecated)
2. **TSP Display**: TSP appears as aggregate in dashboard (correct behavior - detailed TSP in separate section)
3. **Frontend Restart Required**: Changes to `.env.development` require Vite server restart

## Files Modified

### Backend (7 files)
- `Controllers/DashboardController.cs`
- `Services/FinancialProfile/FinancialProfileService.cs`
- `Services/CsvImportService.cs`

### Frontend (2 files)
- `views/dashboard/AccountsPanel.tsx`
- `services/dashboard/apiDashboardService.ts`
- `.env.development`

### Documentation (1 file)
- `docs/waves/wave-9.2-migration-summary.md` (this file)

## Migration Strategy Chosen

**Option A**: Migrate to new unified tables
- Clean architecture going forward
- No data synchronization complexity
- Old test data discarded (acceptable per user)
- Onboarding writes directly to correct tables
- Dashboard reads from correct tables

## Next Steps

1. **Restart Frontend Server**: Pick up `.env` changes
2. **Test User 13 Onboarding**: Complete flow with CSV import
3. **Verify Dashboard**: Check that User 13 sees their own data
4. **Test Wave 9.2 Features**: Refresh prices, price charts
5. **Update Tests**: Fix Vitest test suite for new tables
6. **Rename Dashboard Component**: Remove "Wave4" naming

## Success Criteria

- ✅ Single source of truth (Accounts/Holdings tables)
- ✅ No data duplication between old/new tables
- ✅ Dashboard shows correct user's data
- ✅ Onboarding saves to correct tables
- ✅ CSV import works with new table structure
- ⏳ All tests passing
- ⏳ Navigation to account details working
- ⏳ Wave 9.2 market data features accessible

---

**Migration Date**: 2025-11-08
**Completed By**: AI Assistant (Claude)
**Reviewed By**: User (WireDoc)
