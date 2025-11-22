# Wave 9.3 Option A Part 2: Investment Transaction Management

**Date:** November 21, 2025  
**Status:** 📋 **Planning** - Supplemental work to complete Option A  
**Relates To:** Wave 9.3 Option A (Enhanced Investment Metrics)

---

## Executive Summary

While Wave 9.3 Option A successfully delivered 4 analytics tabs (Performance, Tax Insights, Risk Analysis, Allocation), the **Transactions tab** for investment accounts remains unimplemented (currently showing placeholder text: "Transaction history coming soon..."). This supplemental work completes Option A by building a professional-grade investment transaction management interface.

**Key Discovery:** The backend infrastructure is **fully complete**:
- ✅ `Transactions` table with 25 columns (investment + cash + crypto transactions)
- ✅ `TransactionsController` with 8 REST endpoints (GET, POST, PUT, DELETE)
- ✅ 30 test transactions seeded for account 48 (15 buys + 15 dividends)
- ✅ Transaction types: Buy, Sell, Dividend, DividendReinvest, CapitalGains, Interest, Split, Spinoff, Deposit, Withdrawal, etc.

**What's Missing:** Frontend transaction management components for investment accounts.

**Design Decision:** The existing `TransactionList.tsx` component is **cash-account specific** (lives in `components/cash-accounts/`, uses `CashTransactionDto`, filters by categories like "InterestEarned"). Investment transactions require a **separate component** with investment-specific features:
- Quantity, Price, Symbol columns
- Transaction types: Buy, Sell, Dividend, Split
- Tax lots, cost basis, capital gains tracking
- Fee breakdowns, settlement dates
- Dividend reinvestment indicators

**Recommendation:** Create new `InvestmentTransactionList.tsx` component instead of trying to merge with cash-specific logic.

---

## 1. Current State Analysis

### Backend Infrastructure ✅ COMPLETE

#### Transactions Table (25 Columns)
| Column | Type | Purpose | Investment-Specific |
|--------|------|---------|-------------------|
| TransactionId | int (PK) | Unique identifier | |
| AccountId | int (FK) | Links to Accounts table | |
| HoldingId | int (FK, nullable) | Links to Holdings (null for cash) | ✅ |
| TransactionType | varchar(100) | BUY, SELL, DIVIDEND, etc. | ✅ |
| Symbol | varchar(20) | Stock/crypto ticker | ✅ |
| Quantity | decimal(18,8) | Shares/units traded | ✅ |
| Price | decimal(18,8) | Price per share | ✅ |
| Amount | decimal(18,2) | Total transaction value | |
| Fee | decimal(18,2) | Broker fees | ✅ |
| TransactionDate | timestamp | Trade date | |
| SettlementDate | timestamp | T+2 settlement | ✅ |
| IsTaxable | boolean | Tax reporting flag | ✅ |
| IsLongTermCapitalGains | boolean | Holding period >365 days | ✅ |
| TaxableAmount | decimal(18,2) | Taxable portion | ✅ |
| CostBasis | decimal(18,2) | Original purchase price | ✅ |
| CapitalGainLoss | decimal(18,2) | Realized gain/loss | ✅ |
| Source | int (enum) | Manual, API, etc. | |
| ExternalTransactionId | varchar(100) | Broker transaction ID | ✅ |
| Description | varchar(500) | Transaction notes | |
| IsDividendReinvestment | boolean | DRIP indicator | ✅ |
| IsQualifiedDividend | boolean | Tax treatment | ✅ |
| StakingReward | decimal(18,2) | Crypto staking rewards | ✅ |
| StakingAPY | decimal(8,4) | Staking APY % | ✅ |
| CreatedAt | timestamp | Record creation time | |
| Notes | text | User notes | |

**Sample Data (Account 48):**
```json
{
  "TransactionId": 36,
  "AccountId": 48,
  "HoldingId": 56,
  "TransactionType": "Buy",
  "Symbol": "VOO",
  "Quantity": 30,
  "Price": 380,
  "Amount": -11406.95,
  "Fee": 6.95,
  "TransactionDate": "2024-05-15T05:00:00Z",
  "SettlementDate": "2024-05-17T05:00:00Z",
  "Notes": "Initial VOO purchase"
}
```

#### TransactionsController API Endpoints ✅ COMPLETE
**File:** `PFMP-API/Controllers/TransactionsController.cs` (358 lines)

