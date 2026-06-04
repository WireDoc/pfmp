import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  dismissAnomaly,
  listAnomalies,
  type SpendingAnomaly,
} from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AnomalyAlertsCardProps {
  userId: number;
  refreshKey?: number;
}

export default function AnomalyAlertsCard({ userId, refreshKey = 0 }: AnomalyAlertsCardProps) {
  const [rows, setRows] = useState<SpendingAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAnomalies(userId, false)
      .then(d => { if (!cancelled) { setRows(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load anomalies'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, refreshKey, internalRefresh]);

  const handleDismiss = async (anomalyId: number) => {
    await dismissAnomaly(anomalyId);
    setInternalRefresh(x => x + 1);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Spending Anomalies</Typography>
          <Skeleton variant="rectangular" height={120} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Spending Anomalies</Typography>
          <Tooltip
            arrow
            title="A transaction whose deviation from the median for its category is more than 2× the interquartile range (IQR). Categories with fewer than 6 transactions in the last 6 months are skipped — the signal is too thin."
          >
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
              IQR-based · last 6 months
            </Typography>
          </Tooltip>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!error && rows.length === 0 && (
          <Alert severity="success">No anomalies right now — your spending is within typical ranges for each category.</Alert>
        )}

        <Stack spacing={1}>
          {rows.map(a => {
            const isHigh = a.deviationMultiple >= 4;
            return (
              <Box
                key={a.anomalyId}
                sx={{
                  p: 1.5,
                  border: 1,
                  borderColor: isHigh ? 'error.main' : 'warning.main',
                  borderRadius: 1,
                  bgcolor: isHigh ? 'error.lighter' : 'warning.lighter',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Typography variant="body2" fontWeight={500}>
                        {a.plaidPrimaryCategory.replace(/_/g, ' ').toLowerCase()}
                      </Typography>
                      <Chip
                        size="small"
                        color={isHigh ? 'error' : 'warning'}
                        label={isHigh ? 'High' : 'Medium'}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${a.deviationMultiple.toFixed(1)}× IQR`}
                      />
                    </Stack>
                    <Typography variant="body2">
                      <strong>{fmt(a.amount)}</strong>
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        vs median {fmt(a.categoryMedian)} · IQR {fmt(a.categoryIqr)}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Detected {new Date(a.detectedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Tooltip arrow title="Dismiss this anomaly — won't be flagged again.">
                    <IconButton size="small" onClick={() => handleDismiss(a.anomalyId)} aria-label="Dismiss anomaly">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
