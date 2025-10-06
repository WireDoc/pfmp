import React from 'react';
import { Box, Typography, Grid, Paper, Alert, Skeleton } from '@mui/material';
import { useOnboarding } from '../onboarding/OnboardingContext';
import { Navigate } from 'react-router-dom';
import { useDashboardData } from '../services/dashboard/useDashboardData';
import { OverviewPanel } from './dashboard/OverviewPanel';
import { AccountsPanel } from './dashboard/AccountsPanel';
import { InsightsPanel } from './dashboard/InsightsPanel';
import { useAuth } from '../contexts/auth/useAuth';

// (Removed old sections placeholder list; replaced by dedicated panel components.)

export const DashboardWave4: React.FC = () => {
  const { user } = useAuth();
  let onboardingComplete = true;
  let hydrated = true;
  let completedCount = 0;
  let totalSteps = 0;
  let nextStepTitle: string | null = null;
  try {
    const ob = useOnboarding();
    hydrated = ob.hydrated;
    onboardingComplete = ob.completed.size >= ob.steps.length;
    completedCount = ob.completed.size;
    totalSteps = ob.steps.length;
    const pendingStep = ob.steps.find(step => !ob.completed.has(step.id));
    nextStepTitle = pendingStep?.title ?? null;
  } catch {
    // OnboardingProvider not mounted; treat as complete to avoid blocking dev usage.
  }

  if (!hydrated) {
    return <Box p={4}><Typography variant="body1">Preparing dashboard…</Typography></Box>;
  }
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  const hasProgressMetrics = totalSteps > 0;
  const completionPercent = hasProgressMetrics ? Math.round((completedCount / totalSteps) * 100) : 100;
  const stepsSummaryText = hasProgressMetrics
    ? `${completionPercent}% of onboarding steps complete (${completedCount}/${totalSteps}).`
    : 'Onboarding summary unavailable in this context.';
  const onboardingStatusText = hasProgressMetrics
    ? (onboardingComplete
      ? `Onboarding complete (${completedCount}/${totalSteps} steps).`
      : `Onboarding ${completedCount}/${totalSteps} complete — next up: ${nextStepTitle ?? 'Continue onboarding'}.`)
    : 'Onboarding provider not attached; dashboard unlocked for development.';
  const onboardingStatusColor = hasProgressMetrics ? (onboardingComplete ? 'success.main' : 'warning.main') : 'text.secondary';
  const displayName = user?.name ?? user?.username ?? 'PFMP Member';

  const { data, loading, error } = useDashboardData();

  return (
    <Box data-testid="wave4-dashboard-root" p={3} display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard (Wave 4)</Typography>
        <Typography variant="body2" color="text.secondary">
          Incremental rebuild: sections are placeholders until data plumbing & intelligence services land.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>Welcome back, {displayName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {stepsSummaryText}
          </Typography>
        </Box>
        <Box sx={{ marginLeft: { md: 'auto' } }}>
          <Typography variant="body2" sx={{ color: onboardingStatusColor, fontWeight: 600 }} data-testid="onboarding-summary-text">
            {onboardingStatusText}
          </Typography>
        </Box>
      </Paper>
      {Boolean(error) && <Alert severity="error">Failed to load dashboard data</Alert>}
      <Grid container spacing={2}>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Overview</Typography>
            {loading ? <Skeleton variant="rectangular" height={60} /> : <OverviewPanel data={data} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Accounts</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : <AccountsPanel data={data} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Insights</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : <InsightsPanel data={data} loading={loading} />}
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
