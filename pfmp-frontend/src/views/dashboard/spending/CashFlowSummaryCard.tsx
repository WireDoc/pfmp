import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { getCashFlowSummary, type CashFlowSummary } from '../../../services/spendingApi';

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CashFlowSummaryCardProps {
  userId: number;
  refreshKey?: number;
}

export default function CashFlowSummaryCard({ userId, refreshKey = 0 }: CashFlowSummaryCardProps) {
  const [data, setData] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCashFlowSummary(userId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Failed to load cash-flow summary'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Monthly Cash Flow</Typography>
          <Skeleton variant="rectangular" height={140} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Monthly Cash Flow</Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const net = data.netMonthlyCashFlow;
  const netPositive = net >= 0;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Monthly Cash Flow</Typography>
          <Typography variant="caption" color="text.secondary">
            As of {new Date(data.asOfUtc).toLocaleString()}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            mb: 2,
          }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
              <TrendingUpIcon color="success" fontSize="small" />
              <Typography variant="body2" color="text.secondary">Inflows</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={600} color="success.main">
              {fmt(data.totalMonthlyInflows)}
            </Typography>
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
              <TrendingDownIcon color="error" fontSize="small" />
              <Typography variant="body2" color="text.secondary">Outflows</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={600} color="error.main">
              {fmt(data.totalMonthlyOutflows)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" mb={0.5}>Net</Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              color={netPositive ? 'success.main' : 'error.main'}
            >
              {netPositive ? '+' : ''}{fmt(net)}
            </Typography>
          </Box>
        </Box>

        {data.inflows.byIncomeType.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Inflow Sources</Typography>
            <Stack spacing={0.5}>
              {data.inflows.byIncomeType.map((i, idx) => (
                <Stack key={`${i.type}-${idx}`} direction="row" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{i.type}</Typography>
                    {i.isAmbiguousAllotment && (
                      <Chip size="small" color="warning" label="Review allotment" />
                    )}
                  </Stack>
                  <Typography variant="body2" fontWeight={500}>{fmt(i.amount)}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}

        {data.inflows.savingsAllotments.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Savings Allotments (informational)</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Routed from paycheck to a linked savings account — does not reduce net inflow.
            </Typography>
            <Stack spacing={0.5}>
              {data.inflows.savingsAllotments.map(a => (
                <Stack key={a.incomeStreamId} direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    {a.name}
                    {a.destinationName && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        → {a.destinationName}
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>{fmt(a.amount)}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}

        {data.outflows.externalAllotments.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>External Allotments (outflow)</Typography>
            <Stack spacing={0.5}>
              {data.outflows.externalAllotments.map(a => (
                <Stack key={a.incomeStreamId} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{a.name}</Typography>
                  <Typography variant="body2" fontWeight={500} color="error.main">
                    -{fmt(a.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}

        {data.outflows.insurancePremiums.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Insurance Premiums (monthly)</Typography>
            <Stack spacing={0.5}>
              {data.outflows.insurancePremiums.map((p, idx) => (
                <Stack key={`${p.policyType}-${idx}`} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{p.policyName ?? p.policyType}</Typography>
                  <Typography variant="body2" fontWeight={500} color="error.main">
                    -{fmt(p.monthlyAmount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}

        {data.variances.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            {data.variances.map(v => (
              <Alert
                key={v.stream}
                severity={v.severity === 'warn' ? 'warning' : 'info'}
                sx={{ mb: 1 }}
              >
                {v.stream}: Profile {fmt(v.profile)} vs Plaid observed {fmt(v.plaid)} ({v.deltaPercent}% delta)
              </Alert>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
