# Wave 9.3 Option A Part 3: Skeleton Account State System

**Date:** November 23, 2025  
**Status:** 📋 **PLANNING** - Architecture design phase  
**Priority:** HIGH - Required before Wave 9.3 Option B  
**Estimated Effort:** 800-1,000 lines of code, 2-3 days

---

## Executive Summary

Wave 9.3 Option A Part 3 implements a two-phase account state system that allows users to onboard investment accounts with just a balance number, then progressively add holdings detail. This solves the fundamental ledger integrity problem: **Balance = Sum(Holdings) = Sum(Transactions)** must always be true, but onboarding starts with only a balance.

**The Problem:**
- Current onboarding asks for account balance only
- No holdings → Analytics fail (no data to analyze)
- No transactions → Holdings have no cost basis
- Arbitrary totals → Ledger integrity broken

**The Solution:**
- **SKELETON State:** Account exists with balance only, represented as $CASH holding
- **DETAILED State:** Account has breakdown of holdings with transaction history
- **Setup Wizard:** Optional flow to convert SKELETON → DETAILED
- **User Choice:** Can leave accounts in SKELETON state indefinitely

---

## 1. Architecture Design

### 1.1 Account State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                        SKELETON                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Account Balance: $50,000                               │ │
│  │ Holdings: [$CASH: $50,000]                             │ │
│  │ Transactions: [INITIAL_BALANCE: $CASH, $50,000]        │ │
│  │                                                          │ │
│  │ Analytics: ❌ Disabled (insufficient data)              │ │
│  │ Net Worth: ✅ Contributes $50,000                       │ │
│  │ AI Summary: "Taxable Brokerage: Fidelity: $50,000"     │ │
│  │ Balance Editable: ✅ Yes (updates $CASH holding)        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User clicks "Add Holdings"
                            │ or edits account
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        DETAILED                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Account Balance: $50,000 (calculated from holdings)    │ │
│  │ Holdings:                                               │ │
│  │   - VOO: 100 shares @ $400 = $40,000                   │ │
│  │   - NVDA: 20 shares @ $500 = $10,000                   │ │
│  │   - $CASH: $0 (fully allocated)                        │ │
│  │ Transactions:                                           │ │
│  │   - INITIAL_BALANCE: VOO, 100 @ $400                   │ │
│  │   - INITIAL_BALANCE: NVDA, 20 @ $500                   │ │
│  │                                                          │ │
│  │ Analytics: ✅ All tabs functional                       │ │
│  │ Net Worth: ✅ Contributes $50,000                       │ │
│  │ AI Summary: "VOO: $40k, NVDA: $10k"                    │ │
│  │ Balance Editable: ❌ No (derived from holdings)         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 State Transition Rules

| From State | To State | Trigger | Validation |
|-----------|----------|---------|------------|
| (new) | SKELETON | Onboarding: Enter balance | Balance > 0 |
| SKELETON | SKELETON | Edit balance | New balance > 0, updates $CASH |
| SKELETON | DETAILED | Add holdings via wizard | Sum(Holdings) == Account.Balance |
| DETAILED | DETAILED | Add transaction | Automatic (holdings sync) |
| DETAILED | SKELETON | ❌ NOT ALLOWED | Cannot revert |

**Key Design Decision:** Once DETAILED, cannot revert to SKELETON. This prevents data loss and maintains ledger integrity.

---

## 2. Database Schema Changes

### 2.1 Accounts Table

```sql
ALTER TABLE "Accounts" 
ADD COLUMN "State" VARCHAR(20) NOT NULL DEFAULT 'DETAILED';
-- Values: 'SKELETON', 'DETAILED'

-- Add index for state-based queries
CREATE INDEX idx_accounts_state ON "Accounts"("State");
```

**Migration Strategy:**
```sql
-- Mark existing accounts with holdings as DETAILED
UPDATE "Accounts" 
SET "State" = 'DETAILED' 
WHERE "AccountId" IN (
  SELECT DISTINCT "AccountId" 
  FROM "Holdings" 
  WHERE "Symbol" != '$CASH'
);

-- Mark accounts without holdings as SKELETON
UPDATE "Accounts" 
SET "State" = 'SKELETON' 
WHERE "AccountId" NOT IN (
  SELECT DISTINCT "AccountId" 
  FROM "Holdings" 
  WHERE "Symbol" != '$CASH'
);
```

### 2.2 Holdings Table (No Changes)

The $CASH holding uses existing structure:
- Symbol: `$CASH`
- AssetType: `Cash` (enum value 8)
- Quantity: Dollar amount (e.g., 50000)
- AverageCostBasis: 1.00 (always)
- CurrentPrice: 1.00 (always)

### 2.3 Transactions Table (No Changes)

INITIAL_BALANCE transaction for $CASH:
- TransactionType: `INITIAL_BALANCE`
- Symbol: `$CASH`
- Quantity: Dollar amount
- Price: 1.00
- Amount: Dollar amount

---

## 3. Backend Implementation

### 3.1 Account Model Update

**File:** `PFMP-API/Models/Account.cs`

```csharp
public class Account
{
    // ... existing properties ...
    
    public AccountState State { get; set; } = AccountState.DETAILED;
    
    // New methods
    public bool IsSkeleton() => State == AccountState.SKELETON;
    public bool IsDetailed() => State == AccountState.DETAILED;
}

public enum AccountState
{
    SKELETON = 0,  // Balance only, $CASH holding
    DETAILED = 1   // Full holdings breakdown
}
```

### 3.2 AccountsController Updates

**File:** `PFMP-API/Controllers/AccountsController.cs`

#### 3.2.1 Create Account (Modified)

