import React, { useMemo } from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';
import { useOnboarding } from '../onboarding/OnboardingContext';
import { Navigate } from 'react-router-dom';

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

  return (
    <Box data-testid="wave4-dashboard-root" p={3} display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard (Wave 4)</Typography>
        <Typography variant="body2" color="text.secondary">
          Incremental rebuild: sections are placeholders until data plumbing & intelligence services land.
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {sections.map(s => (
          <Grid key={s.id} item xs={12} md={s.id === 'overview' ? 12 : 6} lg={s.id === 'overview' ? 12 : 4}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="h6" gutterBottom>{s.title}</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{s.body}</Typography>
              <Divider />
              <Typography variant="caption" color="text.secondary">Wave 4 Placeholder</Typography>
            </Paper>
          </Grid>
        ))}
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