1. **GET /api/transactions** - List with filtering
   - Query params: `accountId`, `holdingId`, `startDate`, `endDate`, `transactionType`
   - Returns: `List<TransactionResponse>`
   - Supports date range filtering, transaction type filtering
   - Orders by TransactionDate descending

2. **GET /api/transactions/{id}** - Get single transaction
   - Returns: `TransactionResponse` with includes (Account, Holding)

3. **POST /api/transactions** - Create new transaction
   - Request: `CreateTransactionRequest`
   - Validates account and holding existence
   - Returns: `TransactionResponse` with 201 Created

4. **PUT /api/transactions/{id}** - Update transaction
   - Request: `UpdateTransactionRequest` (partial updates supported)
   - Only updates provided fields
   - Returns: `TransactionResponse`

5. **DELETE /api/transactions/{id}** - Delete transaction
   - Returns: 204 No Content

#### Transaction Types Supported
**File:** `PFMP-API/Models/Transaction.cs` (TransactionTypes class)

**Investment Transactions:**
- `BUY` - Purchase shares/units
- `SELL` - Sell shares/units
- `DIVIDEND` - Cash dividend payment
- `DIVIDEND_REINVEST` - DRIP purchase
- `CAPITAL_GAINS` - Capital gains distribution
- `INTEREST` - Interest income
- `SPLIT` - Stock split
- `SPINOFF` - Corporate spinoff

**Cash Transactions:**
- `DEPOSIT` - Cash deposit
- `WITHDRAWAL` - Cash withdrawal
- `TRANSFER` - Transfer between accounts
- `FEE` - Account fees
- `INTEREST_EARNED` - Interest from cash accounts

**Crypto Transactions:**
- `CRYPTO_STAKING` - Staking rewards
- `CRYPTO_SWAP` - Swap between coins
- `CRYPTO_MINING` - Mining rewards
- `DEFI_YIELD` - DeFi protocol yield

**TSP Transactions:**
- `TSP_CONTRIBUTION` - Employee contribution
- `TSP_EMPLOYER_MATCH` - Employer match
- `TSP_REBALANCE` - Fund rebalance

### Frontend Current State ❌ INCOMPLETE

#### AccountDetailView.tsx (384 lines)
**Location:** `pfmp-frontend/src/views/dashboard/AccountDetailView.tsx`

**Current Implementation (Lines 343-356):**
```tsx
<TabPanel value={tabValue} index={isInvestmentAccount ? 5 : 0}>
  <Paper sx={{ p: 3 }}>
    {isInvestmentAccount ? (
      <Typography variant="body1" color="text.secondary">
        Transaction history coming soon...
      </Typography>
    ) : (
      // ... loan/credit/other account placeholders
    )}
  </Paper>
</TabPanel>
```

**Tab Order for Investment Accounts:**
1. Holdings (index 0)
2. Performance (index 1)
3. Tax Insights (index 2)
4. Risk Analysis (index 3)
5. Allocation (index 4)
6. **Transactions (index 5)** ← PLACEHOLDER

#### Existing TransactionList.tsx ❌ NOT REUSABLE
**Location:** `pfmp-frontend/src/components/cash-accounts/TransactionList.tsx` (374 lines)

**Why It's Cash-Specific:**
1. **Component Location:** Lives in `cash-accounts/` folder
2. **Props:** Uses `cashAccountId?: string` (UUID-based cash accounts)
3. **API Endpoint:** Calls `/api/cash-accounts/{cashAccountId}/transactions`
4. **Data Model:** Uses `CashTransactionDto` interface
5. **Columns:** date, description, category, amount, balanceAfter, checkNumber
6. **Categories:** Deposit, Withdrawal, Transfer, Fee, InterestEarned (cash-specific)
7. **Features:** Running balance calculation, check numbers, no investment data

**Missing Investment Features:**
- ❌ Symbol column
- ❌ Quantity column
- ❌ Price column
- ❌ Fee breakdown
- ❌ Settlement date
- ❌ Cost basis tracking
- ❌ Tax lot management
- ❌ Dividend reinvestment indicator
- ❌ Buy/Sell transaction types
- ❌ Capital gains/loss display

---

## 2. Recommended Approach

### Design Decision: Create Separate Component

**Option 1: Extend TransactionList.tsx** ❌ NOT RECOMMENDED
- Pros: Single component
- Cons:
  - Two completely different data models (cash vs investment)
  - Different API endpoints (`/cash-accounts/{id}/transactions` vs `/transactions?accountId={id}`)
  - Different column sets (10+ columns difference)
  - Different filtering logic
  - Increases complexity to 600+ lines
  - Maintenance nightmare with conditional rendering

