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
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addDays, format } from 'date-fns';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../../services/investmentTransactionsApi';
import type {
  InvestmentTransaction,
  TransactionType,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '../../types/investmentTransactions';
import { CRYPTO_TRANSACTION_TYPES } from '../../types/investmentTransactions';

interface InvestmentTransactionFormProps {
  open: boolean;
  accountId: number;
  transaction?: InvestmentTransaction | null;
  holdings: Array<{ symbol: string; holdingId: number }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvestmentTransactionForm: React.FC<InvestmentTransactionFormProps> = ({
  open,
  accountId,
  transaction,
  holdings,
  onClose,
  onSuccess,
}) => {
  const isEdit = !!transaction;

  // Form state
  const [transactionType, setTransactionType] = useState<TransactionType>('BUY');
  const [symbol, setSymbol] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date | null>(new Date());
  const [settlementDate, setSettlementDate] = useState<Date | null>(addDays(new Date(), 2));
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [isDividendReinvestment, setIsDividendReinvestment] = useState(false);
  const [isQualifiedDividend, setIsQualifiedDividend] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with transaction data if editing
  useEffect(() => {
    if (transaction) {
      setTransactionType(transaction.transactionType);
      setSymbol(transaction.symbol || '');
      setTransactionDate(new Date(transaction.transactionDate));
      setSettlementDate(new Date(transaction.settlementDate));
      setQuantity(transaction.quantity != null ? transaction.quantity.toString() : '');
      setPrice(transaction.price != null ? transaction.price.toString() : '');
      setFee(transaction.fee != null ? transaction.fee.toString() : '');
      setNotes(transaction.notes || '');
      setIsDividendReinvestment(transaction.isDividendReinvestment || false);
      setIsQualifiedDividend(transaction.isQualifiedDividend || false);
    } else {
      // Reset form for new transaction
      setTransactionType('BUY');
      setSymbol('');
      setTransactionDate(new Date());
      setSettlementDate(addDays(new Date(), 2));
      setQuantity('');
      setPrice('');
      setFee('');
      setNotes('');
      setIsDividendReinvestment(false);
      setIsQualifiedDividend(false);
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [transaction, open]);

  // Auto-update settlement date when transaction date changes
  useEffect(() => {
    if (transactionDate && !isEdit) {
      // T+2 for stocks, same day for crypto
      const isCrypto = CRYPTO_TRANSACTION_TYPES.includes(transactionType);
      setSettlementDate(isCrypto ? transactionDate : addDays(transactionDate, 2));
    }
  }, [transactionDate, transactionType, isEdit]);

  // Calculate amount based on type, quantity, price, and fee
  const calculateAmount = (): number => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    const f = parseFloat(fee) || 0;

    if (transactionType === 'BUY') {
      return -1 * (qty * prc + f); // Negative for cash outflow
    } else if (transactionType === 'SELL') {
      return qty * prc - f; // Positive for cash inflow
    } else if (transactionType === 'DIVIDEND' || transactionType === 'DIVIDEND_REINVEST') {
      return qty * prc; // Dividend amount
    }
    return qty * prc;
  };

  // Validation
  const validate = (): string | null => {
    if (!transactionType) return 'Transaction type is required';
    if (!symbol) return 'Symbol is required';
    if (!transactionDate) return 'Transaction date is required';
    if (!settlementDate) return 'Settlement date is required';
    
    if (settlementDate < transactionDate) {
      return 'Settlement date must be on or after transaction date';
    }

    // Quantity and price required for buy/sell/dividend reinvest
    if (['BUY', 'SELL', 'DIVIDEND_REINVEST'].includes(transactionType)) {
      if (!quantity || parseFloat(quantity) <= 0) {
        return 'Quantity must be greater than 0';
      }
      if (!price || parseFloat(price) <= 0) {
        return 'Price must be greater than 0';
      }
    }

    // Dividend only needs amount (calculated from quantity * price)
    if (transactionType === 'DIVIDEND') {
      if (!quantity || parseFloat(quantity) <= 0) {
        return 'Dividend amount must be greater than 0';
      }
    }

    // Fee must be non-negative
    if (fee && parseFloat(fee) < 0) {
      return 'Fee cannot be negative';
    }

    return null;
  };

  // Handle submit (create or update)
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const amount = calculateAmount();
      const holdingId = holdings.find((h) => h.symbol === symbol)?.holdingId;

      if (isEdit && transaction) {
        // Update existing transaction
        const request: UpdateTransactionRequest = {
          transactionType,
          symbol,
          quantity: parseFloat(quantity) || undefined,
          price: parseFloat(price) || undefined,
          amount,
          fee: fee ? parseFloat(fee) : undefined,
          transactionDate: transactionDate ? format(transactionDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : undefined,
          settlementDate: settlementDate ? format(settlementDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : undefined,
          isDividendReinvestment,
          isQualifiedDividend,
          notes: notes || undefined,
        };

        await updateTransaction(transaction.transactionId, request);
      } else {
        // Create new transaction
        const request: CreateTransactionRequest = {
          accountId,
          holdingId,
          transactionType,
          symbol,
          quantity: parseFloat(quantity) || undefined,
          price: parseFloat(price) || undefined,
          amount,
          fee: fee ? parseFloat(fee) : undefined,
          transactionDate: transactionDate ? format(transactionDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : '',
          settlementDate: settlementDate ? format(settlementDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : '',
          isTaxable: true,
          isDividendReinvestment,
          isQualifiedDividend,
          notes: notes || undefined,
        };

        await createTransaction(request);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!transaction) return;

    setLoading(true);
    setError(null);

    try {
      await deleteTransaction(transaction.transactionId);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Transaction type options
  const transactionTypeOptions: { value: TransactionType; label: string }[] = [
    { value: 'BUY', label: 'Buy' },
    { value: 'SELL', label: 'Sell' },
    { value: 'DIVIDEND', label: 'Dividend' },
    { value: 'DIVIDEND_REINVEST', label: 'Dividend Reinvest (DRIP)' },
    { value: 'CAPITAL_GAINS', label: 'Capital Gains' },
    { value: 'INTEREST', label: 'Interest' },
    { value: 'SPLIT', label: 'Stock Split' },
    { value: 'SPINOFF', label: 'Spinoff' },
    { value: 'CRYPTO_STAKING', label: 'Staking Reward' },
    { value: 'CRYPTO_SWAP', label: 'Crypto Swap' },
  ];

  // Show quantity/price fields for these types
  const showQuantityPrice = ['BUY', 'SELL', 'DIVIDEND_REINVEST', 'CRYPTO_SWAP'].includes(transactionType);
  const showQuantityOnly = transactionType === 'DIVIDEND';
  const calculatedAmount = calculateAmount();

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
            {/* Transaction Type and Symbol */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Transaction Type"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                fullWidth
                required
                disabled={loading}
              >
                {transactionTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <Autocomplete
                freeSolo
                options={holdings.map((h) => h.symbol)}
                value={symbol}
                onChange={(event, newValue) => setSymbol(newValue || '')}
                onInputChange={(event, newValue) => setSymbol(newValue)}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Symbol"
                    required
                    helperText="Enter any stock, crypto, or fund symbol"
                  />
                )}
              />
            </Box>

            {/* Transaction Date and Settlement Date */}
            <Box sx={{ display: 'flex', gap: 2 }}>
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

              <DatePicker
                label="Settlement Date"
                value={settlementDate}
                onChange={(date) => setSettlementDate(date)}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Box>

            {/* Quantity (for Buy/Sell/DRIP) */}
            {showQuantityPrice && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                  inputProps={{ step: '0.00000001', min: '0' }}
                />

                <TextField
                  label="Price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                  inputProps={{ step: '0.01', min: '0' }}
                />

                <TextField
                  label="Fee"
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  fullWidth
                  disabled={loading}
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Box>
            )}

            {/* Amount only (for Dividend) */}
            {showQuantityOnly && (
              <TextField
                label="Dividend Amount"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                fullWidth
                required
                disabled={loading}
                inputProps={{ step: '0.01', min: '0' }}
                helperText="Enter the total dividend payment received"
              />
            )}

            {/* Calculated Amount Display */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Calculated Amount:
              </Typography>
              <Typography
                variant="h6"
                color={calculatedAmount >= 0 ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 600 }}
              >
                {calculatedAmount >= 0 ? '+' : ''}${Math.abs(calculatedAmount).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {calculatedAmount < 0 ? 'Cash outflow (purchase)' : 'Cash inflow (sale/income)'}
              </Typography>
            </Box>

            {/* Dividend Options */}
            {(transactionType === 'DIVIDEND' || transactionType === 'DIVIDEND_REINVEST') && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isDividendReinvestment}
                      onChange={(e) => setIsDividendReinvestment(e.target.checked)}
                      disabled={loading || transactionType === 'DIVIDEND_REINVEST'}
                    />
                  }
                  label="Dividend Reinvestment (DRIP)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isQualifiedDividend}
                      onChange={(e) => setIsQualifiedDividend(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Qualified Dividend"
                />
              </Box>
            )}

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
