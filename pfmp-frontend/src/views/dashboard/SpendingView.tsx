import { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useDevUserId } from '../../dev/devUserState';
import { useAuth } from '../../contexts/auth/useAuth';
import CashFlowSummaryCard from './spending/CashFlowSummaryCard';
import MonthlySummaryCard from './spending/MonthlySummaryCard';
import CategoryBreakdownChart from './spending/CategoryBreakdownChart';
import BudgetVsActualPanel from './spending/BudgetVsActualPanel';
import TopMerchantsTable from './spending/TopMerchantsTable';
import RecentTransactionsTable from './spending/RecentTransactionsTable';

interface MonthOption {
  label: string;
  fromIso: string;
  toIso: string;
  ym: string;
}

function buildMonthOptions(): MonthOption[] {
  const now = new Date();
  const out: MonthOption[] = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const ym = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const baseLabel = start.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    out.push({
      label: i === 0 ? `${baseLabel} (current)` : baseLabel,
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
      ym,
    });
  }
  return out;
}

export function SpendingView() {
  const { user } = useAuth();
  const devUserId = useDevUserId();
  const userId =
    devUserId ??
    (user?.localAccountId ? Number(user.localAccountId) : null) ??
    Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');

  const months = useMemo(buildMonthOptions, []);
  const [monthIdx, setMonthIdx] = useState(0);
  const month = months[monthIdx];
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePrev = () => {
    if (monthIdx < months.length - 1) setMonthIdx(monthIdx + 1);
  };
  const handleNext = () => {
    if (monthIdx > 0) setMonthIdx(monthIdx - 1);
  };
  const bump = () => setRefreshKey(k => k + 1);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Spending
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cash flow, budgets, and category breakdown for the selected month.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size="small"
            onClick={handlePrev}
            disabled={monthIdx >= months.length - 1}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </IconButton>
          <TextField
            select
            size="small"
            value={month.ym}
            onChange={e => {
              const idx = months.findIndex(m => m.ym === e.target.value);
              if (idx >= 0) setMonthIdx(idx);
            }}
            sx={{ minWidth: 200 }}
            aria-label="Select month"
          >
            {months.map(m => (
              <MenuItem key={m.ym} value={m.ym}>{m.label}</MenuItem>
            ))}
          </TextField>
          <IconButton
            size="small"
            onClick={handleNext}
            disabled={monthIdx === 0}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Stack spacing={3}>
        <CashFlowSummaryCard userId={userId} refreshKey={refreshKey} />
        <MonthlySummaryCard
          userId={userId}
          from={month.fromIso}
          to={month.toIso}
          refreshKey={refreshKey}
          onRecomputed={bump}
        />
        <CategoryBreakdownChart
          userId={userId}
          from={month.fromIso}
          to={month.toIso}
          refreshKey={refreshKey}
        />
        <BudgetVsActualPanel
          userId={userId}
          from={month.fromIso}
          to={month.toIso}
          refreshKey={refreshKey}
          onChanged={bump}
        />
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TopMerchantsTable
            userId={userId}
            from={month.fromIso}
            to={month.toIso}
            refreshKey={refreshKey}
          />
          <RecentTransactionsTable
            userId={userId}
            from={month.fromIso}
            to={month.toIso}
            refreshKey={refreshKey}
          />
        </Box>
      </Stack>
    </Box>
  );
}

export default SpendingView;