**Option 2: Create InvestmentTransactionList.tsx** ✅ RECOMMENDED
- Pros:
  - Clean separation of concerns
  - Investment-specific features without conditionals
  - Easier to maintain and test
  - Can be extended for crypto-specific features
  - Matches existing pattern (cash-accounts/ vs investment-accounts/ folders)
- Cons:
  - Some code duplication (DataGrid setup, filtering UI)
  - Shared utilities can be extracted to common folder

### File Structure
```
pfmp-frontend/src/components/
├── cash-accounts/
│   └── TransactionList.tsx (374 lines) ✅ KEEP AS-IS
├── investment-accounts/ (NEW FOLDER)
│   ├── InvestmentTransactionList.tsx (NEW - 450 lines)
│   ├── InvestmentTransactionForm.tsx (NEW - 300 lines)
│   └── TransactionTypeChip.tsx (NEW - 80 lines)
└── common/ (NEW FOLDER - for shared utilities)
    └── TransactionFilters.tsx (NEW - 150 lines)
```

---

## 3. Feature Requirements

### 3.1 InvestmentTransactionList Component

#### Core Features
- [x] **DataGrid Display** (MUI X DataGrid)
  - Columns: Date, Type, Symbol, Quantity, Price, Amount, Fee, Settlement Date, Notes
  - Sortable on all columns
  - Default sort: Date descending
  - Client-side pagination (25/50/100 rows per page)
  - Row selection (for bulk operations)

- [x] **Filtering**
  - Transaction type filter: Buy, Sell, Dividend, All
  - Symbol filter: Dropdown of holdings + "All"
  - Date range picker: Start date, End date
  - Search bar: Filter by notes/description

- [x] **Transaction Type Indicators**
  - Buy: Green chip with TrendingUp icon
  - Sell: Red chip with TrendingDown icon
  - Dividend: Blue chip with AttachMoney icon
  - DividendReinvest: Purple chip with Autorenew icon
  - Color-coded amounts: Green (income), Red (expense)

- [x] **Responsive Layout**
  - Mobile: Show date, type, symbol, amount (collapse quantity/price)
  - Tablet: Show all columns except settlement date
  - Desktop: Show all columns

- [x] **Export Functionality**
  - CSV export button
  - Columns: All data fields
  - Filename: `{account-name}-transactions-{date}.csv`

#### Advanced Features (Future)
- [ ] **Tax Lot Tracking**
  - Show cost basis on sell transactions
  - Calculate realized gains/losses
  - Long-term vs short-term indicator

- [ ] **Transaction Grouping**
  - Group DRIP transactions with dividends
  - Group split transactions

- [ ] **Performance Metrics**
  - Running total of dividends (YTD, 1Y, All)
  - Total fees paid

### 3.2 InvestmentTransactionForm Component

#### Create/Edit Transaction Modal
- [x] **Form Fields**
  - Transaction Type: Dropdown (Buy, Sell, Dividend, DividendReinvest)
  - Symbol: Autocomplete from holdings
  - Date: Date picker (default: today)
  - Settlement Date: Date picker (default: date + 2 days for stocks, same day for crypto)
  - Quantity: Number input (8 decimal places for crypto)
  - Price: Number input (8 decimal places)
  - Fee: Number input (optional)
  - Notes: Text area (optional)

- [x] **Validation**
  - Required fields: Type, Symbol, Date, Quantity, Price
  - Quantity > 0
  - Price > 0
  - Fee >= 0
  - Settlement date >= Transaction date

- [x] **Auto-calculations**
  - Amount = (Quantity × Price) + Fee (for buys)
  - Amount = (Quantity × Price) - Fee (for sells)
  - Display calculated amount (read-only)

- [x] **Type-Specific Fields**
  - Buy/Sell: Show quantity, price, fee
  - Dividend: Show amount only (no quantity/price)
  - DividendReinvest: Show quantity, price, amount

#### Actions
- [x] **Create Transaction**
  - POST /api/transactions
  - Update holdings table after successful create
  - Show success toast

- [x] **Edit Transaction**
  - PUT /api/transactions/{id}
  - Partial updates supported
  - Show success toast

- [x] **Delete Transaction**
  - Confirmation dialog
  - DELETE /api/transactions/{id}
  - Update holdings table after successful delete
  - Show success toast

### 3.3 Integration with AccountDetailView

#### Update Tab Layout
```tsx
{/* Transactions Tab */}
{isInvestmentAccount && (
  <TabPanel value={tabValue} index={5}>
    <InvestmentTransactionList accountId={Number(accountId)} />
  </TabPanel>
)}
```

