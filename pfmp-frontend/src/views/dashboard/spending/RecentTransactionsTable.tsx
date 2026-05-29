import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getSpendingTransactions, type CashTransaction } from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RecentTransactionsTableProps {
  userId: number;
  from?: string;
  to?: string;
  refreshKey?: number;
  limit?: number;
}

export default function RecentTransactionsTable({
  userId,
  from,
  to,
  refreshKey = 0,
  limit = 25,
}: RecentTransactionsTableProps) {
  const [rows, setRows] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSpendingTransactions(userId, { from, to })
      .then(d => { if (!cancelled) { setRows(d.slice(0, limit)); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load transactions'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, from, to, refreshKey, limit]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
          <Skeleton variant="rectangular" height={200} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {rows.length === 0 && !error && <Alert severity="info">No transactions in this window.</Alert>}
        {rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Merchant / Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => {
                  const isOutflow = r.amount < 0;
                  return (
                    <TableRow key={r.cashTransactionId}>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(r.transactionDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.merchant ?? r.description ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {(r.plaidCategory || r.category) && (
                          <Chip size="small" variant="outlined" label={r.plaidCategory ?? r.category} />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={isOutflow ? 'error.main' : 'success.main'}
                          fontWeight={500}
                        >
                          {isOutflow ? '-' : '+'}{fmt(Math.abs(r.amount))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
