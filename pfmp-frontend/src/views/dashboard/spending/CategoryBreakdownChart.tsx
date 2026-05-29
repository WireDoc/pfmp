import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  getByCategory,
  groupByPlaidPrimary,
  type CategoryRollup,
  type CategoryRollupGrouped,
} from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Stable palette — recharts cycles automatically if exhausted.
const COLORS = [
  '#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1',
  '#d32f2f', '#7b1fa2', '#388e3c', '#f57c00', '#5d4037', '#455a64',
];

interface CategoryBreakdownChartProps {
  userId: number;
  from?: string;
  to?: string;
  refreshKey?: number;
}

export default function CategoryBreakdownChart({ userId, from, to, refreshKey = 0 }: CategoryBreakdownChartProps) {
  const [rows, setRows] = useState<CategoryRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getByCategory(userId, { from, to })
      .then(d => { if (!cancelled) { setRows(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load categories'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, from, to, refreshKey]);

  const grouped: CategoryRollupGrouped[] = useMemo(() => groupByPlaidPrimary(rows), [rows]);

  const pieData = useMemo(
    () => grouped.map((g, i) => ({
      name: g.plaidPrimaryCategory,
      value: g.totalActual,
      color: COLORS[i % COLORS.length],
    })),
    [grouped],
  );

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Category Breakdown</Typography>
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Category Breakdown</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {grouped.length === 0 && !error && (
          <Alert severity="info">No spending recorded in this window.</Alert>
        )}

        {grouped.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <Box height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            <Box>
              <Stack spacing={1}>
                {grouped.map((g, idx) => {
                  const isExpanded = expanded.has(g.plaidPrimaryCategory);
                  const color = COLORS[idx % COLORS.length];
                  const overBudget = g.totalBudgeted !== null && g.totalActual > g.totalBudgeted;
                  return (
                    <Box key={g.plaidPrimaryCategory}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          cursor: g.detailed.length > 1 ? 'pointer' : 'default',
                          py: 0.5,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                        onClick={() => g.detailed.length > 1 && toggle(g.plaidPrimaryCategory)}
                      >
                        <IconButton
                          size="small"
                          sx={{ visibility: g.detailed.length > 1 ? 'visible' : 'hidden' }}
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                        </IconButton>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            bgcolor: color,
                            borderRadius: '2px',
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {g.plaidPrimaryCategory}
                        </Typography>
                        {overBudget && <Chip size="small" color="warning" label="Over" />}
                        <Typography variant="body2" fontWeight={500}>
                          {fmt(g.totalActual)}
                          {g.totalBudgeted !== null && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              / {fmt(g.totalBudgeted)}
                            </Typography>
                          )}
                        </Typography>
                      </Stack>
                      <Collapse in={isExpanded}>
                        <Stack spacing={0.5} sx={{ pl: 6, py: 1 }}>
                          {g.detailed.map((d, di) => (
                            <Stack
                              key={`${d.plaidPrimaryCategory}-${d.plaidDetailedCategory ?? di}`}
                              direction="row"
                              justifyContent="space-between"
                            >
                              <Typography variant="caption" color="text.secondary">
                                {d.plaidDetailedCategory ?? '(uncategorized detail)'}
                                {d.transactionCount > 0 && ` · ${d.transactionCount} tx`}
                              </Typography>
                              <Typography variant="caption">{fmt(d.actualAmount)}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Collapse>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