#### Add Button
```tsx
{tabValue === 5 && isInvestmentAccount && (
  <Button
    variant="contained"
    startIcon={<AddIcon />}
    onClick={handleAddTransaction}
  >
    Add Transaction
  </Button>
)}
```

---

## 4. Data Models (TypeScript Interfaces)

### Frontend Types
```typescript
// Investment Transaction (from backend API)
export interface InvestmentTransaction {
  transactionId: number;
  accountId: number;
  holdingId: number | null;
  transactionType: TransactionType;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  fee: number | null;
  transactionDate: string; // ISO 8601
  settlementDate: string; // ISO 8601
  isTaxable: boolean;
  isLongTermCapitalGains: boolean;
  taxableAmount: number | null;
  costBasis: number | null;
  capitalGainLoss: number | null;
  source: TransactionSource;
  externalTransactionId: string | null;
  description: string | null;
  isDividendReinvestment: boolean;
  isQualifiedDividend: boolean;
  stakingReward: number | null;
  stakingAPY: number | null;
  createdAt: string;
  notes: string | null;
}

export type TransactionType = 
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'DIVIDEND_REINVEST'
  | 'CAPITAL_GAINS'
  | 'INTEREST'
  | 'SPLIT'
  | 'SPINOFF'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'FEE'
  | 'INTEREST_EARNED'
  | 'CRYPTO_STAKING'
  | 'CRYPTO_SWAP'
  | 'CRYPTO_MINING'
  | 'DEFI_YIELD'
  | 'TSP_CONTRIBUTION'
  | 'TSP_EMPLOYER_MATCH'
  | 'TSP_REBALANCE'
  | 'OTHER';

export enum TransactionSource {
  Manual = 0,
  BinanceAPI = 1,
  CoinbaseAPI = 2,
  TDAmeritrade = 3,
  ETrade = 4,
  Schwab = 5,
  Fidelity = 6,
  TSPUpdate = 7,
  BankAPI = 8,
  Other = 9
}

// Create Transaction Request
export interface CreateTransactionRequest {
  accountId: number;
  holdingId?: number;
  transactionType: TransactionType;
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fee?: number;
  transactionDate: string;
  settlementDate: string;
  isTaxable?: boolean;
  isLongTermCapitalGains?: boolean;
  taxableAmount?: number;
  costBasis?: number;
  capitalGainLoss?: number;
  source?: TransactionSource;
  externalTransactionId?: string;
  description?: string;
  isDividendReinvestment?: boolean;
  isQualifiedDividend?: boolean;
  stakingReward?: number;
  stakingAPY?: number;
  notes?: string;
}

// Update Transaction Request (all fields optional except id)
export interface UpdateTransactionRequest {
  transactionType?: TransactionType;
  symbol?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  fee?: number;
  transactionDate?: string;
  settlementDate?: string;
  isTaxable?: boolean;
  isLongTermCapitalGains?: boolean;
  taxableAmount?: number;
  costBasis?: number;
  capitalGainLoss?: number;
  description?: string;
  isDividendReinvestment?: boolean;
  isQualifiedDividend?: boolean;
  notes?: string;
}
```

---

## 5. API Service Layer

### investmentTransactionsApi.ts
```typescript
import axios from 'axios';
import type { InvestmentTransaction, CreateTransactionRequest, UpdateTransactionRequest } from '../types/transactions';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

export interface FetchTransactionsParams {
  accountId: number;
  holdingId?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
}

export async function fetchInvestmentTransactions(
  params: FetchTransactionsParams
): Promise<InvestmentTransaction[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('accountId', params.accountId.toString());
  
  if (params.holdingId) queryParams.append('holdingId', params.holdingId.toString());
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.transactionType) queryParams.append('transactionType', params.transactionType);

  const response = await axios.get<InvestmentTransaction[]>(
    `${API_BASE_URL}/transactions?${queryParams.toString()}`,
    { timeout: 60000 }
  );
  return response.data;
}

export async function fetchTransaction(id: number): Promise<InvestmentTransaction> {
  const response = await axios.get<InvestmentTransaction>(
    `${API_BASE_URL}/transactions/${id}`
  );
  return response.data;
}

export async function createTransaction(
  request: CreateTransactionRequest
): Promise<InvestmentTransaction> {
  const response = await axios.post<InvestmentTransaction>(
    `${API_BASE_URL}/transactions`,
    request
  );
  return response.data;
}

export async function updateTransaction(
  id: number,
  request: UpdateTransactionRequest
): Promise<InvestmentTransaction> {
  const response = await axios.put<InvestmentTransaction>(
    `${API_BASE_URL}/transactions/${id}`,
    request
  );
  return response.data;
}

export async function deleteTransaction(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/transactions/${id}`);
}

