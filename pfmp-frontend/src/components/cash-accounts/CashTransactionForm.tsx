import React, { useState, useEffect } from 'react';
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
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Stack,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  createCashTransaction,
  updateCashTransaction,
  deleteCashTransaction,
  CASH_TRANSACTION_TYPES,
  CASH_TRANSACTION_CATEGORIES,
  type CashTransactionResponse,
  type CashTransactionType,
  type CreateCashTransactionRequest,
  type UpdateCashTransactionRequest,
} from '../../services/cashTransactionsApi';

// Transaction types where the amount represents money leaving the account (negative)
const OUTFLOW_TYPES: CashTransactionType[] = [
  'Withdrawal',
  'Fee',
  'Purchase',
  'Payment',
  'Check',
  'ATM',
];

// Transaction types where the amount represents money entering the account (positive)
const INFLOW_TYPES: CashTransactionType[] = [
  'Deposit',
  'Interest',
  'Refund',
];

interface CashTransactionFormProps {
  open: boolean;
  cashAccountId: string;
  transaction?: CashTransactionResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CashTransactionForm: React.FC<CashTransactionFormProps> = ({
  open,
  cashAccountId,
  transaction,
  onClose,
  onSuccess,
}) => {
  const isEdit = !!transaction;

  // Form state
  const [transactionType, setTransactionType] = useState<CashTransactionType>('Deposit');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with transaction data if editing
  useEffect(() => {
    if (transaction) {
      setTransactionType((transaction.transactionType as CashTransactionType) || 'Deposit');
      // Show absolute value in the input; sign is determined by transaction type
      setAmount(Math.abs(transaction.amount).toString());
      setTransactionDate(new Date(transaction.transactionDate));
      setDescription(transaction.description || '');
      setCategory(transaction.category || '');
      setMerchant(transaction.merchant || '');
      setCheckNumber(transaction.checkNumber || '');
      setFee(transaction.fee != null ? transaction.fee.toString() : '');
      setNotes(transaction.notes || '');
      setIsPending(transaction.isPending);
      setIsRecurring(transaction.isRecurring);
    } else {
      setTransactionType('Deposit');
      setAmount('');
      setTransactionDate(new Date());
      setDescription('');
      setCategory('');
      setMerchant('');
      setCheckNumber('');
      setFee('');
      setNotes('');
      setIsPending(false);
      setIsRecurring(false);
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [transaction, open]);

  // Determine signed amount based on transaction type
  const computeSignedAmount = (): number => {
    const value = parseFloat(amount) || 0;
    if (OUTFLOW_TYPES.includes(transactionType)) {
      return -Math.abs(value);
    }
    if (INFLOW_TYPES.includes(transactionType)) {
      return Math.abs(value);
    }
    // Transfer / Other: keep the value as the user entered (could be positive or negative)
    return value;
  };

  const validate = (): string | null => {
    if (!transactionType) return 'Transaction type is required';
    if (!transactionDate) return 'Transaction date is required';
    const parsed = parseFloat(amount);
    if (!parsed || parsed === 0) return 'Amount must be greater than zero';
    if (fee && parseFloat(fee) < 0) return 'Fee cannot be negative';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signedAmount = computeSignedAmount();
      const isoDate = transactionDate ? transactionDate.toISOString() : new Date().toISOString();

      if (isEdit && transaction) {
        const request: UpdateCashTransactionRequest = {
          transactionType,
          amount: signedAmount,
          transactionDate: isoDate,
          description: description || undefined,
          category: category || undefined,
          merchant: merchant || undefined,
          checkNumber: checkNumber || undefined,
          fee: fee ? parseFloat(fee) : undefined,
          isPending,
          isRecurring,
          notes: notes || undefined,
        };
        await updateCashTransaction(cashAccountId, transaction.cashTransactionId, request);
      } else {
        const request: CreateCashTransactionRequest = {
          transactionType,
          amount: signedAmount,
          transactionDate: isoDate,
          description: description || undefined,
          category: category || undefined,
          merchant: merchant || undefined,
          checkNumber: checkNumber || undefined,
          fee: fee ? parseFloat(fee) : undefined,
          isPending,
          isRecurring,
          notes: notes || undefined,
        };
        await createCashTransaction(cashAccountId, request);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving cash transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCashTransaction(cashAccountId, transaction.cashTransactionId);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting cash transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const showCheckNumber = transactionType === 'Check';
  const signedAmount = computeSignedAmount();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Transaction Type and Date */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Transaction Type"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as CashTransactionType)}
                fullWidth
                required
                disabled={loading}
              >
                {CASH_TRANSACTION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <DatePicker
                label="Transaction Date"
                value={transactionDate}
                onChange={(date) => setTransactionDate(date)}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Box>

            {/* Amount and Fee */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
                disabled={loading}
                inputProps={{ step: '0.01', min: '0' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText={
                  OUTFLOW_TYPES.includes(transactionType)
                    ? 'Will be recorded as a debit (money out)'
                    : INFLOW_TYPES.includes(transactionType)
                    ? 'Will be recorded as a credit (money in)'
                    : 'Sign determined by context'
                }
              />

              <TextField
                label="Fee (optional)"
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                fullWidth
                disabled={loading}
                inputProps={{ step: '0.01', min: '0' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Box>

            {/* Calculated Amount Preview */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Account Impact:
              </Typography>
              <Typography
                variant="h6"
                color={signedAmount >= 0 ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 600 }}
              >
                {signedAmount >= 0 ? '+' : '−'}${Math.abs(signedAmount).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {signedAmount < 0 ? 'Decreases account balance' : signedAmount > 0 ? 'Increases account balance' : 'No impact'}
              </Typography>
            </Box>

            {/* Description */}
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              disabled={loading}
              placeholder='e.g., "Paycheck deposit", "Groceries at Costco", "Rent payment"'
            />

            {/* Category and Merchant */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={[...CASH_TRANSACTION_CATEGORIES]}
                value={category}
                onChange={(_event, newValue) => setCategory(newValue || '')}
                onInputChange={(_event, newValue) => setCategory(newValue)}
                disabled={loading}
                fullWidth
                renderInput={(params) => (
                  <TextField {...params} label="Category" placeholder="e.g., Groceries" />
                )}
              />

              <TextField
                label="Merchant / Payee"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                fullWidth
                disabled={loading}
                placeholder='e.g., "Costco", "Landlord"'
              />
            </Box>

            {/* Check Number (only for Check type) */}
            {showCheckNumber && (
              <TextField
                label="Check Number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                fullWidth
                disabled={loading}
                inputProps={{ maxLength: 20 }}
              />
            )}

            {/* Status Flags */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isPending}
                    onChange={(e) => setIsPending(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Pending (not yet cleared)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Recurring (auto-pay, subscription)"
              />
            </Box>

            {/* Notes */}
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              placeholder="Add any additional notes about this transaction..."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {/* Delete button (only for edit mode) */}
          {isEdit && !showDeleteConfirm && (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              color="error"
              disabled={loading}
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <>
              <Typography variant="body2" color="error" sx={{ mr: 'auto' }}>
                Are you sure?
              </Typography>
              <Button onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
                Cancel Delete
              </Button>
              <Button onClick={handleDelete} color="error" disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Confirm Delete'}
              </Button>
            </>
          )}

          {/* Standard actions */}
          {!showDeleteConfirm && (
            <>
              <Button onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={20} /> : isEdit ? 'Save Changes' : 'Add Transaction'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};