```csharp
[HttpPost]
public async Task<ActionResult<AccountResponse>> CreateAccount([FromBody] CreateAccountRequest request)
{
    // Create account
    var account = new Account
    {
        UserId = userId,
        AccountType = request.AccountType,
        AccountName = request.AccountName,
        Balance = request.Balance,
        State = AccountState.SKELETON,  // NEW: Default to SKELETON
        // ... other fields ...
    };
    
    _context.Accounts.Add(account);
    await _context.SaveChangesAsync();
    
    // Create $CASH holding
    var cashHolding = new Holding
    {
        AccountId = account.AccountId,
        Symbol = "$CASH",
        Name = "Cash",
        AssetType = AssetType.Cash,
        Quantity = request.Balance,
        AverageCostBasis = 1.00m,
        CurrentPrice = 1.00m,
        CurrentValue = request.Balance
    };
    
    _context.Holdings.Add(cashHolding);
    await _context.SaveChangesAsync();
    
    // Create INITIAL_BALANCE transaction
    var transaction = new Transaction
    {
        AccountId = account.AccountId,
        HoldingId = cashHolding.HoldingId,
        TransactionType = "INITIAL_BALANCE",
        Symbol = "$CASH",
        Quantity = request.Balance,
        Price = 1.00m,
        Amount = request.Balance,
        TransactionDate = DateTime.UtcNow,
        SettlementDate = DateTime.UtcNow
    };
    
    _context.Transactions.Add(transaction);
    await _context.SaveChangesAsync();
    
    return CreatedAtAction(nameof(GetAccount), new { id = account.AccountId }, account);
}
```

#### 3.2.2 Update Balance (NEW Endpoint)

```csharp
[HttpPatch("{id}/balance")]
public async Task<ActionResult<AccountResponse>> UpdateBalance(
    int id, 
    [FromBody] UpdateBalanceRequest request)
{
    var account = await _context.Accounts
        .Include(a => a.Holdings)
        .FirstOrDefaultAsync(a => a.AccountId == id);
    
    if (account == null) return NotFound();
    
    // Only allowed for SKELETON accounts
    if (account.State != AccountState.SKELETON)
    {
        return BadRequest(new { 
            message = "Cannot update balance for DETAILED accounts. Balance is derived from holdings." 
        });
    }
    
    // Find $CASH holding
    var cashHolding = account.Holdings.FirstOrDefault(h => h.Symbol == "$CASH");
    if (cashHolding == null)
    {
        return BadRequest(new { message = "SKELETON account missing $CASH holding" });
    }
    
    // Update account balance
    account.Balance = request.NewBalance;
    
    // Update $CASH holding
    cashHolding.Quantity = request.NewBalance;
    cashHolding.CurrentValue = request.NewBalance;
    
    await _context.SaveChangesAsync();
    
    return Ok(MapToAccountResponse(account));
}
```

#### 3.2.3 Transition to DETAILED (NEW Endpoint)

```csharp
[HttpPost("{id}/transition-to-detailed")]
public async Task<ActionResult<AccountResponse>> TransitionToDetailed(
    int id,
    [FromBody] TransitionToDetailedRequest request)
{
    var account = await _context.Accounts
        .Include(a => a.Holdings)
        .FirstOrDefaultAsync(a => a.AccountId == id);
    
    if (account == null) return NotFound();
    
    if (account.State != AccountState.SKELETON)
    {
        return BadRequest(new { message = "Account is already DETAILED" });
    }
    
    // Validate holdings sum to account balance
    var holdingsTotal = request.Holdings.Sum(h => h.Quantity * h.Price);
    if (Math.Abs(holdingsTotal - account.Balance) > 0.01m)
    {
        return BadRequest(new { 
            message = $"Holdings total (${holdingsTotal}) must equal account balance (${account.Balance})" 
        });
    }
    
    // Create holdings and INITIAL_BALANCE transactions
    foreach (var holdingRequest in request.Holdings)
    {
        // Create holding
        var holding = new Holding
        {
            AccountId = account.AccountId,
            Symbol = holdingRequest.Symbol,
            Name = holdingRequest.Name,
            AssetType = holdingRequest.AssetType,
            Quantity = holdingRequest.Quantity,
            AverageCostBasis = holdingRequest.Price,
            CurrentPrice = holdingRequest.Price,
            CurrentValue = holdingRequest.Quantity * holdingRequest.Price,
            PurchaseDate = request.AcquisitionDate
        };
        
        _context.Holdings.Add(holding);
        await _context.SaveChangesAsync();  // Get HoldingId
        
        // Create INITIAL_BALANCE transaction
        var transaction = new Transaction
        {
            AccountId = account.AccountId,
            HoldingId = holding.HoldingId,
            TransactionType = "INITIAL_BALANCE",
            Symbol = holding.Symbol,
            Quantity = holding.Quantity,
            Price = holding.AverageCostBasis,
            Amount = holding.CurrentValue,
            TransactionDate = request.AcquisitionDate,
            SettlementDate = request.AcquisitionDate
        };
        
        _context.Transactions.Add(transaction);
    }
    
    // Remove $CASH holding
    var cashHolding = account.Holdings.FirstOrDefault(h => h.Symbol == "$CASH");
    if (cashHolding != null)
    {
        _context.Holdings.Remove(cashHolding);
    }
    
    // Update account state
    account.State = AccountState.DETAILED;
    
    await _context.SaveChangesAsync();
    
    return Ok(MapToAccountResponse(account));
}
```

### 3.3 Request/Response DTOs

**File:** `PFMP-API/Models/AccountDtos.cs` (NEW)

```csharp
public class UpdateBalanceRequest
{
    public decimal NewBalance { get; set; }
}

public class TransitionToDetailedRequest
{
    public List<InitialHoldingRequest> Holdings { get; set; }
    public DateTime AcquisitionDate { get; set; }
}

public class InitialHoldingRequest
{
    public string Symbol { get; set; }
    public string? Name { get; set; }
    public AssetType AssetType { get; set; }
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
}

public class AccountResponse
{
    // ... existing fields ...
    public string State { get; set; }  // NEW
    public bool IsSkeleton { get; set; }  // NEW
    public bool IsDetailed { get; set; }  // NEW
}
```