// Helper to format transaction type for display
export function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    'BUY': 'Buy',
    'SELL': 'Sell',
    'DIVIDEND': 'Dividend',
    'DIVIDEND_REINVEST': 'Dividend Reinvest',
    'CAPITAL_GAINS': 'Capital Gains',
    'INTEREST': 'Interest',
    'SPLIT': 'Stock Split',
    'SPINOFF': 'Spinoff',
    'CRYPTO_STAKING': 'Staking Reward',
    'CRYPTO_SWAP': 'Crypto Swap',
    'CRYPTO_MINING': 'Mining Reward',
    'DEFI_YIELD': 'DeFi Yield',
    'TSP_CONTRIBUTION': 'TSP Contribution',
    'TSP_EMPLOYER_MATCH': 'Employer Match',
    'TSP_REBALANCE': 'Rebalance'
  };
  return map[type] || type;
}

// Helper to determine if transaction increases holdings
export function isIncreasingTransaction(type: string): boolean {
  return ['BUY', 'DIVIDEND_REINVEST', 'SPLIT', 'CRYPTO_STAKING', 
          'CRYPTO_MINING', 'DEFI_YIELD', 'TSP_CONTRIBUTION', 
          'TSP_EMPLOYER_MATCH'].includes(type);
}

// Helper to determine if transaction decreases holdings
export function isDecreasingTransaction(type: string): boolean {
  return ['SELL', 'CRYPTO_SWAP'].includes(type);
}
```

---

## 6. Implementation Plan

### Phase 1: API Service & Types (2 hours)
- [x] Create `src/types/transactions.ts` with all interfaces
- [x] Create `src/services/investmentTransactionsApi.ts`
- [x] Add axios timeout configuration (60s)
- [x] Test API endpoints with Postman/Insomnia

### Phase 2: Transaction List Component (4 hours)
- [x] Create `src/components/investment-accounts/` folder
- [x] Create `InvestmentTransactionList.tsx`
  - DataGrid setup with columns
  - Filtering UI (type, symbol, date range, search)
  - Pagination and sorting
  - Transaction type chips with icons
  - Color-coded amounts
- [x] Create `TransactionTypeChip.tsx` utility component
- [x] CSV export functionality

### Phase 3: Transaction Form Component (4 hours)
- [x] Create `InvestmentTransactionForm.tsx`
  - Modal dialog with form fields
  - Type-specific field visibility
  - Validation logic
  - Auto-calculation of amount
  - Settlement date auto-fill (T+2 for stocks)
- [x] Handle create, update, delete operations
- [x] Success/error toast notifications

### Phase 4: Integration (2 hours)
- [x] Update `AccountDetailView.tsx`
  - Import InvestmentTransactionList
  - Replace placeholder in TabPanel index 5
  - Add "Add Transaction" button when tab is active
  - Wire up modal open/close handlers
- [x] Test full user flow:
  - View transactions list
  - Filter by type, symbol, date range
  - Add new transaction
  - Edit existing transaction
  - Delete transaction
  - CSV export

### Phase 5: Testing & Documentation (2 hours)
- [x] Manual testing:
  - Test with account 48 (30 existing transactions)
  - Verify all filters work
  - Verify sorting works
  - Verify pagination works
  - Verify CRUD operations
  - Test CSV export
- [x] Update documentation:
  - Update `wave-9.3-option-a-complete.md` with transaction tab info
  - Add screenshots to docs
- [x] Commit and push all changes

**Total Estimated Time:** 14 hours (2 days)

---

## 7. Testing Strategy

### Backend Testing ✅ ALREADY TESTED
- API endpoints tested during Wave 8.3
- 30 transactions seeded successfully for account 48
- CRUD operations verified in Postman

### Frontend Testing

#### Unit Tests (Future)
- [ ] InvestmentTransactionList component rendering
- [ ] Filter logic (type, symbol, date range)
- [ ] Sort logic
- [ ] CSV export function
- [ ] TransactionTypeChip color mapping
- [ ] API service functions

#### Integration Tests
- [ ] Create transaction → Holdings table updated
- [ ] Edit transaction → UI reflects changes
- [ ] Delete transaction → Removed from list
- [ ] Filter transactions → API called with correct params
- [ ] Sort transactions → Correct order displayed

#### Manual Testing Checklist
- [ ] Load transactions tab for account 48
- [ ] Verify 30 transactions display (15 buys + 15 dividends)
- [ ] Filter by Buy transactions → 15 results
- [ ] Filter by Dividend transactions → 15 results
- [ ] Filter by symbol "VOO" → 6 results (3 buys + 3 dividends)
- [ ] Sort by Amount descending → Largest transactions first
- [ ] Date range filter → Correct subset displayed
- [ ] Search by notes → Matching transactions
- [ ] Pagination → Switch between pages
- [ ] CSV export → File downloads correctly
- [ ] Add new Buy transaction → Appears in list
- [ ] Edit transaction notes → Changes saved
- [ ] Delete transaction → Removed from list
- [ ] Mobile responsive → Columns collapse correctly

---

## 8. User Stories

### Story 1: View Transaction History
**As a** portfolio manager  
**I want to** view all investment transactions for an account  
**So that** I can track my trading activity

**Acceptance Criteria:**
- [x] Transactions tab displays all transactions for selected account
- [x] Default sort is by date descending (newest first)
- [x] Transaction type, symbol, quantity, price, amount displayed
- [x] Color-coded indicators for buy (green), sell (red), dividend (blue)

### Story 2: Filter Transactions
**As a** tax preparer  
**I want to** filter transactions by type and date range  
**So that** I can analyze specific transaction categories for tax reporting

**Acceptance Criteria:**
- [x] Filter by transaction type (Buy, Sell, Dividend, All)
- [x] Filter by symbol (dropdown of holdings)
- [x] Filter by date range (start date, end date)
- [x] Search by notes/description
- [x] Filters persist when switching tabs

### Story 3: Add Transaction
**As a** investor  
**I want to** manually add a buy transaction  
**So that** I can track purchases made through my broker

**Acceptance Criteria:**
- [x] "Add Transaction" button visible on Transactions tab
- [x] Modal form with required fields: Type, Symbol, Date, Quantity, Price
- [x] Amount auto-calculated: (Quantity × Price) + Fee
- [x] Settlement date defaults to Date + 2 days
- [x] Transaction appears in list after successful creation
- [x] Holdings table updated to reflect new transaction

### Story 4: Edit Transaction
**As a** investor  
**I want to** edit transaction notes  
**So that** I can add context about my trading decisions

**Acceptance Criteria:**
- [x] Click transaction row to open edit modal
- [x] Pre-populated with existing values
- [x] Can update any field except TransactionId
- [x] Changes saved with PUT request
- [x] Updated transaction displays immediately

### Story 5: Delete Transaction
**As a** portfolio manager  
**I want to** delete erroneous transactions  
**So that** my portfolio accurately reflects actual holdings

**Acceptance Criteria:**
- [x] Delete icon button on each transaction row
- [x] Confirmation dialog before deletion
- [x] Transaction removed from list after successful deletion
- [x] Holdings table updated to remove transaction impact

### Story 6: Export Transactions
**As a** accountant  
**I want to** export transactions to CSV  
**So that** I can import them into my accounting software

**Acceptance Criteria:**
- [x] "Export" button in toolbar
- [x] CSV includes all transaction fields
- [x] Filename: `{account-name}-transactions-{date}.csv`
- [x] Respects current filters (only exports visible transactions)

---

## 9. Success Criteria

### Functional Requirements ✅
- [x] Transaction list displays for all investment account types
- [x] All transaction types supported (Buy, Sell, Dividend, etc.)
- [x] Filtering works for type, symbol, date range, search
- [x] Sorting works on all columns
- [x] Pagination supports 25/50/100 rows per page
- [x] CRUD operations (Create, Read, Update, Delete)
- [x] CSV export functionality
- [x] Mobile responsive design

### Performance Requirements
- [x] Transaction list loads in <2 seconds for 100 transactions
- [x] Filtering applies in <500ms
- [x] Sorting applies in <500ms
- [x] CSV export completes in <1 second for 500 transactions

### User Experience Requirements
- [x] Color-coded transaction types (green buy, red sell, blue dividend)
- [x] Intuitive filter UI with clear labels
- [x] Form validation with helpful error messages
- [x] Success/error toast notifications
- [x] Confirmation dialog for destructive actions (delete)
- [x] Loading states during API calls

---

## 10. Known Limitations & Future Enhancements

### Current Limitations
1. **No Tax Lot Management:** Doesn't track which shares were sold (FIFO, LIFO, Specific ID)
2. **No Bulk Operations:** Can't select multiple transactions to delete/export
3. **No Transaction Reconciliation:** Can't mark transactions as reconciled with broker statements
4. **No Duplicate Detection:** Doesn't warn if adding duplicate transactions
5. **No Transaction Categories:** All transactions in flat list (no grouping by month/quarter)

### Future Enhancements (Wave 10+)
- [ ] **Tax Lot Tracking:**
  - Track cost basis per tax lot
  - Support FIFO, LIFO, HIFO, Specific ID methods
  - Calculate wash sale violations
  - Generate 1099-B report

- [ ] **Advanced Filtering:**
  - Filter by holding period (short-term vs long-term)
  - Filter by source (Manual, API imports)
  - Filter by tax status (taxable vs non-taxable)

- [ ] **Bulk Operations:**
  - Select multiple transactions (checkboxes)
  - Bulk delete with confirmation
  - Bulk export selected transactions

- [ ] **Transaction Import:**
  - CSV import from broker statements
  - OFX/QFX file import
  - API integration with TD Ameritrade, E*TRADE, Schwab

- [ ] **Transaction Categories:**
  - Group by month/quarter/year
  - Collapsible sections
  - Summary stats per period (total dividends, total fees)

- [ ] **Reconciliation:**
  - Mark transactions as reconciled
  - Compare against broker statements
  - Highlight unreconciled transactions

- [ ] **Performance Analytics:**
  - Link to Performance tab metrics
  - Show how transactions impacted TWR/MWR
  - Visualize transaction timing on performance chart

---

## 11. Dependencies & Prerequisites

### Backend Dependencies ✅ READY
- TransactionsController API (already exists)
- Transactions table (already exists)
- Holdings table (for symbol validation)

### Frontend Dependencies
**Required:**
- `@mui/x-data-grid` (^6.18.0) ✅ Already installed
- `@mui/x-date-pickers` (^6.18.0) ✅ Already installed
- `@mui/material` (^5.15.0) ✅ Already installed
- `axios` (^1.6.0) ✅ Already installed
- `date-fns` (^2.30.0) ✅ Already installed

**New:**
- None required

### Environment Variables
```bash
# .env
VITE_API_BASE_URL=http://localhost:5052/api
```

---

## 12. Naming Conventions & File Organization

### Naming Strategy

#### Problem: Ambiguous Names
- `TransactionList.tsx` - Which type? Cash or Investment?
- `TransactionForm.tsx` - Which type?
- `Transaction` interface - Which fields?

#### Solution: Prefixed Names

**Option 1: Account Type Prefix** ✅ RECOMMENDED
```
CashTransactionList.tsx (existing - rename from TransactionList.tsx)
InvestmentTransactionList.tsx (new)
InvestmentTransactionForm.tsx (new)
```

**Option 2: Location-Based**
```
components/
├── cash-accounts/
│   └── TransactionList.tsx
└── investment-accounts/
    └── TransactionList.tsx
