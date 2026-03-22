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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { listUserAccounts, type AccountResponse } from '../../services/accountsApi';

interface TransferFundsDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  userId: number;
  currentAccountId: number;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export function TransferFundsDialog({ open, onClose, onComplete, userId, currentAccountId }: TransferFundsDialogProps) {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [fromAccountId, setFromAccountId] = useState<number>(currentAccountId);
  const [toAccountId, setToAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      listUserAccounts(userId).then(setAccounts).catch(() => setAccounts([]));
      setFromAccountId(currentAccountId);
      setToAccountId('');
      setAmount('');
      setDate(new Date());
      setDescription('');
      setError(null);
    }
  }, [open, userId, currentAccountId]);

  const fromAccount = accounts.find(a => a.accountId === fromAccountId);
  const toAccount = accounts.find(a => a.accountId === toAccountId);

  const handleSubmit = async () => {
    if (!toAccountId) {
      setError('Please select a destination account');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }
    if (fromAccountId === toAccountId) {
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
          fromAccountId,
          toAccountId,
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
          value={fromAccountId}
          onChange={(e) => setFromAccountId(Number(e.target.value))}
          sx={{ mt: 2, mb: 2 }}
        >
          {accounts.map((a) => (
            <MenuItem key={a.accountId} value={a.accountId}>
              {a.accountName} ({a.institution}) — {formatCurrency(a.currentBalance)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          label="To Account"
          value={toAccountId}
          onChange={(e) => setToAccountId(Number(e.target.value))}
          sx={{ mb: 2 }}
        >
          {accounts
            .filter((a) => a.accountId !== fromAccountId)
            .map((a) => (
              <MenuItem key={a.accountId} value={a.accountId}>
                {a.accountName} ({a.institution}) — {formatCurrency(a.currentBalance)}
              </MenuItem>
            ))}
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
              ? `Transfer from ${fromAccount.accountName} to ${toAccount.accountName}`
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
