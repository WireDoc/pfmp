import { useEffect, useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Stack,
  Box,
  LinearProgress,
  Chip,
  Skeleton,
  Alert,
  Slider,
} from '@mui/material';
import { goalService, type Goal } from '../../services/api';
import { useDevUserId } from '../../dev/devUserState';

function statusColor(pct: number): 'success' | 'warning' | 'error' | 'info' {
  if (pct >= 100) return 'success';
  if (pct >= 60) return 'info';
  if (pct >= 30) return 'warning';
  return 'error';
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function monthsUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(0, months);
}

function projectedDate(remaining: number, monthlySave: number): string | null {
  if (monthlySave <= 0 || remaining <= 0) return null;
  const months = Math.ceil(remaining / monthlySave);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

interface GoalWithProjection extends Goal {
  completionPct: number;
  remaining: number;
  monthsLeft: number | null;
  projectedCompletion: string | null;
  monthlyNeeded: number | null;
}

export function GoalProjectionsWidget() {
  const userId = useDevUserId() ?? 1;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extraMonthly, setExtraMonthly] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    goalService.getByUser(userId)
      .then(res => {
        if (!cancelled) {
          setGoals(res.data);
          setError(null);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load goals'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const projected: GoalWithProjection[] = useMemo(() => {
    return goals
      .filter(g => g.status !== 'Completed' && g.status !== 'Cancelled')
      .map(g => {
        const remaining = Math.max(0, g.targetAmount - g.currentAmount);
        const completionPct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
        const monthsLeft = monthsUntil(g.targetDate);
        const effectiveMonthly = (g.monthlyContribution ?? 0) + extraMonthly;
        const monthlyNeeded = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : null;
        const projectedCompletion = projectedDate(remaining, effectiveMonthly);

        return { ...g, completionPct, remaining, monthsLeft, projectedCompletion, monthlyNeeded };
      })
      .sort((a, b) => b.priority - a.priority || (a.monthsLeft ?? 999) - (b.monthsLeft ?? 999));
  }, [goals, extraMonthly]);

  if (loading) {
    return (
      <Paper sx={{ p: 2 }} data-testid="goal-projections-widget">
        <Skeleton variant="text" width={180} height={28} />
        <Skeleton variant="rectangular" height={120} sx={{ mt: 1, borderRadius: 1 }} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }} data-testid="goal-projections-widget">
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }} data-testid="goal-projections-widget">
      <Typography variant="h6" gutterBottom>Goal Projections</Typography>

      {projected.length === 0 ? (
        <Typography color="text.secondary" variant="body2">No active goals. Create one in your profile.</Typography>
      ) : (
        <Stack spacing={2}>
          {projected.map(g => (
            <Box key={g.goalId}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: '55%' }}>{g.name}</Typography>
                <Chip
                  label={`${Math.round(g.completionPct)}%`}
                  size="small"
                  color={statusColor(g.completionPct)}
                  variant="outlined"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={g.completionPct}
                color={statusColor(g.completionPct)}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                </Typography>
                {g.projectedCompletion && (
                  <Typography variant="caption" color="text.secondary">
                    Est. {g.projectedCompletion}
                  </Typography>
                )}
                {g.monthlyNeeded !== null && (
                  <Typography variant="caption" color="text.secondary">
                    Need {formatCurrency(g.monthlyNeeded)}/mo
                  </Typography>
                )}
              </Stack>
            </Box>
          ))}

          {/* What-if slider */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              What if I save an extra ${extraMonthly}/mo?
            </Typography>
            <Slider
              value={extraMonthly}
              onChange={(_e, v) => setExtraMonthly(v as number)}
              min={0}
              max={2000}
              step={50}
              valueLabelDisplay="auto"
              valueLabelFormat={v => `+$${v}`}
              size="small"
              aria-label="Extra monthly savings"
            />
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
