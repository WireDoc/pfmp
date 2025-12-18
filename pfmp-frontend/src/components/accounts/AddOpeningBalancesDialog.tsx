import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Box,
  Paper,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  addOpeningBalances,
  type HoldingOpeningBalanceInfo,
  type OpeningBalanceEntry,
} from '../../api/portfolioAnalytics';

interface AddOpeningBalancesDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: number;
  holdings: HoldingOpeningBalanceInfo[];
  onSuccess: () => void;
}

interface BalanceFormRow {
  holdingId: number;
  symbol: string;
  currentQuantity: number;
  currentPrice: number;
  quantity: string;
  pricePerShare: string;
  date: string;
  error?: string;
}

/**
 * Dialog for entering opening balances for holdings with incomplete transaction history.
 */
export function AddOpeningBalancesDialog({
  open,
  onClose,
  accountId,
  holdings,
  onSuccess,
}: AddOpeningBalancesDialogProps) {
  const [rows, setRows] = useState<BalanceFormRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form rows when dialog opens
  useEffect(() => {
    if (open && holdings.length > 0) {
      // Default date to 30 days ago (typical Plaid history limit)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 30);
      const dateStr = defaultDate.toISOString().split('T')[0];

      setRows(
        holdings.map((h) => ({
          holdingId: h.holdingId,
          symbol: h.symbol,
          currentQuantity: h.currentQuantity,
          currentPrice: h.currentPrice,
          quantity: h.currentQuantity.toString(),
          pricePerShare: '',
          date: dateStr,
        }))
      );
      setError(null);
    }
  }, [open, holdings]);

  const handleQuantityChange = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, quantity: value, error: undefined } : row
      )
    );
  };

  const handlePriceChange = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, pricePerShare: value, error: undefined } : row
      )
    );
  };

  const handleDateChange = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, date: value, error: undefined } : row
      )
    );
  };

  const handleSetAllDates = (date: string) => {
    setRows((prev) =>
      prev.map((row) => ({ ...row, date, error: undefined }))
    );
  };

  const validateRows = (): boolean => {
    let valid = true;
    const updatedRows = rows.map((row) => {
      const qty = parseFloat(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        valid = false;
        return { ...row, error: 'Quantity must be greater than 0' };
      }
      
      // Price is optional - if blank, we'll estimate from current price
      const price = row.pricePerShare.trim() ? parseFloat(row.pricePerShare) : row.currentPrice;
      if (isNaN(price) || price <= 0) {
        valid = false;
        return { ...row, error: 'Price must be greater than 0' };
      }
      
      if (!row.date) {
        valid = false;
        return { ...row, error: 'Date is required' };
      }
      
      return row;
    });
    
    setRows(updatedRows);
    return valid;
  };

  const handleSave = async () => {
    if (!validateRows()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const balances: OpeningBalanceEntry[] = rows.map((row) => ({
        holdingId: row.holdingId,
        quantity: parseFloat(row.quantity),
        pricePerShare: row.pricePerShare.trim() 
          ? parseFloat(row.pricePerShare) 
          : row.currentPrice,
        date: row.date,
      }));

      await addOpeningBalances(accountId, { balances });
      onSuccess();
    } catch (err) {
      console.error('Error saving opening balances:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save opening balances. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Opening Balances</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This account has incomplete transaction history, which may affect
          performance calculations. Enter the opening balances for each holding
          to establish an accurate starting point.
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Tip:</strong> Set the date to when you first acquired these
          shares, or to the earliest date you want to track performance from.
          If you leave the price blank, the current price will be used as an
          estimate.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <TextField
            type="date"
            size="small"
            label="Set all dates to"
            InputLabelProps={{ shrink: true }}
            onChange={(e) => handleSetAllDates(e.target.value)}
            sx={{ width: 200 }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell align="right">Current Qty</TableCell>
                <TableCell align="right">Opening Qty</TableCell>
                <TableCell align="right">Price/Share</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.holdingId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {row.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {row.currentQuantity.toFixed(4)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      error={!!row.error}
                      helperText={row.error}
                      inputProps={{ min: 0, step: 'any' }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={row.pricePerShare}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      placeholder={row.currentPrice.toFixed(2)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      inputProps={{ min: 0, step: 'any' }}
                      sx={{ width: 130 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="date"
                      value={row.date}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 150 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || rows.length === 0}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save Opening Balances'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
