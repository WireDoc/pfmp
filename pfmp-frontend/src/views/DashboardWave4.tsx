import React from 'react';
import { Box, Typography, Grid, Paper, Divider, Skeleton, Alert } from '@mui/material';
import { useOnboarding } from '../onboarding/OnboardingContext';
import { Navigate } from 'react-router-dom';
import { useDashboardData } from '../services/dashboard/useDashboardData';

interface SectionDef { id: string; title: string; body: string; }

const sections: SectionDef[] = [
  { id: 'overview', title: 'Overview', body: 'High-level net worth, cash flow, allocation drift (coming soon).' },
  { id: 'accounts', title: 'Accounts', body: 'Connected accounts + balances + sync status (placeholder).' },
  { id: 'insights', title: 'Insights', body: 'AI / rules-based nudges & projections (future Wave 4+ modules).' },
];

export const DashboardWave4: React.FC = () => {
  let onboardingComplete = true;
  let hydrated = true;
  try {
    const ob = useOnboarding();
    hydrated = ob.hydrated;
    onboardingComplete = ob.completed.size >= ob.steps.length;
  } catch {
    // OnboardingProvider not mounted; treat as complete to avoid blocking dev usage.
  }

  if (!hydrated) {
    return <Box p={4}><Typography variant="body1">Preparing dashboard…</Typography></Box>;
  }
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data, loading, error } = useDashboardData();

  return (
    <Box data-testid="wave4-dashboard-root" p={3} display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard (Wave 4)</Typography>
        <Typography variant="body2" color="text.secondary">
          Incremental rebuild: sections are placeholders until data plumbing & intelligence services land.
        </Typography>
      </Box>
      {error && <Alert severity="error">Failed to load dashboard data</Alert>}
      <Grid container spacing={2}>
        {/* Overview */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Overview</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={60} />
            ) : data ? (
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Net Worth</Typography>
                  <Typography variant="h5">${data.netWorth.netWorth.amount.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Assets</Typography>
                  <Typography>${data.netWorth.totalAssets.amount.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Liabilities</Typography>
                  <Typography>${data.netWorth.totalLiabilities.amount.toLocaleString()}</Typography>
                </Box>
                {data.netWorth.change30dPct !== undefined && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">30d Change</Typography>
                    <Typography>{data.netWorth.change30dPct.toFixed(2)}%</Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography variant="body2">No data</Typography>
            )}
          </Paper>
        </Grid>
        {/* Accounts */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Accounts</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={120} />
            ) : data ? (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.accounts.map(a => (
                  <li key={a.id}>
                    <Typography variant="body2">
                      <strong>{a.name}</strong> – ${a.balance.amount.toLocaleString()} ({a.syncStatus})
                    </Typography>
                  </li>
                ))}
              </Box>
            ) : <Typography variant="body2">No accounts</Typography>}
          </Paper>
        </Grid>
        {/* Insights */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Insights</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={120} />
            ) : data ? (
              data.insights.length ? (
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {data.insights.map(i => (
                    <li key={i.id}>
                      <Typography variant="body2">
                        <strong>{i.title}</strong> – {i.body}
                      </Typography>
                    </li>
                  ))}
                </Box>
              ) : <Typography variant="body2">No insights</Typography>
            ) : <Typography variant="body2">No insights</Typography>}
          </Paper>
        </Grid>
      </Grid>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Development Notes</Typography>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
          <li>Route: /dashboard (flag: enableDashboardWave4)</li>
          <li>Redirects: Incomplete onboarding → /onboarding</li>
          <li>Future: data loaders, account aggregation, AI insights panel</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default DashboardWave4;