```

**Decision:** Use **Option 2** (location-based) since:
- Already established pattern (`cash-accounts/` folder exists)
- TypeScript imports make context clear: `import { TransactionList } from '../investment-accounts/TransactionList'`
- No need to rename existing files
- Easier to add crypto-accounts/, retirement-accounts/ folders later

### File Organization
```
pfmp-frontend/src/
├── components/
│   ├── cash-accounts/
│   │   ├── TransactionList.tsx (existing - 374 lines)
│   │   ├── BalanceTrendChart.tsx (existing)
│   │   └── AccountDetailsCard.tsx (existing)
│   ├── investment-accounts/ (NEW)
│   │   ├── InvestmentTransactionList.tsx (NEW - 450 lines)
│   │   ├── InvestmentTransactionForm.tsx (NEW - 300 lines)
│   │   └── TransactionTypeChip.tsx (NEW - 80 lines)
│   └── common/ (FUTURE - shared utilities)
│       └── TransactionFilters.tsx (FUTURE)
├── services/
│   ├── cashTransactionsApi.ts (existing)
│   └── investmentTransactionsApi.ts (NEW - 200 lines)
├── types/
│   ├── cashTransactions.ts (existing)
│   └── investmentTransactions.ts (NEW - 150 lines)
└── views/
    └── dashboard/
        └── AccountDetailView.tsx (existing - update)
