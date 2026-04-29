/**
 * Wave 13.1: Per-symbol tax-lot drill-down dialog.
 *
 * Triggered by clicking a holding row. Lists the open lots for a given symbol
 * with acquired date, original/remaining quantity, cost basis per unit,
 * days held, and a Short/Long-term classification badge based on the >365 day
 * threshold the FIFO recompute already enforces.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { listCryptoTaxLots, type CryptoTaxLot } from '../../services/cryptoApi';

interface TaxLotsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  symbol: string | null;
}

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });

const qty = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 8 });

function daysBetween(fromIso: string): number {
  const from = new Date(fromIso).getTime();
  const now = Date.now();
  return Math.floor((now - from) / (1000 * 60 * 60 * 24));
}

export default function TaxLotsDialog({ open, onClose, userId, symbol }: TaxLotsDialogProps) {
  const [lots, setLots] = useState<CryptoTaxLot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCryptoTaxLots(userId, { symbol, openOnly: true })
      .then(rows => { if (!cancelled) { setLots(rows); setLoading(false); } })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tax lots.');
          setLots([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [open, userId, symbol]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Open Tax Lots — {symbol ?? ''}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          FIFO-derived from your synced transaction history. Lots held more than 365 days qualify as long-term for
          capital-gains purposes when sold. <strong>Cost basis is incomplete if you owned this asset before linking the
          exchange — this is not a tax-filing tool.</strong>
        </Typography>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !lots || lots.length === 0 ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No open lots for {symbol}. This usually means the position was fully sold or no acquisition has been
              recorded yet — re-syncing the connection may populate older history.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Acquired</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Original Qty</TableCell>
                  <TableCell align="right">Remaining Qty</TableCell>
                  <TableCell align="right">Cost Basis / Unit</TableCell>
                  <TableCell align="right">Days Held</TableCell>
                  <TableCell>Term</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map(lot => {
                  const days = daysBetween(lot.acquiredAt);
                  const longTerm = days > 365;
                  return (
                    <TableRow key={lot.cryptoTaxLotId}>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {new Date(lot.acquiredAt).toLocaleDateString()}
                        </Typography>
                        {lot.isRewardLot && (
                          <Chip size="small" label="Reward" color="success" variant="outlined" sx={{ mt: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell>{lot.provider}</TableCell>
                      <TableCell align="right">{qty(lot.originalQuantity)}</TableCell>
                      <TableCell align="right">{qty(lot.remainingQuantity)}</TableCell>
                      <TableCell align="right">{usd(lot.costBasisUsdPerUnit)}</TableCell>
                      <TableCell align="right">{days.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={longTerm ? 'Long-term' : 'Short-term'}
                          color={longTerm ? 'primary' : 'default'}
                          variant={longTerm ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
