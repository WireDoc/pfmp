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

export type HoldingTransactionType = 'BUY' | 'SELL' | 'DIVIDEND_REINVEST' | 'DIVIDEND_CASH';

// Funding sources that make sense for buying shares (exclude ExistingPosition)
const buyFundingSources = Object.entries(FundingSourceLabels).filter(
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

export interface SellSharesRequest {
  quantity: number;
  pricePerShare: number;
  transactionDate?: string;
  fee?: number;
  notes?: string;
}

export interface DividendCashRequest {
  amount: number;
  transactionDate?: string;
  isQualifiedDividend?: boolean;
  notes?: string;
}

export type HoldingTransactionRequest =
  | { type: 'BUY' | 'DIVIDEND_REINVEST'; payload: AddSharesRequest }
  | { type: 'SELL'; payload: SellSharesRequest }
  | { type: 'DIVIDEND_CASH'; payload: DividendCashRequest };

interface HoldingTransactionModalProps {
  open: boolean;
  holding: Holding | null;
  onClose: () => void;
  onSave: (holdingId: number, request: HoldingTransactionRequest) => Promise<void>;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function HoldingTransactionModal({ open, holding, onClose, onSave }: HoldingTransactionModalProps) {
  const [transactionType, setTransactionType] = useState<HoldingTransactionType>('BUY');
  const [quantity, setQuantity] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');
  const [isQualifiedDividend, setIsQualifiedDividend] = useState(false);
  const [transactionDate, setTransactionDate] = useState(todayIso);
  const [fundingSource, setFundingSource] = useState<FundingSource>(FundingSource.ExternalDeposit);
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setTransactionType('BUY');
    setQuantity('');
    setPricePerShare('');
    setDividendAmount('');
    setIsQualifiedDividend(false);
    setTransactionDate(todayIso());
    setFundingSource(FundingSource.ExternalDeposit);
    setFee('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSave = async () => {
    if (!holding) return;
    const feeVal = fee ? parseFloat(fee) : undefined;
    if (feeVal !== undefined && feeVal < 0) {
      setError('Fee must be 0 or greater');
      return;
    }

    if (transactionType === 'DIVIDEND_CASH') {
      const amt = parseFloat(dividendAmount);
      if (!amt || amt <= 0) {
        setError('Dividend amount must be greater than 0');
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await onSave(holding.holdingId, {
          type: 'DIVIDEND_CASH',
          payload: {
            amount: amt,
            transactionDate: transactionDate || undefined,
            isQualifiedDividend,
            notes: notes || undefined,
          },
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record dividend');
      } finally {
        setSaving(false);
      }
      return;
    }

    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerShare);
    if (!qty || qty <= 0) { setError('Quantity must be greater than 0'); return; }
    if (!price || price < 0) { setError('Price per share must be 0 or greater'); return; }

    if (transactionType === 'SELL' && qty > holding.quantity) {
      setError(`Cannot sell ${qty} shares — only ${holding.quantity.toLocaleString()} available.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (transactionType === 'SELL') {
        await onSave(holding.holdingId, {
          type: 'SELL',
          payload: {
            quantity: qty,
            pricePerShare: price,
            transactionDate: transactionDate || undefined,
            fee: feeVal,
            notes: notes || undefined,
          },
        });
      } else {
        // BUY or DIVIDEND_REINVEST — share the AddSharesRequest payload
        await onSave(holding.holdingId, {
          type: transactionType,
          payload: {
            quantity: qty,
            pricePerShare: price,
            transactionType,
            transactionDate: transactionDate || undefined,
            fundingSource: transactionType === 'BUY' ? fundingSource : undefined,
            fee: feeVal,
            notes: notes || undefined,
          },
        });
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  if (!holding) return null;

  const fmt$ = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  // ----- previews -----
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(pricePerShare) || 0;
  const feeAmount = fee ? parseFloat(fee) || 0 : 0;
  const grossAmount = qty * price;

  // Buy / DRIP preview
  const newTotalQtyBuy = holding.quantity + qty;
  const newTotalCostBuy = holding.totalCostBasis + grossAmount;
  const newAvgCostBuy = newTotalQtyBuy > 0 ? newTotalCostBuy / newTotalQtyBuy : 0;

  // Sell preview
  const realizedGain = (price - holding.averageCostBasis) * qty - feeAmount;
  const netProceeds = grossAmount - feeAmount;
  const newTotalQtySell = holding.quantity - qty;

  // Dividend cash preview
  const cashDivAmount = parseFloat(dividendAmount) || 0;

  // ----- titles & button labels -----
  const titlePart = {
    BUY: 'Buy More',
    SELL: 'Sell Shares',
    DIVIDEND_REINVEST: 'Dividend Reinvestment',
    DIVIDEND_CASH: 'Cash Dividend',
  }[transactionType];

  const submitLabel = {
    BUY: 'Buy Shares',
    SELL: 'Sell Shares',
    DIVIDEND_REINVEST: 'Reinvest Dividend',
    DIVIDEND_CASH: 'Record Dividend',
  }[transactionType];

  const canSubmit = transactionType === 'DIVIDEND_CASH'
    ? !!dividendAmount
    : !!quantity && !!pricePerShare;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {titlePart} — {holding.symbol}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Current position: {holding.quantity.toLocaleString()} shares @ {fmt$(holding.averageCostBasis)} avg cost
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={transactionType}
              label="Type"
              onChange={e => setTransactionType(e.target.value as HoldingTransactionType)}
            >
              <MenuItem value="BUY">Buy More Shares</MenuItem>
              <MenuItem value="SELL">Sell Shares</MenuItem>
              <MenuItem value="DIVIDEND_REINVEST">Dividend Reinvestment (DRIP)</MenuItem>
              <MenuItem value="DIVIDEND_CASH">Cash Dividend</MenuItem>
            </Select>
          </FormControl>

          {transactionType === 'DIVIDEND_CASH' ? (
            <>
              <TextField
                label="Dividend Amount"
                type="number"
                value={dividendAmount}
                onChange={e => setDividendAmount(e.target.value)}
                fullWidth
                size="small"
                required
                inputProps={{ min: 0, step: '0.01' }}
                helperText="Total cash dividend received. Will credit account cash balance."
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

              <FormControlLabel
                control={
                  <Radio
                    size="small"
                    checked={isQualifiedDividend}
                    onClick={() => setIsQualifiedDividend(v => !v)}
                  />
                }
                label="Qualified dividend (lower tax rate)"
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

              {cashDivAmount > 0 && (
                <Alert severity="info" icon={false}>
                  <Typography variant="body2"><strong>Preview:</strong></Typography>
                  <Typography variant="body2">Dividend amount: {fmt$(cashDivAmount)}</Typography>
                  <Typography variant="body2">Shares unchanged: {holding.quantity.toLocaleString()}</Typography>
                  <Typography variant="body2">Credit to account cash balance: {fmt$(cashDivAmount)}</Typography>
                </Alert>
              )}
            </>
          ) : (
            <>
              <TextField
                label={transactionType === 'SELL' ? 'Shares to Sell' : 'Shares to Add'}
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                fullWidth
                size="small"
                required
                inputProps={{
                  min: 0,
                  step: 'any',
                  max: transactionType === 'SELL' ? holding.quantity : undefined,
                }}
                helperText={
                  transactionType === 'SELL'
                    ? `Max: ${holding.quantity.toLocaleString()} shares`
                    : undefined
                }
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

              {transactionType === 'BUY' && (
                <FormControl component="fieldset">
                  <FormLabel component="legend">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Funding Source
                    </Typography>
                  </FormLabel>
                  <RadioGroup
                    value={fundingSource.toString()}
                    onChange={(e) => setFundingSource(Number(e.target.value) as FundingSource)}
                  >
                    {buyFundingSources.map(([value, label]) => (
                      <FormControlLabel
                        key={value}
                        value={value}
                        control={<Radio size="small" />}
                        label={label}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}

              {transactionType === 'SELL' && (
                <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                  Proceeds credit the account's cash balance automatically.
                </Alert>
              )}

              {qty > 0 && price > 0 && transactionType !== 'SELL' && (
                <Alert severity="info" icon={false}>
                  <Typography variant="body2"><strong>Preview:</strong></Typography>
                  <Typography variant="body2">Additional cost: {fmt$(grossAmount)}</Typography>
                  {feeAmount > 0 && <Typography variant="body2">Fee: {fmt$(feeAmount)}</Typography>}
                  {feeAmount > 0 && (
                    <Typography variant="body2">
                      Total out-of-pocket: {fmt$(grossAmount + feeAmount)}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    New quantity: {newTotalQtyBuy.toLocaleString()} shares
                  </Typography>
                  <Typography variant="body2">
                    New avg cost: {fmt$(newAvgCostBuy)} (was {fmt$(holding.averageCostBasis)})
                  </Typography>
                </Alert>
              )}

              {qty > 0 && price > 0 && transactionType === 'SELL' && (
                <Alert
                  severity={realizedGain >= 0 ? 'success' : 'warning'}
                  icon={false}
                >
                  <Typography variant="body2"><strong>Preview:</strong></Typography>
                  <Typography variant="body2">Gross proceeds: {fmt$(grossAmount)}</Typography>
                  {feeAmount > 0 && <Typography variant="body2">Fee: {fmt$(feeAmount)}</Typography>}
                  <Typography variant="body2">Net to cash balance: {fmt$(netProceeds)}</Typography>
                  <Typography variant="body2">
                    Estimated realized gain/loss: {fmt$(realizedGain)}
                    {' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      (avg cost {fmt$(holding.averageCostBasis)}, informational only — not tax-lot accurate)
                    </Typography>
                  </Typography>
                  <Typography variant="body2">
                    Remaining: {newTotalQtySell.toLocaleString()} shares
                    {newTotalQtySell <= 0 && ' — holding will be closed'}
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color={transactionType === 'SELL' ? 'warning' : 'primary'}
          disabled={saving || !canSubmit}
        >
          {saving ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
