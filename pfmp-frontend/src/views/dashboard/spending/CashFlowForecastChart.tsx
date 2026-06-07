import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Drawer,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import {
  getCashFlowForecast,
  type CashFlowForecast,
} from '../../../services/spendingApi';

const fmt = (n: number) => {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtShort = (n: number) =>
  Math.abs(n) >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toFixed(0)}`;

const HORIZON_OPTIONS = [30, 60, 90, 180];

interface CashFlowForecastChartProps {
  userId: number;
  refreshKey?: number;
}

export default function CashFlowForecastChart({ userId, refreshKey = 0 }: CashFlowForecastChartProps) {
  const [horizon, setHorizon] = useState(90);
  const [data, setData] = useState<CashFlowForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCashFlowForecast(userId, horizon)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load forecast'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, horizon, refreshKey]);

  const chartData = useMemo(
    () => (data?.days ?? []).map(d => ({
      date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isoDate: d.date,
      projected: Number(d.projectedBalance.toFixed(2)),
      lower: Number(d.lowerBalance.toFixed(2)),
      upper: Number(d.upperBalance.toFixed(2)),
      // For Recharts to draw a shaded band we need (upper - lower) as a series too.
      bandRange: [Number(d.lowerBalance.toFixed(2)), Number(d.upperBalance.toFixed(2))],
    })),
    [data],
  );

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cash-Flow Forecast</Typography>
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cash-Flow Forecast</Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const finalDay = data.days[data.days.length - 1];
  const netChange = finalDay ? finalDay.projectedBalance - data.startingBalance : 0;

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={2}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="h6">Cash-Flow Forecast</Typography>
            <Tooltip
              arrow
              title="Projected balance (line) is your current cash plus expected inflows and outflows from recurring streams, scheduled liability payments, and average discretionary spending. The shaded band is ±1σ × √t from the historical daily variance — uncertainty fans out the further you look."
            >
              <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              label="Horizon"
              value={horizon}
              onChange={e => setHorizon(Number(e.target.value))}
              sx={{ minWidth: 120 }}
            >
              {HORIZON_OPTIONS.map(d => (
                <MenuItem key={d} value={d}>{d} days</MenuItem>
              ))}
            </TextField>
            <Button size="small" variant="outlined" onClick={() => setDrawerOpen(true)}>
              Why this forecast
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Starting balance</Typography>
            <Typography variant="h6">{fmt(data.startingBalance)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">In {data.horizonDays} days (projected)</Typography>
            <Typography variant="h6" color={finalDay && finalDay.projectedBalance >= data.startingBalance ? 'success.main' : 'error.main'}>
              {fmt(finalDay?.projectedBalance ?? data.startingBalance)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Net change</Typography>
            <Typography variant="h6" color={netChange >= 0 ? 'success.main' : 'error.main'}>
              {netChange >= 0 ? `+${fmt(netChange)}` : fmt(netChange)}
            </Typography>
          </Box>
        </Box>

        <Box height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 0, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="date" minTickGap={32} stroke="rgba(0,0,0,0.6)" />
              <YAxis tickFormatter={fmtShort} stroke="rgba(0,0,0,0.6)" />
              <RTooltip
                formatter={(value: number) => fmt(value)}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="bandRange"
                stroke="none"
                fill="#1976d2"
                fillOpacity={0.12}
                isAnimationActive={false}
                name="±1σ band"
              />
              <Line type="monotone" dataKey="projected" stroke="#1976d2" strokeWidth={2} dot={false} name="Projected" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          ±1σ from {data.historicalDailyStdDev > 0 ? `${fmt(data.historicalDailyStdDev)}/day historical variance` : 'no historical data available'}.
          Bands widen by √t.
        </Typography>
      </CardContent>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: '100vw', sm: 480 }, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Why this forecast</Typography>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close drawer">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Typography variant="body2" color="text.secondary" mb={2}>
            The {data.horizonDays}-day projection is driven by these inputs:
          </Typography>

          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr', mb: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Starting balance</Typography>
              <Typography variant="body1">{fmt(data.startingBalance)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Avg discretionary / day</Typography>
              <Typography variant="body1">{fmt(data.avgDailyDiscretionary)}</Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" gutterBottom>Recurring streams ({data.recurringContributions.length})</Typography>
          {data.recurringContributions.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No active recurring streams. Plaid Recurring or the heuristic detector will surface them as transactions accumulate.
            </Alert>
          ) : (
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Freq</TableCell>
                    <TableCell align="right">$/mo</TableCell>
                    <TableCell align="right">Over horizon</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recurringContributions.map(c => (
                    <TableRow key={c.streamId}>
                      <TableCell>
                        <Typography variant="body2">{c.merchantName}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.source}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption">{c.frequency}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={c.direction === 'Outflow' ? 'error.main' : 'success.main'}>
                          {c.direction === 'Outflow' ? `-${fmt(c.monthlyAverage)}` : `+${fmt(c.monthlyAverage)}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">
                          {c.direction === 'Outflow' ? `-${fmt(c.horizonContribution)}` : `+${fmt(c.horizonContribution)}`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
            Bands are ±1σ × √t (≈ 68% confidence interval). σ comes from {data.historicalDailyStdDev > 0 ? `${fmt(data.historicalDailyStdDev)}/day of historical daily net cash flow over the last 90 days` : '90 days of history (not enough data yet)'}.
          </Alert>
        </Box>
      </Drawer>
    </Card>
  );
}