---

## 4. Frontend Implementation

### 4.1 Account Detail View Updates

**File:** `pfmp-frontend/src/views/dashboard/AccountDetailView.tsx`

#### 4.1.1 Skeleton State Detection

```typescript
const AccountDetailView: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  
  useEffect(() => {
    fetchAccount();
  }, [accountId]);
  
  const fetchAccount = async () => {
    const response = await getAccount(parseInt(accountId));
    setAccount(response);
  };
  
  if (!account) return <CircularProgress />;
  
  // Check if skeleton
  if (account.state === 'SKELETON' || account.isSkeleton) {
    return <SkeletonAccountView account={account} onTransition={fetchAccount} />;
  }
  
  // Normal detailed view
  return <DetailedAccountView account={account} />;
};
```

#### 4.1.2 Skeleton Account View Component

**File:** `pfmp-frontend/src/components/investment-accounts/SkeletonAccountView.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  TextField,
  IconButton
} from '@mui/material';
import { Edit, Check, Close } from '@mui/icons-material';
import { formatCurrency } from '../../utils/formatters';

interface SkeletonAccountViewProps {
  account: Account;
  onTransition: () => void;
}

export const SkeletonAccountView: React.FC<SkeletonAccountViewProps> = ({
  account,
  onTransition
}) => {
  const [editing, setEditing] = useState(false);
  const [newBalance, setNewBalance] = useState(account.balance.toString());
  const [loading, setLoading] = useState(false);
  
  const handleSaveBalance = async () => {
    setLoading(true);
    try {
      await updateAccountBalance(account.accountId, parseFloat(newBalance));
      setEditing(false);
      onTransition();  // Refresh
    } catch (error) {
      console.error('Failed to update balance:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartSetup = () => {
    // Navigate to setup wizard
    window.location.href = `/accounts/${account.accountId}/setup`;
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Account Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">{account.accountName}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {editing ? (
                <>
                  <TextField
                    size="small"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    type="number"
                    sx={{ width: 150 }}
                    disabled={loading}
                  />
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={handleSaveBalance}
                    disabled={loading}
                  >
                    <Check />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setEditing(false);
                      setNewBalance(account.balance.toString());
                    }}
                    disabled={loading}
                  >
                    <Close />
                  </IconButton>
                </>
              ) : (
                <>
                  <Typography variant="h4">
                    {formatCurrency(account.balance)}
                  </Typography>
                  <IconButton 
                    size="small"
                    onClick={() => setEditing(true)}
                  >
                    <Edit />
                  </IconButton>
                </>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
      
      {/* Setup Prompt */}
      <Alert 
        severity="info"
        sx={{ mb: 3 }}
        action={
          <Button 
            color="inherit" 
            size="small"
            onClick={handleStartSetup}
          >
            Get Started
          </Button>
        }
      >
        <Typography variant="body1" gutterBottom>
          <strong>Add your holdings to unlock analytics</strong>
        </Typography>
        <Typography variant="body2">
          This account is in simple mode. Add your holdings to access:
          • Performance metrics • Tax insights • Risk analysis • Allocation breakdown
        </Typography>
      </Alert>
      
      {/* Simple Summary Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account Summary
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Account Type:</Typography>
              <Typography>{account.accountType}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Current Balance:</Typography>
              <Typography fontWeight="bold">
                {formatCurrency(account.balance)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Holdings:</Typography>
              <Typography>Cash (unallocated)</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Analytics:</Typography>
              <Typography color="text.secondary" fontStyle="italic">
                Add holdings to enable
              </Typography>
            </Box>
          </Stack>
          
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            onClick={handleStartSetup}
          >
            Add My Holdings
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
```

### 4.2 Setup Wizard Component

