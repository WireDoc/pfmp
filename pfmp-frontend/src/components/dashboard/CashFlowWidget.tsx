import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { useDevUserId } from '../../dev/devUserState';
import { useAuth } from '../../contexts/auth/useAuth';
import { getCashFlowSummary, type CashFlowSummary } from '../../services/spendingApi';

const fmt0 = (n: number) =>
  `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * Compact cash-flow summary on the main dashboard.
 *
 * Sources the same Wave 14 `CashFlowSummaryService` that powers the full
 * `CashFlowSummaryCard` on `/dashboard/spending`, so the numbers always
 * reconcile. Pre-Wave-14 this widget hit a separate `/api/dashboard/cash-flow-summary`
 * endpoint that didn't model allotments, paycheck-deducted insurance, basis
 * (gross vs net), or internal-transfer exclusion — so its numbers drifted from
 * what users saw on the Spending page.
 */
export const CashFlowWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const devUserId = useDevUserId();
  // Resolve userId with a guard against NaN. `localAccountId` is an MSAL UUID
  // string in production, so Number(localAccountId) is NaN and the `??` chain
  // would happily return that. Fall back to the env var (default 1) instead.
  const fallback = Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');
  const candidateFromAuth = user?.localAccountId ? Number(user.localAccountId) : NaN;
  const userId = devUserId != null
    ? devUserId
    : Number.isFinite(candidateFromAuth) && candidateFromAuth > 0
      ? candidateFromAuth
      : fallback;

  const [data, setData] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCashFlowSummary(userId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Unable to load cash flow data'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <Paper sx={{ p: 2 }} data-testid="cash-flow-loading">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={140} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 2 }} data-testid="cash-flow-error">
        <Typography variant="h6" gutterBottom>Monthly Cash Flow</Typography>
        <Alert severity="error">Unable to load cash flow data</Alert>
      </Paper>
    );
  }

  const inflows = data.totalMonthlyInflows;
  const outflows = data.totalMonthlyOutflows;
  const net = data.netMonthlyCashFlow;
  const netPositive = net >= 0;
  const savingsRate = inflows > 0 ? Math.round((net / inflows) * 1000) / 10 : 0;

  const topInflows = [...data.inflows.byIncomeType]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const topOutflows = [...data.outflows.byPlaidPrimary]
    .map(o => ({ label: o.category, amount: o.actual > 0 ? o.actual : (o.budgeted ?? 0) }))
    .filter(o => o.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const savingsAllotmentTotal = data.inflows.savingsAllotments.reduce((s, a) => s + a.amount, 0);
  const paycheckDeductedTotal = data.outflows.paycheckDeductedInsurance.reduce((s, p) => s + p.monthlyAmount, 0);

  return (
    <Paper sx={{ p: 2 }} data-testid="cash-flow-widget">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Monthly Cash Flow</Typography>
        <Chip
          label={`${savingsRate}% savings rate`}
          size="small"
          color={savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'warning' : 'error'}
        />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(3, 1fr)',
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">Income</Typography>
          <Typography variant="h6" color="success.main">{fmt0(inflows)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Expenses</Typography>
          <Typography variant="h6" color="error.main">{fmt0(outflows)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Net</Typography>
          <Typography variant="h6" color={netPositive ? 'success.main' : 'error.main'}>
            {netPositive ? '+' : '-'}{fmt0(net)}
          </Typography>
        </Box>
      </Box>

      {(topInflows.length > 0 || topOutflows.length > 0) && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {topInflows.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Top inflows
                </Typography>
                <Stack spacing={0.25}>
                  {topInflows.map((i, idx) => (
                    <Stack key={`${i.type}-${idx}`} direction="row" justifyContent="space-between">
                      <Typography variant="body2" noWrap>{i.type}</Typography>
                      <Typography variant="body2">{fmt0(i.amount)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            {topOutflows.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Top outflows
                </Typography>
                <Stack spacing={0.25}>
                  {topOutflows.map((o, idx) => (
                    <Stack key={`${o.label}-${idx}`} direction="row" justifyContent="space-between">
                      <Typography variant="body2" noWrap>{o.label}</Typography>
                      <Typography variant="body2">{fmt0(o.amount)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </>
      )}

      {(savingsAllotmentTotal > 0 || paycheckDeductedTotal > 0) && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Informational only (already netted out):
            {savingsAllotmentTotal > 0 && ` savings allotments ${fmt0(savingsAllotmentTotal)}`}
            {savingsAllotmentTotal > 0 && paycheckDeductedTotal > 0 && ' ·'}
            {paycheckDeductedTotal > 0 && ` paycheck-deducted insurance ${fmt0(paycheckDeductedTotal)}`}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="text"
          endIcon={<OpenInNewIcon />}
          onClick={() => navigate('/dashboard/spending')}
        >
          View Spending dashboard
        </Button>
      </Box>
    </Paper>
  );
};
