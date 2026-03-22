import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  InputAdornment,
  ListSubheader,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { listUserAccounts } from '../../services/accountsApi';
import { listCashAccounts } from '../../services/cashAccountsApi';

// Unified account item for the dropdowns
interface UnifiedAccount {
  id: string;           // string form of int (investment) or UUID (cash)
  accountType: 'investment' | 'cash';
  name: string;
  institution: string;
  balance: number;
}

interface TransferFundsDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  userId: number;
  currentAccountId: string;      // string: int ID or UUID
  currentAccountType: 'investment' | 'cash';
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export function TransferFundsDialog({ open, onClose, onComplete, userId, currentAccountId, currentAccountType }: TransferFundsDialogProps) {
  const [allAccounts, setAllAccounts] = useState<UnifiedAccount[]>([]);
  const [fromKey, setFromKey] = useState<string>('');
  const [toKey, setToKey] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a unique key for each account: "investment:123" or "cash:uuid"
  const makeKey = (type: string, id: string) => `${type}:${id}`;

  useEffect(() => {
    if (open && userId) {
      Promise.all([
        listUserAccounts(userId).catch(() => []),
        listCashAccounts(userId).catch(() => []),
      ]).then(([investmentAccounts, cashAccounts]) => {
        const unified: UnifiedAccount[] = [
          ...investmentAccounts.map(a => ({
            id: String(a.accountId),
            accountType: 'investment' as const,
            name: a.accountName,
            institution: a.institution,
            balance: a.currentBalance,
          })),
          ...cashAccounts.map(a => ({
            id: a.cashAccountId,
            accountType: 'cash' as const,
            name: a.nickname || a.institution,
            institution: a.institution,
            balance: a.balance,
          })),
        ];
        setAllAccounts(unified);
      });

      setFromKey(makeKey(currentAccountType, currentAccountId));
      setToKey('');
      setAmount('');
      setDate(new Date());
      setDescription('');
      setError(null);
    }
  }, [open, userId, currentAccountId, currentAccountType]);

  const fromAccount = allAccounts.find(a => makeKey(a.accountType, a.id) === fromKey);
  const toAccount = allAccounts.find(a => makeKey(a.accountType, a.id) === toKey);

  const investmentAccounts = allAccounts.filter(a => a.accountType === 'investment');
  const cashAccounts = allAccounts.filter(a => a.accountType === 'cash');

  const renderAccountMenuItems = (excludeKey?: string) => {
    const items: React.ReactNode[] = [];

    const filteredInvestment = investmentAccounts.filter(a => makeKey(a.accountType, a.id) !== excludeKey);
    const filteredCash = cashAccounts.filter(a => makeKey(a.accountType, a.id) !== excludeKey);

    if (filteredInvestment.length > 0) {
      items.push(<ListSubheader key="inv-header">Investment Accounts</ListSubheader>);
      filteredInvestment.forEach(a => {
        items.push(
          <MenuItem key={makeKey(a.accountType, a.id)} value={makeKey(a.accountType, a.id)}>
            {a.name} ({a.institution}) — {formatCurrency(a.balance)}
          </MenuItem>
        );
      });
    }

    if (filteredCash.length > 0) {
      items.push(<ListSubheader key="cash-header">Cash Accounts</ListSubheader>);
      filteredCash.forEach(a => {
        items.push(
          <MenuItem key={makeKey(a.accountType, a.id)} value={makeKey(a.accountType, a.id)}>
            {a.name} ({a.institution}) — {formatCurrency(a.balance)}
          </MenuItem>
        );
      });
    }

    return items;
  };

  const handleSubmit = async () => {
    if (!toKey) {
      setError('Please select a destination account');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }
    if (fromKey === toKey) {
      setError('Source and destination accounts must be different');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/transactions/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: fromAccount!.id,
          fromAccountType: fromAccount!.accountType,
          toAccountId: toAccount!.id,
          toAccountType: toAccount!.accountType,
          amount: parsedAmount,
          date: date?.toISOString(),
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Transfer failed: ${response.status}`);
      }

      onComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Funds</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          select
          fullWidth
          label="From Account"
          value={fromKey}
          onChange={(e) => setFromKey(e.target.value)}
          sx={{ mt: 2, mb: 2 }}
        >
          {renderAccountMenuItems()}
        </TextField>

        <TextField
          select
          fullWidth
          label="To Account"
          value={toKey}
          onChange={(e) => setToKey(e.target.value)}
          sx={{ mb: 2 }}
        >
          {renderAccountMenuItems(fromKey)}
        </TextField>

        <TextField
          fullWidth
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
          }}
          sx={{ mb: 2 }}
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Transfer Date"
            value={date}
            onChange={setDate}
            slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
          />
        </LocalizationProvider>

        <TextField
          fullWidth
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            fromAccount && toAccount
              ? `Transfer from ${fromAccount.name} to ${toAccount.name}`
              : 'Transfer description'
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