**File:** `pfmp-frontend/src/components/investment-accounts/AccountSetupWizard.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Alert,
  Box,
  Typography,
  IconButton,
  Stack
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';

interface HoldingEntry {
  symbol: string;
  name: string;
  assetType: string;
  quantity: number;
  price: number;
}

interface AccountSetupWizardProps {
  account: Account;
  onComplete: () => void;
  onCancel: () => void;
}

export const AccountSetupWizard: React.FC<AccountSetupWizardProps> = ({
  account,
  onComplete,
  onCancel
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [holdings, setHoldings] = useState<HoldingEntry[]>([
    { symbol: '', name: '', assetType: 'Stock', quantity: 0, price: 0 }
  ]);
  const [acquisitionDate, setAcquisitionDate] = useState<Date | null>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  const steps = ['Add Holdings', 'Review', 'Confirm'];
  
  const handleAddHolding = () => {
    setHoldings([
      ...holdings,
      { symbol: '', name: '', assetType: 'Stock', quantity: 0, price: 0 }
    ]);
  };
  
  const handleRemoveHolding = (index: number) => {
    setHoldings(holdings.filter((_, i) => i !== index));
  };
  
  const handleHoldingChange = (index: number, field: keyof HoldingEntry, value: any) => {
    const updated = [...holdings];
    updated[index] = { ...updated[index], [field]: value };
    setHoldings(updated);
  };
  
  const calculateTotal = () => {
    return holdings.reduce((sum, h) => sum + (h.quantity * h.price), 0);
  };
  
  const getRemainingCash = () => {
    return account.balance - calculateTotal();
  };
  
  const validateHoldings = () => {
    const total = calculateTotal();
    const remaining = getRemainingCash();
    
    if (Math.abs(remaining) > 0.01) {
      setError(`Holdings total $${total.toFixed(2)} but account balance is $${account.balance.toFixed(2)}. Please adjust quantities or prices.`);
      return false;
    }
    
    const hasEmpty = holdings.some(h => !h.symbol || h.quantity <= 0 || h.price <= 0);
    if (hasEmpty) {
      setError('All holdings must have a symbol, quantity > 0, and price > 0');
      return false;
    }
    
    setError(null);
    return true;
  };
  
  const handleNext = () => {
    if (activeStep === 0 && !validateHoldings()) {
      return;
    }
    setActiveStep((prev) => prev + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };
  
  const handleSubmit = async () => {
    try {
      await transitionToDetailed(account.accountId, {
        holdings: holdings.map(h => ({
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType,
          quantity: h.quantity,
          price: h.price
        })),
        acquisitionDate: acquisitionDate || new Date()
      });
      
      onComplete();
    } catch (err) {
      setError('Failed to save holdings. Please try again.');
      console.error(err);
    }
  };
  
  return (
    <Dialog open maxWidth="md" fullWidth>
      <DialogTitle>
        Setup {account.accountName}
        <Typography variant="body2" color="text.secondary">
          Add your holdings to unlock analytics
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Step 1: Add Holdings */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="body2" gutterBottom>
              Enter your current holdings. The total must equal your account balance of {formatCurrency(account.balance)}.
            </Typography>
            
            {holdings.map((holding, index) => (
              <Stack key={index} direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  label="Symbol"
                  value={holding.symbol}
                  onChange={(e) => handleHoldingChange(index, 'symbol', e.target.value)}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Quantity"
                  type="number"
                  value={holding.quantity}
                  onChange={(e) => handleHoldingChange(index, 'quantity', parseFloat(e.target.value))}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Price"
                  type="number"
                  value={holding.price}
                  onChange={(e) => handleHoldingChange(index, 'price', parseFloat(e.target.value))}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Value"
                  value={formatCurrency(holding.quantity * holding.price)}
                  disabled
                  sx={{ width: 120 }}
                />
                <IconButton 
                  color="error"
                  onClick={() => handleRemoveHolding(index)}
                  disabled={holdings.length === 1}
                >
                  <Delete />
                </IconButton>
              </Stack>
            ))}
            
            <Button
              startIcon={<Add />}
              onClick={handleAddHolding}
              sx={{ mb: 2 }}
            >
              Add Holding
            </Button>
            
            <Alert 
              severity={Math.abs(getRemainingCash()) < 0.01 ? 'success' : 'warning'}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography>Holdings Total:</Typography>
                <Typography fontWeight="bold">
                  {formatCurrency(calculateTotal())}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography>Account Balance:</Typography>
                <Typography fontWeight="bold">
                  {formatCurrency(account.balance)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography>Remaining:</Typography>
                <Typography 
                  fontWeight="bold"
                  color={Math.abs(getRemainingCash()) < 0.01 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(getRemainingCash())}
                </Typography>
              </Stack>
            </Alert>
          </Box>
        )}
        
        {/* Step 2: Review */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Holdings
            </Typography>
            {holdings.map((h, i) => (
              <Box key={i} sx={{ mb: 1 }}>
                <Typography>
                  {h.symbol}: {h.quantity} shares @ {formatCurrency(h.price)} = {formatCurrency(h.quantity * h.price)}
                </Typography>
              </Box>
            ))}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6">
                Total: {formatCurrency(calculateTotal())}
              </Typography>
            </Box>
            
            <DatePicker
              label="Acquisition Date"
              value={acquisitionDate}
              onChange={setAcquisitionDate}
              sx={{ mt: 2, width: '100%' }}
            />
          </Box>
        )}
        
        {/* Step 3: Confirm */}
        {activeStep === 2 && (
          <Alert severity="info">
            <Typography variant="body1" gutterBottom>
              <strong>Ready to complete setup?</strong>
            </Typography>
            <Typography variant="body2">
              This will:
              • Create {holdings.length} holdings
              • Generate INITIAL_BALANCE transactions
              • Enable all analytics tabs
              • Lock the account balance (derived from holdings)
            </Typography>
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit}>
            Complete Setup
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
```

### 4.3 API Service Updates

**File:** `pfmp-frontend/src/services/accountsApi.ts`

```typescript
export async function updateAccountBalance(
  accountId: number,
  newBalance: number
): Promise<Account> {
  const response = await api.patch(`/accounts/${accountId}/balance`, {
    newBalance
  });
  return response.data;
}

export async function transitionToDetailed(
  accountId: number,
  request: {
    holdings: Array<{
      symbol: string;
      name?: string;
      assetType: string;
      quantity: number;
      price: number;
    }>;
    acquisitionDate: Date;
  }
): Promise<Account> {
  const response = await api.post(`/accounts/${accountId}/transition-to-detailed`, request);
  return response.data;
}
```

### 4.4 Routing Updates

**File:** `pfmp-frontend/src/App.tsx`

```typescript
<Route 
  path="/accounts/:accountId/setup" 
  element={<AccountSetupWizardPage />} 
/>
```

---

## 5. User Experience Flows

### 5.1 Onboarding Flow (SKELETON Creation)

```
1. User navigates to Onboarding → Investment Accounts
2. Fills form:
   - Account Name: "Fidelity Taxable Brokerage"
   - Account Type: "Taxable Brokerage"
   - Current Balance: $50,000
   - [No holdings fields shown]
3. Clicks "Add Account"
4. Backend:
   - Creates Account (State=SKELETON, Balance=50000)
   - Creates $CASH holding (50000 @ $1.00)
   - Creates INITIAL_BALANCE transaction
5. User sees account in dashboard with $50,000 balance
6. Net worth increases by $50,000
7. AI summary: "Taxable Brokerage: Fidelity: $50,000"
```

### 5.2 Viewing SKELETON Account

```
1. User clicks account from dashboard
2. AccountDetailView detects State=SKELETON
3. Shows SkeletonAccountView:
   - Balance at top (editable with pencil icon)
   - Info alert: "Add holdings to unlock analytics"
   - Simple summary card:
     * Account Type
     * Current Balance
     * Holdings: "Cash (unallocated)"
     * Analytics: "Add holdings to enable"
   - Big "Add My Holdings" button
4. No tabs shown (no data to display)
```

### 5.3 Editing SKELETON Balance

