import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {
  getByCategory,
  groupByPlaidPrimary,
  listBudgets,
  type ExpenseBudget,
  type CategoryRollupGrouped,
} from '../../../services/spendingApi';
import BudgetEditorDialog from './BudgetEditorDialog';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface BudgetVsActualPanelProps {
  userId: number;
  from?: string;
  to?: string;
  refreshKey?: number;
  onChanged?: () => void;
}

interface Row {
  category: string; // Plaid primary key
  budget: ExpenseBudget | null;
  budgeted: number;
  actual: number;
}

export default function BudgetVsActualPanel({ userId, from, to, refreshKey = 0, onChanged }: BudgetVsActualPanelProps) {
  const [budgets, setBudgets] = useState<ExpenseBudget[]>([]);
  const [grouped, setGrouped] = useState<CategoryRollupGrouped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [editing, setEditing] = useState<ExpenseBudget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      listBudgets(userId),
      getByCategory(userId, { from, to }),
    ])
      .then(([b, rows]) => {
        if (cancelled) return;
        setBudgets(b);
        setGrouped(groupByPlaidPrimary(rows));
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load budgets');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, from, to, refreshKey, internalRefresh]);

  const rows: Row[] = useMemo(() => {
    const keys = new Set<string>();
    for (const b of budgets) {
      if (b.plaidPrimaryCategory) keys.add(b.plaidPrimaryCategory);
      else keys.add(b.category);
    }
    for (const g of grouped) keys.add(g.plaidPrimaryCategory);

    return Array.from(keys).map(k => {
      const budget = budgets.find(b => (b.plaidPrimaryCategory ?? b.category) === k) ?? null;
      const actualMatch = grouped.find(g => g.plaidPrimaryCategory === k);
      // Convert period to monthly so the comparison is apples-to-apples.
      const budgeted = budget ? toMonthly(budget) : 0;
      return {
        category: k,
        budget,
        budgeted,
        actual: actualMatch?.totalActual ?? 0,
      };
    }).sort((a, b) => Math.max(b.budgeted, b.actual) - Math.max(a.budgeted, a.actual));
  }, [budgets, grouped]);

  const handleSaved = () => {
    setInternalRefresh(x => x + 1);
    onChanged?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Budget vs Actual</Typography>
          <Skeleton variant="rectangular" height={200} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Budget vs Actual</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => { setEditing(null); setEditorOpen(true); }}
          >
            New Budget
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {rows.length === 0 && !error && (
          <Alert severity="info">No budgets or spending in this window. Click "New Budget" to create one.</Alert>
        )}

        <Stack spacing={2}>
          {rows.map(r => {
            const pct = r.budgeted > 0 ? Math.min(100, (r.actual / r.budgeted) * 100) : 0;
            const over = r.budgeted > 0 && r.actual > r.budgeted;
            const orphan = !r.budget; // Spending without a budget
            const unspent = r.budget && r.actual === 0;
            return (
              <Box key={r.category}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={500}>{r.category}</Typography>
                    {over && <Chip size="small" color="error" label="Over budget" />}
                    {orphan && <Chip size="small" color="warning" label="No budget" />}
                    {unspent && <Chip size="small" color="success" label="Unspent" />}
                    {r.budget?.isEstimated && <Chip size="small" variant="outlined" label="Estimate" />}
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">
                      {fmt(r.actual)}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        / {r.budgeted > 0 ? fmt(r.budgeted) : '—'}
                      </Typography>
                    </Typography>
                    {r.budget && (
                      <IconButton
                        size="small"
                        aria-label={`Edit ${r.category} budget`}
                        onClick={() => { setEditing(r.budget); setEditorOpen(true); }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={over ? 'error' : 'primary'}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                />
              </Box>
            );
          })}
        </Stack>
      </CardContent>
      <BudgetEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
        userId={userId}
        budget={editing}
      />
    </Card>
  );
}

function toMonthly(b: ExpenseBudget): number {
  const base = b.monthlyAmount;
  switch (b.periodType) {
    case 'Weekly': return base * 52 / 12;
    case 'Biweekly': return base * 26 / 12;
    case 'Annual': return base / 12;
    case 'Monthly':
    default:
      return base;
  }
}
