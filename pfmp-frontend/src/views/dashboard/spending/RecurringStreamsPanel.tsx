import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  dismissRecurringStream,
  listRecurringStreams,
  type RecurringTransactionStream,
} from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RecurringStreamsPanelProps {
  userId: number;
  refreshKey?: number;
}

export default function RecurringStreamsPanel({ userId, refreshKey = 0 }: RecurringStreamsPanelProps) {
  const [streams, setStreams] = useState<RecurringTransactionStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'Outflow' | 'Inflow'>('Outflow');
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRecurringStreams(userId, { isActive: true })
      .then(d => { if (!cancelled) { setStreams(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load recurring streams'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, refreshKey, internalRefresh]);

  const filtered = useMemo(
    () => streams.filter(s => s.direction === tab).sort((a, b) => b.averageAmount - a.averageAmount),
    [streams, tab],
  );

  const handleDismiss = async (streamId: number) => {
    await dismissRecurringStream(streamId);
    setInternalRefresh(x => x + 1);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recurring Streams</Typography>
          <Skeleton variant="rectangular" height={200} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Recurring Streams</Typography>
          <Typography variant="caption" color="text.secondary">
            {streams.filter(s => s.isActive).length} active
          </Typography>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, val: 'Outflow' | 'Inflow') => setTab(val)}
          sx={{ mb: 2, minHeight: 36 }}
          variant="fullWidth"
        >
          <Tab value="Outflow" label={`Outflows (${streams.filter(s => s.direction === 'Outflow').length})`} sx={{ minHeight: 36 }} />
          <Tab value="Inflow" label={`Inflows (${streams.filter(s => s.direction === 'Inflow').length})`} sx={{ minHeight: 36 }} />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!error && filtered.length === 0 && (
          <Alert severity="info">
            No {tab === 'Outflow' ? 'recurring outflows' : 'recurring inflows'} detected yet. Streams need at least 3 matching transactions
            over the last 120 days to surface.
          </Alert>
        )}

        {filtered.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Merchant</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell align="right">Avg amount</TableCell>
                  <TableCell>Next expected</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.streamId}>
                    <TableCell>{s.merchantName}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={s.frequency} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={s.direction === 'Outflow' ? 'error.main' : 'success.main'}>
                        {s.direction === 'Outflow' ? '-' : '+'}{fmt(s.averageAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {s.nextExpectedDate ? new Date(s.nextExpectedDate).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          size="small"
                          color={s.source === 'PlaidRecurring' ? 'primary' : 'default'}
                          label={s.source === 'PlaidRecurring' ? 'Plaid' : 'Heuristic'}
                        />
                        {s.status === 'EarlyDetection' && (
                          <Tooltip arrow title="Detected from < 4 occurrences. Confidence will improve as more transactions arrive.">
                            <Chip size="small" color="warning" variant="outlined" label="Early" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip arrow title="Dismiss — won't be detected again on next sync unless it reappears.">
                        <IconButton size="small" onClick={() => handleDismiss(s.streamId)} aria-label={`Dismiss ${s.merchantName}`}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Plaid-detected streams take precedence over heuristic detection when both match the same merchant + cadence.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