```
1. User clicks pencil icon next to balance
2. TextField appears with current balance
3. User types new amount: $52,000
4. Clicks checkmark icon
5. Backend:
   - Validates account is SKELETON
   - Updates Account.Balance = 52000
   - Updates $CASH holding quantity = 52000
6. Balance updates immediately
7. Net worth recalculates
```

### 5.4 Setup Wizard Flow (SKELETON → DETAILED)

```
Step 1: Add Holdings
1. User clicks "Add My Holdings" button
2. Setup wizard opens (modal or full-page)
3. Shows form with one row:
   - Symbol: [text input]
   - Quantity: [number input]
   - Price: [number input]
   - Value: [calculated, disabled]
   - [Delete button]
4. User fills first row:
   - Symbol: VOO
   - Quantity: 100
   - Price: 400
   - Value: $40,000
5. User clicks "Add Holding" button
6. Second row appears
7. User fills:
   - Symbol: NVDA
   - Quantity: 20
   - Price: 500
   - Value: $10,000
8. Alert shows:
   - Holdings Total: $50,000
   - Account Balance: $50,000
   - Remaining: $0.00 ✅
9. User clicks "Next"

Step 2: Review
1. Shows summary:
   - VOO: 100 shares @ $400.00 = $40,000.00
   - NVDA: 20 shares @ $500.00 = $10,000.00
   - Total: $50,000.00
2. Acquisition Date picker (defaults to today)
3. User clicks "Next"

Step 3: Confirm
1. Shows confirmation message:
   "This will create 2 holdings, generate INITIAL_BALANCE transactions, 
    enable analytics, and lock the account balance."
2. User clicks "Complete Setup"
3. Backend:
   - Creates VOO holding (100 @ $400)
   - Creates NVDA holding (20 @ $500)
   - Creates INITIAL_BALANCE transaction for VOO
   - Creates INITIAL_BALANCE transaction for NVDA
   - Deletes $CASH holding
   - Updates Account.State = DETAILED
4. Modal closes
5. AccountDetailView refreshes
6. Shows DetailedAccountView with all tabs:
   - Holdings tab (2 holdings)
   - Performance tab (now functional)
   - Tax Insights tab (now functional)
   - Risk Analysis tab (now functional)
   - Allocation tab (now functional)
   - Transactions tab (2 INITIAL_BALANCE transactions)
```

### 5.5 Attempting to Edit DETAILED Balance

```
1. User tries to edit balance of DETAILED account
2. Pencil icon is hidden (balance not editable)
3. Hover tooltip: "Balance is derived from holdings"
4. If user somehow calls API:
   - Backend returns 400 Bad Request
   - Error: "Cannot update balance for DETAILED accounts"
```

---

## 6. AI Summary Integration

### 6.1 Net Worth Calculation (No Changes)

Both SKELETON and DETAILED accounts contribute their balance to net worth:
- SKELETON: Uses `Account.Balance` ($50,000)
- DETAILED: Uses `Sum(Holdings.CurrentValue)` ($50,000)

### 6.2 AI Summary Payload

**SKELETON Account:**
```json
{
  "accountName": "Fidelity Taxable Brokerage",
  "accountType": "Taxable Brokerage",
  "balance": 50000,
  "state": "SKELETON",
  "holdings": "unallocated cash"
}
```

AI receives: `"Taxable Brokerage: Fidelity: $50,000.00 (unallocated)"`

**DETAILED Account:**
```json
{
  "accountName": "Fidelity Taxable Brokerage",
  "accountType": "Taxable Brokerage",
  "balance": 50000,
  "state": "DETAILED",
  "holdings": [
    { "symbol": "VOO", "value": 40000 },
    { "symbol": "NVDA", "value": 10000 }
  ]
}
```

AI receives: `"Taxable Brokerage: Fidelity: $50,000 (VOO: $40k, NVDA: $10k)"`

---

## 7. Implementation Phases

### Phase 1: Database & Backend (Day 1)
- [ ] Add `State` column to Accounts table
- [ ] Update Account model with AccountState enum
- [ ] Implement UpdateBalance endpoint
- [ ] Implement TransitionToDetailed endpoint
- [ ] Update CreateAccount to create $CASH holding
- [ ] Write migration script for existing accounts
- [ ] Unit tests for state transitions

### Phase 2: Frontend - Skeleton View (Day 2)
- [ ] Create SkeletonAccountView component
- [ ] Implement balance editing (inline with pencil icon)
- [ ] Add setup prompt with info alert
- [ ] Update AccountDetailView to detect state
- [ ] Add API service functions (updateBalance)
- [ ] Test SKELETON account display

### Phase 3: Frontend - Setup Wizard (Day 2-3)
- [ ] Create AccountSetupWizard component
- [ ] Implement 3-step stepper
- [ ] Add holdings entry form (add/remove rows)
- [ ] Implement validation (total must equal balance)
- [ ] Add review and confirmation steps
- [ ] Wire up transitionToDetailed API call
- [ ] Test wizard flow end-to-end

### Phase 4: Integration & Testing (Day 3)
- [ ] Update onboarding to create SKELETON accounts
- [ ] Test SKELETON account creation
- [ ] Test balance editing
- [ ] Test setup wizard (SKELETON → DETAILED)
- [ ] Test net worth calculation (both states)
- [ ] Test AI summary generation
- [ ] Verify analytics tabs disabled for SKELETON
- [ ] Verify analytics tabs enabled after transition

### Phase 5: Documentation & Cleanup
- [ ] Update user documentation
- [ ] Add tooltips and help text
- [ ] Code review and refactoring
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Create completion document

---

## 8. Testing Strategy

### 8.1 Backend Tests

