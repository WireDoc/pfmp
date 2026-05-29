import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  getMonthlySummary,
  recomputeRollups,
  type MonthlySummary,
} from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface MonthlySummaryCardProps {
  userId: number;
  from?: string;
  to?: string;
  refreshKey?: number;
  onRecomputed?: () => void;
}

export default function MonthlySummaryCard({ userId, from, to, refreshKey = 0, onRecomputed }: MonthlySummaryCardProps) {
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);
  const [lastRecomputedAt, setLastRecomputedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMonthlySummary(userId, { from, to })
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load summary'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, from, to, refreshKey]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const resp = await recomputeRollups(userId);
      setLastRecomputedAt(resp.asOf);
      setRecomputeMsg('Rollups recomputed.');
      onRecomputed?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Recompute failed';
      setRecomputeMsg(msg);
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Spending Summary</Typography>
          <Skeleton variant="rectangular" height={80} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Spending Summary</Typography>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRecompute}
            disabled={recomputing}
            variant="outlined"
          >
            {recomputing ? 'Recomputing…' : 'Recompute'}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {data && (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">Inflows</Typography>
              <Typography variant="h6" color="success.main">{fmt(data.totalInflows)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Outflows</Typography>
              <Typography variant="h6" color="error.main">{fmt(data.totalOutflows)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Net</Typography>
              <Typography
                variant="h6"
                color={data.net >= 0 ? 'success.main' : 'error.main'}
              >
                {data.net >= 0 ? '+' : ''}{fmt(data.net)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Transactions</Typography>
              <Typography variant="h6">{data.transactionCount}</Typography>
            </Box>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          {data && (
            <>
              Window: {new Date(data.from).toLocaleDateString()} — {new Date(data.to).toLocaleDateString()}
            </>
          )}
          {lastRecomputedAt && (
            <> · Last recomputed: {new Date(lastRecomputedAt).toLocaleTimeString()}</>
          )}
        </Typography>

        <Snackbar
          open={!!recomputeMsg}
          autoHideDuration={4000}
          onClose={() => setRecomputeMsg(null)}
          message={recomputeMsg ?? ''}
        />
      </CardContent>
    </Card>
  );
}
