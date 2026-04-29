/**
 * Wave 13.1: Crypto transaction ledger.
 *
 * Renders the raw CryptoTransaction history collected by the per-connection
 * sync (Buy / Sell / Deposit / Withdrawal / StakingReward / EarnInterest /
 * Fee / Transfer / Other). Filterable by connection, transaction type, and
 * "since" date. Pulls from /api/crypto/transactions.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import {
  listCryptoTransactions,
  type CryptoTransaction,
  type CryptoTransactionType,
  type ExchangeConnection,
} from '../../services/cryptoApi';

interface CryptoTransactionsPanelProps {
  userId: number;
  connections: ExchangeConnection[];
  refreshKey?: number;
}

const TX_TYPES: ('All' | CryptoTransactionType)[] = [
  'All',
  'Buy',
  'Sell',
  'Deposit',
  'Withdrawal',
  'StakingReward',
  'EarnInterest',
  'Fee',
  'Transfer',
  'Other',
];

const SINCE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Year to date', days: -1 }, // sentinel: Jan 1 of current year
  { label: 'All time', days: null },
];

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qty = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 8 });

function typeChipColor(t: CryptoTransactionType): 'success' | 'error' | 'info' | 'warning' | 'default' {
  switch (t) {
    case 'Buy':
    case 'Deposit':
    case 'StakingReward':
    case 'EarnInterest':
      return 'success';
    case 'Sell':
    case 'Withdrawal':
      return 'error';
    case 'Fee':
      return 'warning';
    case 'Transfer':
      return 'info';
    default:
      return 'default';
  }
}

function computeSinceIso(days: number | null): string | undefined {
  if (days === null) return undefined;
  if (days === -1) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export default function CryptoTransactionsPanel({ userId, connections, refreshKey = 0 }: CryptoTransactionsPanelProps) {
  const [transactions, setTransactions] = useState<CryptoTransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionFilter, setConnectionFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'All' | CryptoTransactionType>('All');
  const [sinceDays, setSinceDays] = useState<number | null>(90);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const since = computeSinceIso(sinceDays);
    listCryptoTransactions(userId, {
      connectionId: connectionFilter === 'all' ? undefined : connectionFilter,
      since,
    })
      .then(rows => { if (!cancelled) { setTransactions(rows); setLoading(false); } })
      .catch(() => { if (!cancelled) { setTransactions([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, connectionFilter, sinceDays, refreshKey]);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const byType = typeFilter === 'All'
      ? transactions
      : transactions.filter(t => t.transactionType === typeFilter);
    return [...byType].sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
  }, [transactions, typeFilter]);

  const paged = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>Transaction History</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Raw ledger of buys, sells, deposits, withdrawals, staking rewards, and fees synced from your linked exchanges.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            size="small"
            label="Connection"
            value={connectionFilter}
            onChange={(e) => { setConnectionFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(0); }}
            sx={{ minWidth: 200 }}
            inputProps={{ 'aria-label': 'Connection filter' }}
          >
            <MenuItem value="all">All connections</MenuItem>
            {connections.map(c => (
              <MenuItem key={c.exchangeConnectionId} value={c.exchangeConnectionId}>
                {c.nickname ? `${c.provider} — ${c.nickname}` : c.provider}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as 'All' | CryptoTransactionType); setPage(0); }}
            sx={{ minWidth: 160 }}
            inputProps={{ 'aria-label': 'Transaction type filter' }}
          >
            {TX_TYPES.map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Date range"
            value={sinceDays === null ? 'all' : String(sinceDays)}
            onChange={(e) => {
              const v = e.target.value;
              setSinceDays(v === 'all' ? null : Number(v));
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
            inputProps={{ 'aria-label': 'Date range filter' }}
          >
            {SINCE_OPTIONS.map(o => (
              <MenuItem key={o.label} value={o.days === null ? 'all' : String(o.days)}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {loading ? (
          <Skeleton variant="rectangular" height={180} />
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No transactions match the current filters. Try widening the date range or syncing a connection.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price (USD)</TableCell>
                    <TableCell align="right">Value (USD)</TableCell>
                    <TableCell align="right">Fee (USD)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map(tx => {
                    const value = tx.priceUsd != null ? Math.abs(tx.quantity) * tx.priceUsd : null;
                    return (
                      <TableRow key={tx.cryptoTransactionId}>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {new Date(tx.executedAt).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{tx.provider}</TableCell>
                        <TableCell>
                          <Chip size="small" label={tx.transactionType} color={typeChipColor(tx.transactionType)} />
                        </TableCell>
                        <TableCell>{tx.symbol}</TableCell>
                        <TableCell align="right">{qty(tx.quantity)}</TableCell>
                        <TableCell align="right">{tx.priceUsd != null ? usd(tx.priceUsd) : '—'}</TableCell>
                        <TableCell align="right">{value != null ? usd(value) : '—'}</TableCell>
                        <TableCell align="right">{tx.feeUsd != null ? usd(tx.feeUsd) : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