```csharp
[Fact]
public async Task CreateAccount_Should_Create_SKELETON_With_Cash_Holding()
{
    // Arrange
    var request = new CreateAccountRequest
    {
        AccountName = "Test Account",
        AccountType = "Taxable Brokerage",
        Balance = 50000m
    };
    
    // Act
    var response = await _controller.CreateAccount(request);
    
    // Assert
    Assert.Equal(AccountState.SKELETON, response.Value.State);
    Assert.Single(response.Value.Holdings);
    Assert.Equal("$CASH", response.Value.Holdings[0].Symbol);
    Assert.Equal(50000m, response.Value.Holdings[0].Quantity);
}

[Fact]
public async Task UpdateBalance_Should_Work_For_SKELETON()
{
    // Arrange
    var account = await CreateSkeletonAccount(50000m);
    
    // Act
    var response = await _controller.UpdateBalance(
        account.AccountId, 
        new UpdateBalanceRequest { NewBalance = 52000m }
    );
    
    // Assert
    Assert.Equal(52000m, response.Value.Balance);
    var cashHolding = response.Value.Holdings.First(h => h.Symbol == "$CASH");
    Assert.Equal(52000m, cashHolding.Quantity);
}

[Fact]
public async Task UpdateBalance_Should_Fail_For_DETAILED()
{
    // Arrange
    var account = await CreateDetailedAccount();
    
    // Act
    var response = await _controller.UpdateBalance(
        account.AccountId,
        new UpdateBalanceRequest { NewBalance = 52000m }
    );
    
    // Assert
    Assert.IsType<BadRequestObjectResult>(response.Result);
}

[Fact]
public async Task TransitionToDetailed_Should_Create_Holdings_And_Transactions()
{
    // Arrange
    var account = await CreateSkeletonAccount(50000m);
    var request = new TransitionToDetailedRequest
    {
        Holdings = new List<InitialHoldingRequest>
        {
            new() { Symbol = "VOO", Quantity = 100m, Price = 400m, AssetType = AssetType.ETF },
            new() { Symbol = "NVDA", Quantity = 20m, Price = 500m, AssetType = AssetType.Stock }
        },
        AcquisitionDate = DateTime.UtcNow
    };
    
    // Act
    var response = await _controller.TransitionToDetailed(account.AccountId, request);
    
    // Assert
    Assert.Equal(AccountState.DETAILED, response.Value.State);
    Assert.Equal(2, response.Value.Holdings.Count);
    Assert.DoesNotContain(response.Value.Holdings, h => h.Symbol == "$CASH");
    
    var transactions = await _context.Transactions
        .Where(t => t.AccountId == account.AccountId)
        .ToListAsync();
    Assert.Equal(2, transactions.Count);
    Assert.All(transactions, t => Assert.Equal("INITIAL_BALANCE", t.TransactionType));
}

[Fact]
public async Task TransitionToDetailed_Should_Fail_If_Holdings_Dont_Sum_To_Balance()
{
    // Arrange
    var account = await CreateSkeletonAccount(50000m);
    var request = new TransitionToDetailedRequest
    {
        Holdings = new List<InitialHoldingRequest>
        {
            new() { Symbol = "VOO", Quantity = 100m, Price = 400m, AssetType = AssetType.ETF }
            // Total = $40,000, but balance is $50,000
        },
        AcquisitionDate = DateTime.UtcNow
    };
    
    // Act
    var response = await _controller.TransitionToDetailed(account.AccountId, request);
    
    // Assert
    Assert.IsType<BadRequestObjectResult>(response.Result);
}
```

### 8.2 Frontend Tests

```typescript
describe('SkeletonAccountView', () => {
  it('should display account balance with edit button', () => {
    render(<SkeletonAccountView account={mockSkeletonAccount} />);
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit balance')).toBeInTheDocument();
  });
  
  it('should allow editing balance', async () => {
    render(<SkeletonAccountView account={mockSkeletonAccount} />);
    
    const editButton = screen.getByLabelText('Edit balance');
    fireEvent.click(editButton);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '52000' } });
    
    const saveButton = screen.getByLabelText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(updateAccountBalance).toHaveBeenCalledWith(48, 52000);
    });
  });
  
  it('should show setup prompt', () => {
    render(<SkeletonAccountView account={mockSkeletonAccount} />);
    expect(screen.getByText(/Add your holdings to unlock analytics/i)).toBeInTheDocument();
  });
});

describe('AccountSetupWizard', () => {
  it('should validate holdings sum to balance', () => {
    render(<AccountSetupWizard account={mockSkeletonAccount} />);
    
    // Add holding that doesn't sum to balance
    fillHolding(0, 'VOO', 100, 400);  // $40,000
    // Balance is $50,000, remaining $10,000
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText(/Holdings total.*must equal account balance/i)).toBeInTheDocument();
  });
  
  it('should complete wizard successfully', async () => {
    render(<AccountSetupWizard account={mockSkeletonAccount} />);
    
    // Step 1: Add holdings
    fillHolding(0, 'VOO', 100, 400);
    fireEvent.click(screen.getByText('Add Holding'));
    fillHolding(1, 'NVDA', 20, 500);
    fireEvent.click(screen.getByText('Next'));
    
    // Step 2: Review
    expect(screen.getByText('VOO: 100 shares @ $400.00')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    
    // Step 3: Confirm
    fireEvent.click(screen.getByText('Complete Setup'));
    
    await waitFor(() => {
      expect(transitionToDetailed).toHaveBeenCalled();
    });
  });
});
```

---

## 9. Edge Cases & Error Handling

### 9.1 SKELETON State
- **Empty balance**: Not allowed (validation: balance > 0)
- **Negative balance**: Not allowed (validation: balance > 0)
- **Multiple $CASH holdings**: Prevented (unique constraint on Symbol per Account)
- **Deleting $CASH holding**: Blocked (cannot delete last holding in SKELETON)

### 9.2 Setup Wizard
- **Holdings don't sum to balance**: Show error, prevent Next button
- **Empty symbol**: Show validation error
- **Zero quantity/price**: Show validation error
- **Duplicate symbols**: Allowed (user might have multiple lots)
- **User cancels mid-wizard**: No changes saved (modal closes)
- **Network error during transition**: Show error, allow retry

