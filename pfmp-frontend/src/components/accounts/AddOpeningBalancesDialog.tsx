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
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
  /** Unique row ID for tracking (not related to holdingId) */
  rowId: string;
  holdingId: number;
  symbol: string;
  currentQuantity: number;
  transactionsQuantity: number;
  missingQuantity: number;
  currentPrice: number;
  quantity: string;
  pricePerShare: string;
  date: string;
  error?: string;
  /** Whether this is an additional split row (not the first row for this holding) */
  isSplitRow?: boolean;
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
  const [nextRowId, setNextRowId] = useState(1);

  // Initialize form rows when dialog opens
  useEffect(() => {
    if (open && holdings.length > 0) {
      // Default date to 30 days ago (typical Plaid history limit)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 30);
      const dateStr = defaultDate.toISOString().split('T')[0];

      let rowIdCounter = 1;
      setRows(
        holdings.map((h) => ({
          rowId: `row-${rowIdCounter++}`,
          holdingId: h.holdingId,
          symbol: h.symbol,
          currentQuantity: h.currentQuantity,
          transactionsQuantity: h.transactionsQuantity,
          missingQuantity: h.missingQuantity,
          currentPrice: h.currentPrice,
          // Pre-fill with missing quantity (what's NOT covered by transactions)
          quantity: h.missingQuantity > 0 ? h.missingQuantity.toString() : h.currentQuantity.toString(),
          pricePerShare: '',
          date: dateStr,
          isSplitRow: false,
        }))
      );
      setNextRowId(rowIdCounter);
      setError(null);
    }
  }, [open, holdings]);

  const handleQuantityChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, quantity: value, error: undefined } : row
      )
    );
  };

  const handlePriceChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, pricePerShare: value, error: undefined } : row
      )
    );
  };

  const handleDateChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, date: value, error: undefined } : row
      )
    );
  };

  /** Add a new row for the same holding to split the transaction */
  const handleSplitRow = (rowId: string) => {
    const rowIndex = rows.findIndex((r) => r.rowId === rowId);
    if (rowIndex === -1) return;

    const sourceRow = rows[rowIndex];
    const newRowId = `row-${nextRowId}`;
    setNextRowId((prev) => prev + 1);

    // Create a new row for the same holding with zero quantity
    const newRow: BalanceFormRow = {
      rowId: newRowId,
      holdingId: sourceRow.holdingId,
      symbol: sourceRow.symbol,
      currentQuantity: sourceRow.currentQuantity,
      transactionsQuantity: sourceRow.transactionsQuantity,
      missingQuantity: sourceRow.missingQuantity,
      currentPrice: sourceRow.currentPrice,
      quantity: '', // User needs to fill in
      pricePerShare: '',
      date: sourceRow.date, // Copy the date as a starting point
      isSplitRow: true,
    };

    // Insert the new row after the source row
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);
  };

  /** Delete a split row (only allowed for split rows, not original) */
  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
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
          estimate. Use the <strong>+</strong> button to split a holding into
          multiple transactions if you bought shares on different dates.
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
                <TableCell align="right">From Txns</TableCell>
                <TableCell align="right">Opening Qty</TableCell>
                <TableCell align="right">Price/Share</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center" sx={{ width: 80 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowId}>
                  <TableCell>
                    {row.isSplitRow ? (
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                        └ {row.symbol}
                      </Typography>
                    ) : (
                      <Typography variant="body2" fontWeight="medium">
                        {row.symbol}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!row.isSplitRow && (
                      <Typography variant="body2" color="text.secondary">
                        {row.currentQuantity.toFixed(4)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!row.isSplitRow && (
                      <Typography variant="body2" color="text.secondary">
                        {row.transactionsQuantity.toFixed(4)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(row.rowId, e.target.value)}
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
                      onChange={(e) => handlePriceChange(row.rowId, e.target.value)}
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
                      onChange={(e) => handleDateChange(row.rowId, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 150 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Split into multiple transactions">
                        <IconButton
                          size="small"
                          onClick={() => handleSplitRow(row.rowId)}
                          color="primary"
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {row.isSplitRow && (
                        <Tooltip title="Remove this row">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRow(row.rowId)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
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