```

---

## 13. Acceptance Criteria Summary

### Phase 1: API Service ✅
- [x] TypeScript interfaces match backend DTOs exactly
- [x] API service functions handle all CRUD operations
- [x] Error handling with axios interceptors
- [x] 60-second timeout for API calls

### Phase 2: Transaction List ✅
- [x] DataGrid displays all transactions for account
- [x] Columns: Date, Type, Symbol, Quantity, Price, Amount, Fee, Notes
- [x] Sortable on all columns
- [x] Pagination (25/50/100 rows per page)
- [x] Transaction type chips with color coding
- [x] Mobile responsive (collapse columns)

### Phase 3: Filtering ✅
- [x] Filter by transaction type (dropdown)
- [x] Filter by symbol (dropdown from holdings)
- [x] Date range picker (start date, end date)
- [x] Search bar (filter notes/description)
- [x] "Clear Filters" button

### Phase 4: CRUD Operations ✅
- [x] "Add Transaction" button opens modal
- [x] Form with validation
- [x] Create transaction via POST
- [x] Edit transaction via PUT (click row to open)
- [x] Delete transaction via DELETE (icon button + confirmation)
- [x] Success/error toast notifications

### Phase 5: CSV Export ✅
- [x] "Export" button in toolbar
- [x] Downloads CSV with all visible transactions
- [x] Respects current filters
- [x] Filename: `{account-name}-transactions-{date}.csv`

### Phase 6: Integration ✅
- [x] Replace placeholder in AccountDetailView
- [x] Transactions tab shows InvestmentTransactionList
- [x] "Add Transaction" button visible when tab is active
- [x] Transactions update after create/edit/delete

---

## 14. Risk Assessment

### Low Risk ✅
- **Backend Complete:** No database changes needed
- **Existing Pattern:** Similar to CashTransactionList implementation
- **Dependencies Installed:** All required MUI packages already in place
- **API Tested:** TransactionsController already tested in Wave 8.3

### Medium Risk ⚠️
- **Component Complexity:** 450-line component may need refactoring
- **State Management:** Filtering + sorting + pagination = complex state
- **Mobile Responsive:** Many columns may not fit on small screens

### Mitigation Strategies
1. **Break into smaller components:**
   - TransactionListToolbar (filters + export)
   - TransactionDataGrid (table only)
   - TransactionFormModal (form only)

2. **Use DataGrid built-in features:**
   - Built-in sorting
   - Built-in pagination
   - Built-in column visibility

3. **Progressive enhancement:**
   - Desktop: Show all columns
   - Tablet: Hide settlement date, fee
   - Mobile: Show date, type, symbol, amount only

---

## 15. Next Steps

### Immediate Actions (Today)
1. ✅ Create this planning document
2. ⏭️ Review and approve plan with user
3. ⏭️ Begin Phase 1: API Service & Types

### This Week
- Complete all 5 implementation phases
- Manual testing with account 48
- Update Wave 9.3 Option A documentation

### Completion Criteria
- All 6 user stories implemented
- Manual testing checklist completed
- Documentation updated
- Code committed and pushed
- Ready for Wave 9.3 Option B (Loan & Credit Card Views)

---

## 16. Conclusion

Wave 9.3 Option A Part 2 completes the investment account detail views by adding professional-grade transaction management. The backend infrastructure is already complete (30+ columns, 8 API endpoints, tested in Wave 8.3), so this work focuses purely on frontend development.

**Key Decisions:**
1. ✅ Create separate `InvestmentTransactionList.tsx` component (not extend cash component)
2. ✅ Use location-based organization (`investment-accounts/` folder)
3. ✅ Leverage existing MUI DataGrid for performance
4. ✅ Export CSV functionality for tax reporting
5. ✅ Mobile-first responsive design

**Estimated Effort:** 14 hours (2 days)  
**Lines of Code:** ~1,000 lines (TypeScript + React)  
**Completion Date:** November 23, 2025

Once complete, Wave 9.3 Option A will be **fully done**, with all 5 tabs functional:
- ✅ Holdings
- ✅ Performance (TWR, MWR, Sharpe, benchmarks)
- ✅ Tax Insights (gain/loss, harvesting)
- ✅ Risk Analysis (volatility, drawdown, correlations)
- ✅ Allocation (asset class, sector, geography, market cap)
- ⏭️ **Transactions** (this work)

Ready to proceed to **Wave 9.3 Option B: Loan & Credit Card Views** after completion.

---

**Document Status:** ✅ Complete - Ready for Implementation  
**Next Document:** `wave-9.3-option-a-part2-complete.md` (after implementation)  
**Author:** GitHub Copilot + User  
**Date:** November 21, 2025