### 9.3 State Transitions
- **SKELETON → SKELETON**: Allowed (balance editing)
- **SKELETON → DETAILED**: Allowed via wizard only
- **DETAILED → SKELETON**: NOT ALLOWED (data loss prevention)
- **DETAILED → DETAILED**: Normal operations (transactions)

### 9.4 Concurrent Edits
- **Two users edit same SKELETON balance**: Last write wins (optimistic locking)
- **User edits balance while wizard open**: Wizard shows stale balance, validation fails
- **User adds transaction while wizard open**: Wizard fails (account already DETAILED)

---

## 10. Migration Strategy

### 10.1 Existing Accounts

```sql
-- Phase 1: Add State column
ALTER TABLE "Accounts" 
ADD COLUMN "State" VARCHAR(20) NOT NULL DEFAULT 'DETAILED';

-- Phase 2: Mark accounts with holdings as DETAILED
UPDATE "Accounts" 
SET "State" = 'DETAILED' 
WHERE "AccountId" IN (
  SELECT DISTINCT "AccountId" 
  FROM "Holdings" 
  WHERE "Symbol" != '$CASH'
);

-- Phase 3: Mark accounts without holdings as SKELETON
UPDATE "Accounts" 
SET "State" = 'SKELETON' 
WHERE "AccountId" NOT IN (
  SELECT DISTINCT "AccountId" 
  FROM "Holdings" 
  WHERE "Symbol" != '$CASH'
);

-- Phase 4: Create $CASH holdings for SKELETON accounts without one
INSERT INTO "Holdings" ("AccountId", "Symbol", "Name", "AssetType", "Quantity", "AverageCostBasis", "CurrentPrice", "CurrentValue", "CreatedAt")
SELECT 
  a."AccountId",
  '$CASH',
  'Cash',
  8,  -- AssetType.Cash
  a."Balance",
  1.00,
  1.00,
  a."Balance",
  CURRENT_TIMESTAMP
FROM "Accounts" a
WHERE a."State" = 'SKELETON'
  AND NOT EXISTS (
    SELECT 1 FROM "Holdings" h 
    WHERE h."AccountId" = a."AccountId" AND h."Symbol" = '$CASH'
  );

-- Phase 5: Create INITIAL_BALANCE transactions for $CASH
INSERT INTO "Transactions" ("AccountId", "HoldingId", "TransactionType", "Symbol", "Quantity", "Price", "Amount", "TransactionDate", "SettlementDate", "CreatedAt")
SELECT 
  h."AccountId",
  h."HoldingId",
  'INITIAL_BALANCE',
  '$CASH',
  h."Quantity",
  1.00,
  h."Quantity",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Holdings" h
JOIN "Accounts" a ON h."AccountId" = a."AccountId"
WHERE a."State" = 'SKELETON'
  AND h."Symbol" = '$CASH'
  AND NOT EXISTS (
    SELECT 1 FROM "Transactions" t
    WHERE t."HoldingId" = h."HoldingId" 
      AND t."TransactionType" = 'INITIAL_BALANCE'
  );
```

### 10.2 Rollback Plan

```sql
-- Remove State column
ALTER TABLE "Accounts" DROP COLUMN "State";

-- Remove $CASH holdings
DELETE FROM "Holdings" WHERE "Symbol" = '$CASH';

-- Remove $CASH transactions
DELETE FROM "Transactions" WHERE "Symbol" = '$CASH';
```

---

## 11. Success Criteria

### 11.1 Functional Requirements
- [ ] SKELETON accounts created during onboarding
- [ ] SKELETON accounts contribute to net worth
- [ ] SKELETON balance is editable
- [ ] Setup wizard validates holdings sum to balance
- [ ] Setup wizard creates holdings and transactions
- [ ] Transition from SKELETON to DETAILED successful
- [ ] DETAILED accounts have non-editable balance
- [ ] Analytics tabs disabled for SKELETON
- [ ] Analytics tabs enabled for DETAILED
- [ ] AI summary includes SKELETON accounts

### 11.2 User Experience
- [ ] Onboarding remains simple (just enter balance)
- [ ] SKELETON view is clear and informative
- [ ] Setup wizard is intuitive (3 steps max)
- [ ] Balance editing is seamless (inline, no modal)
- [ ] Error messages are helpful
- [ ] Loading states prevent double-clicks
- [ ] Mobile responsive (all views)

### 11.3 Data Integrity
- [ ] $CASH holding always matches account balance
- [ ] Holdings sum always equals account balance
- [ ] Transactions explain all holdings
- [ ] No orphaned holdings
- [ ] No orphaned transactions
- [ ] State transitions are atomic (all-or-nothing)

### 11.4 Performance
- [ ] SKELETON view loads in <500ms
- [ ] Setup wizard opens in <300ms
- [ ] State transition completes in <2s
- [ ] No N+1 queries
- [ ] Database indexes optimized

---

## 12. Future Enhancements

### 12.1 Partial Allocation
Allow users to allocate SKELETON accounts gradually:
- User adds VOO holding worth $40,000
- $CASH holding updated to $10,000
- Account remains SKELETON until cash ≈ $0
- Analytics gradually enable as data becomes available

### 12.2 Exchange Integration
Connect to crypto exchanges for automatic holdings import:
- User selects "Connect Coinbase"
- OAuth flow authenticates
- System fetches holdings via API
- Transition to DETAILED automatically

### 12.3 Broker Integration
Connect to brokerage accounts via Plaid:
- User selects "Connect Fidelity"
- Plaid authentication flow
- System fetches holdings + transactions
- Transition to DETAILED with full history

### 12.4 Smart Suggestions
AI-powered holdings suggestions:
- User enters: "Fidelity 401k: $150,000"
- AI suggests: "Typical 401k allocation?"
- Pre-fills wizard with:
  * 60% S&P 500 fund
  * 30% International fund
  * 10% Bond fund
