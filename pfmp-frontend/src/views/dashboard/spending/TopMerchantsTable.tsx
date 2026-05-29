import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getTopMerchants, type MerchantAggregate } from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface TopMerchantsTableProps {
  userId: number;
  from?: string;
  to?: string;
  refreshKey?: number;
}

export default function TopMerchantsTable({ userId, from, to, refreshKey = 0 }: TopMerchantsTableProps) {
  const [rows, setRows] = useState<MerchantAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTopMerchants(userId, { limit: 10, from, to })
      .then(d => { if (!cancelled) { setRows(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load merchants'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, from, to, refreshKey]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Top Merchants</Typography>
          <Skeleton variant="rectangular" height={200} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Top Merchants</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {rows.length === 0 && !error && <Alert severity="info">No merchant spending in this window.</Alert>}
        {rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Merchant</TableCell>
                  <TableCell align="right">Transactions</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Top Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.merchant}>
                    <TableCell>{r.merchant}</TableCell>
                    <TableCell align="right">{r.transactionCount}</TableCell>
                    <TableCell align="right">{fmt(r.totalSpent)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.topCategory ?? '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
