# CSV Import Format - Cash Accounts

## Overview
This document defines the CSV format for bulk importing cash accounts (checking, savings, money market) into PFMP.

## CSV Format Specification

### Required Columns
- `Institution` - Bank or credit union name (e.g., "Chase", "USAA", "Navy Federal")
- `AccountType` - Type of account: `checking`, `savings`, or `money_market`
- `Balance` - Current account balance (numeric, no currency symbols)

### Optional Columns
- `Nickname` - Friendly name for the account (e.g., "Primary Checking", "Emergency Fund")
- `InterestRateApr` - Annual percentage rate (numeric, as percentage: 4.5 for 4.5%)
- `Purpose` - Description of account purpose (e.g., "Monthly expenses", "Emergency savings")
- `IsEmergencyFund` - Boolean flag: `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive)

### CSV Example

```csv
Institution,Nickname,AccountType,Balance,InterestRateApr,Purpose,IsEmergencyFund
Chase,Primary Checking,checking,5000.00,0.01,Monthly transactions,false
Ally Bank,High Yield Savings,savings,15000.00,4.35,Emergency fund,true
Navy Federal,Vacation Fund,savings,3000.00,2.5,Vacation savings,false
USAA,Money Market,money_market,25000.00,3.75,Short-term savings,false
Wells Fargo,Business Checking,checking,10000.00,0.10,Business expenses,false
```

## Validation Rules

### Required Field Validation
1. **Institution** - Cannot be empty, max 150 characters
2. **AccountType** - Must be one of: `checking`, `savings`, `money_market`
3. **Balance** - Must be numeric, cannot be negative

### Optional Field Validation
1. **Nickname** - Max 200 characters, defaults to Institution + AccountType if empty
2. **InterestRateApr** - Must be between 0 and 100 if provided
3. **Purpose** - Max 500 characters
4. **IsEmergencyFund** - Defaults to `false` if empty or invalid

## Import Behavior

### Success Case
- All valid rows are imported as new CashAccount records
- Each account is linked to the importing user's UserId
- Dashboard automatically reflects new accounts

### Error Handling
- **Invalid rows are skipped** - Import continues with valid rows
- Import summary returned:
  ```json
  {
    "totalRows": 5,
    "successCount": 4,
    "errorCount": 1,
    "errors": [
      {
        "row": 3,
        "field": "Balance",
        "message": "Balance must be a positive number"
      }
    ],
    "importedAccountIds": ["guid1", "guid2", "guid3", "guid4"]
  }
  ```

### Duplicate Detection
- No automatic duplicate detection
- Users can manually delete unwanted accounts after import
- Future enhancement: Check for Institution + Nickname duplicates

## Usage Instructions

### For Users
1. Prepare CSV file following format above
2. Navigate to Dashboard → Cash Accounts section
3. Click "Import CSV" button
4. Select your CSV file
5. Review preview table
6. Click "Import" to create accounts
7. Check import summary for any errors

### For Developers
- Backend endpoint: `POST /api/cashaccounts/import`
- Request: multipart/form-data with CSV file
- Response: ImportSummaryResponse DTO
- Service: CsvImportService.cs handles parsing and validation

## Future Enhancements
- [ ] Support for updating existing accounts (match by Institution + Nickname)
- [ ] Import holdings for investment accounts
- [ ] Import transactions history
- [ ] Template download with sample data
- [ ] Column mapping UI for custom CSV formats