- User adjusts and confirms

---

## 13. Risks & Mitigation

### 13.1 Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users confused by two states | Medium | Medium | Clear UI messaging, tooltips |
| Setup wizard too complex | High | Low | 3-step max, visual progress |
| Data migration failures | High | Low | Extensive testing, rollback plan |
| Balance editing bugs | Medium | Low | Validation, optimistic UI updates |
| Analytics break for SKELETON | High | Medium | State checks in all analytics |

### 13.2 Mitigation Strategies

1. **User Education**
   - Onboarding tooltips explain SKELETON vs DETAILED
   - Help documentation with screenshots
   - In-app tour highlighting setup wizard

2. **Progressive Disclosure**
   - SKELETON view is simple (no overwhelming options)
   - Setup wizard reveals complexity gradually
   - Advanced features hidden until DETAILED

3. **Safety Nets**
   - Confirmation dialogs for state transitions
   - Validation prevents invalid states
   - Rollback mechanism in database
   - Extensive unit and integration tests

4. **Monitoring**
   - Log all state transitions
   - Track wizard completion rates
   - Monitor SKELETON vs DETAILED ratio
   - Alert on failed transitions

---

## 14. Acceptance Testing Checklist

### 14.1 Onboarding
- [ ] Create SKELETON account with $50,000 balance
- [ ] Verify $CASH holding created automatically
- [ ] Verify INITIAL_BALANCE transaction created
- [ ] Verify account appears in dashboard
- [ ] Verify net worth increased by $50,000

### 14.2 SKELETON View
- [ ] Navigate to SKELETON account
- [ ] Verify balance shown at top with edit button
- [ ] Verify setup prompt alert displayed
- [ ] Verify "Add Holdings" button visible
- [ ] Verify no analytics tabs shown
- [ ] Verify simple summary card

### 14.3 Balance Editing
- [ ] Click edit (pencil) icon
- [ ] Change balance to $52,000
- [ ] Click save (checkmark)
- [ ] Verify balance updated
- [ ] Verify $CASH holding quantity updated
- [ ] Verify net worth recalculated

### 14.4 Setup Wizard
- [ ] Click "Add My Holdings"
- [ ] Verify wizard opens (Step 1)
- [ ] Add VOO: 100 @ $400
- [ ] Add NVDA: 20 @ $500
- [ ] Verify total shows $50,000
- [ ] Verify remaining shows $0
- [ ] Click "Next"
- [ ] Verify review screen (Step 2)
- [ ] Set acquisition date
- [ ] Click "Next"
- [ ] Verify confirmation screen (Step 3)
- [ ] Click "Complete Setup"
- [ ] Verify success message
- [ ] Verify wizard closes

### 14.5 DETAILED View
- [ ] Verify account reloaded
- [ ] Verify Holdings tab shows 2 holdings
- [ ] Verify $CASH holding removed
- [ ] Verify Transactions tab shows 2 INITIAL_BALANCE
- [ ] Verify Performance tab functional
- [ ] Verify Tax Insights tab functional
- [ ] Verify Risk Analysis tab functional
- [ ] Verify Allocation tab functional
- [ ] Verify balance no longer editable

### 14.6 Validation
- [ ] Try to edit DETAILED balance (should fail)
- [ ] Try wizard with holdings that don't sum (should fail)
- [ ] Try wizard with empty symbol (should fail)
- [ ] Try wizard with zero quantity (should fail)
- [ ] Try negative balance (should fail)

---

## 15. Timeline

**Total Estimate:** 2-3 days (16-24 hours)

### Day 1 (Backend - 8 hours)
- **Morning (4h):**
  * Add State column migration
  * Update Account model
  * Implement UpdateBalance endpoint
  * Implement TransitionToDetailed endpoint
  
- **Afternoon (4h):**
  * Update CreateAccount endpoint
  * Write unit tests
  * Test migration script
  * Code review

### Day 2 (Frontend - SKELETON View - 8 hours)
- **Morning (4h):**
  * Create SkeletonAccountView component
  * Implement balance editing
  * Add API service functions
  
- **Afternoon (4h):**
  * Update AccountDetailView routing
  * Test SKELETON view
  * Bug fixes

### Day 3 (Frontend - Setup Wizard - 8 hours)
- **Morning (4h):**
  * Create AccountSetupWizard component
  * Implement Step 1 (Add Holdings)
  * Implement Step 2 (Review)
  
- **Afternoon (4h):**
  * Implement Step 3 (Confirm)
  * Wire up API calls
  * Integration testing
  * Bug fixes

### Day 4 (Buffer / Polish)
- **If Needed:**
  * Additional testing
  * UX refinements
  * Documentation
  * Code cleanup

---

## 16. Conclusion

Wave 9.3 Option A Part 3 implements a sophisticated yet user-friendly account state system that balances simplicity during onboarding with powerful analytics capabilities. The SKELETON state allows users to quickly add accounts without detailed breakdown, while the optional setup wizard provides a clear path to unlock advanced features.

**Key Benefits:**
1. ✅ Simple onboarding (just enter balance)
2. ✅ Ledger integrity maintained always
3. ✅ No forced data entry
4. ✅ Clear upgrade path (SKELETON → DETAILED)
5. ✅ Analytics disabled when insufficient data
6. ✅ Net worth calculation works for both states

**Technical Highlights:**
- State machine with one-way transition
- $CASH holding as ledger integrity anchor
- Setup wizard with validation
- Atomic state transitions
- Backward-compatible migration

**Ready for:** Implementation starting November 23, 2025

---

**Document Status:** ✅ Complete - Ready for Implementation  
**Next Document:** `wave-9.3-option-a-part3-complete.md` (after implementation)  
**Prerequisites:** Wave 9.3 Option A Part 2 (Complete)  
**Blocks:** Wave 9.3 Option B (Loan & Credit Card Views)  
**Author:** GitHub Copilot + User  
**Date:** November 23, 2025
