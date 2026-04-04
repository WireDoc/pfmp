import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import type { Holding } from '../../types/holdings';
import { FundingSource, FundingSourceLabels } from '../../types/holdings';

// Funding sources that make sense for adding shares (exclude ExistingPosition)
const addSharesFundingSources = Object.entries(FundingSourceLabels).filter(
  ([value]) => Number(value) !== FundingSource.ExistingPosition
);

export interface AddSharesRequest {
  quantity: number;
  pricePerShare: number;
  transactionDate?: string;
  transactionType: 'BUY' | 'DIVIDEND_REINVEST';
  fundingSource?: FundingSource;
  fee?: number;
  notes?: string;
}

interface AddSharesModalProps {
  open: boolean;
  holding: Holding | null;
  onClose: () => void;
  onSave: (holdingId: number, request: AddSharesRequest) => Promise<void>;
}

export function AddSharesModal({ open, holding, onClose, onSave }: AddSharesModalProps) {
  const [quantity, setQuantity] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [transactionType, setTransactionType] = useState<'BUY' | 'DIVIDEND_REINVEST'>('BUY');
  const [transactionDate, setTransactionDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [fundingSource, setFundingSource] = useState<FundingSource>(FundingSource.ExternalDeposit);
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setQuantity('');
    setPricePerShare('');
    setTransactionType('BUY');
    const d = new Date();
    setTransactionDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setFundingSource(FundingSource.ExternalDeposit);
    setFee('');
    setNotes('');
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!holding) return;
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerShare);
    const feeVal = fee ? parseFloat(fee) : undefined;
    if (!qty || qty <= 0) { setError('Quantity must be greater than 0'); return; }
    if (!price || price < 0) { setError('Price per share must be 0 or greater'); return; }
    if (feeVal !== undefined && feeVal < 0) { setError('Fee must be 0 or greater'); return; }

    setSaving(true);
    setError(null);
    try {
      await onSave(holding.holdingId, {
        quantity: qty,
        pricePerShare: price,
        transactionType,
        transactionDate: transactionDate || undefined,
        fundingSource,
        fee: feeVal,
        notes: notes || undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add shares');
    } finally {
      setSaving(false);
    }
  };

  if (!holding) return null;

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(pricePerShare) || 0;
  const feeAmount = fee ? parseFloat(fee) || 0 : 0;
  const additionalCost = qty * price;
  const totalCostWithFee = additionalCost + feeAmount;
  const newTotalQty = holding.quantity + qty;
  const newTotalCost = holding.totalCostBasis + additionalCost;
  const newAvgCost = newTotalQty > 0 ? newTotalCost / newTotalQty : 0;

  const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {transactionType === 'BUY' ? 'Buy More' : 'Dividend Reinvestment'} — {holding.symbol}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Current position: {holding.quantity.toLocaleString()} shares @ {fmt$(holding.averageCostBasis)} avg cost
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select value={transactionType} label="Type" onChange={e => setTransactionType(e.target.value as 'BUY' | 'DIVIDEND_REINVEST')}>
              <MenuItem value="BUY">Buy More Shares</MenuItem>
              <MenuItem value="DIVIDEND_REINVEST">Dividend Reinvestment (DRIP)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Shares to Add"
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            fullWidth
            size="small"
            required
            inputProps={{ min: 0, step: 'any' }}
          />

          <TextField
            label="Price Per Share"
            type="number"
            value={pricePerShare}
            onChange={e => setPricePerShare(e.target.value)}
            fullWidth
            size="small"
            required
            inputProps={{ min: 0, step: 'any' }}
            helperText={`Current market price: ${fmt$(holding.currentPrice)}`}
          />

          <TextField
            label="Transaction Date"
            type="date"
            value={transactionDate}
            onChange={e => setTransactionDate(e.target.value)}
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />

          <TextField
            label="Fee (optional)"
            type="number"
            value={fee}
            onChange={e => setFee(e.target.value)}
            fullWidth
            size="small"
            inputProps={{ min: 0, step: '0.01' }}
            helperText="Commission or transaction fee"
          />

          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Funding Source</Typography>
            </FormLabel>
            <RadioGroup
              value={fundingSource.toString()}
              onChange={(e) => setFundingSource(Number(e.target.value) as FundingSource)}
            >
              {addSharesFundingSources.map(([value, label]) => (
                <FormControlLabel
                  key={value}
                  value={value}
                  control={<Radio size="small" />}
                  label={label}
                />
              ))}
            </RadioGroup>
          </FormControl>

          {qty > 0 && price > 0 && (
            <Alert severity="info" icon={false}>
              <Typography variant="body2"><strong>Preview:</strong></Typography>
              <Typography variant="body2">Additional cost: {fmt$(additionalCost)}</Typography>
              {feeAmount > 0 && <Typography variant="body2">Fee: {fmt$(feeAmount)}</Typography>}
              {feeAmount > 0 && <Typography variant="body2">Total out-of-pocket: {fmt$(totalCostWithFee)}</Typography>}
              <Typography variant="body2">New quantity: {newTotalQty.toLocaleString()} shares</Typography>
              <Typography variant="body2">New avg cost: {fmt$(newAvgCost)} (was {fmt$(holding.averageCostBasis)})</Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !quantity || !pricePerShare}>
          {saving ? 'Saving...' : 'Add Shares'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
