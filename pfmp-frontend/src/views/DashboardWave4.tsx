import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Alert, Skeleton, Snackbar } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useOnboarding } from '../onboarding/OnboardingContext';
import { Navigate } from 'react-router-dom';
import { useDashboardData } from '../services/dashboard/useDashboardData';
import { OverviewPanel } from './dashboard/OverviewPanel';
import { AccountsPanel } from './dashboard/AccountsPanel';
import { InsightsPanel } from './dashboard/InsightsPanel';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { AdvicePanel } from './dashboard/AdvicePanel';
import { TasksPanel } from './dashboard/TasksPanel';
import { useAuth } from '../contexts/auth/useAuth';
import type { AlertCard, DashboardData, TaskItem } from '../services/dashboard';

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
  const [viewData, setViewData] = useState<DashboardData | null>(null);
  const [recentTaskIds, setRecentTaskIds] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setViewData(data);
      setRecentTaskIds(new Set());
    }
  }, [data]);

  const severityToPriority = useMemo(() => ({
    Low: 'Low',
    Medium: 'Medium',
    High: 'High',
    Critical: 'High',
  } satisfies Record<AlertCard['severity'], TaskItem['priority']>), []);

  const handleCreateTaskFromAlert = useCallback((alert: AlertCard) => {
    setViewData(prev => {
      if (!prev) {
        setToastMessage('Dashboard data still loading — please try again in a moment.');
        return prev;
      }

      const existingFollowUpTask = prev.tasks.find(task =>
        task.sourceAlertId === alert.alertId && task.title.startsWith('Follow up:'),
      );
      if (existingFollowUpTask) {
        setToastMessage(`Task already exists for “${alert.title}”`);
        return prev;
      }

      const newTaskId = Date.now();
      const createdAt = new Date().toISOString();
      const newTask: TaskItem = {
        taskId: newTaskId,
        userId: alert.userId,
        type: 'FollowUp',
        title: `Follow up: ${alert.title}`,
        description: alert.message,
        priority: severityToPriority[alert.severity] ?? 'Medium',
        status: 'Pending',
        createdDate: createdAt,
        dueDate: null,
        sourceAdviceId: null,
        sourceAlertId: alert.alertId,
        progressPercentage: 0,
        confidenceScore: alert.portfolioImpactScore ?? null,
      };

      setRecentTaskIds(prevIds => {
        const next = new Set(prevIds);
        next.add(newTaskId);
        return next;
      });
      setToastMessage(`Created task “${alert.title}”`);

      const updatedAdvice = prev.advice.map(item =>
        item.sourceAlertId === alert.alertId
          ? {
              ...item,
              linkedTaskId: newTaskId,
              status: item.status === 'Proposed' ? 'Accepted' : item.status,
            }
          : item,
      );

      return {
        ...prev,
        alerts: prev.alerts.map(a =>
          a.alertId === alert.alertId
            ? { ...a, isActionable: false, isRead: true }
            : a,
        ),
        advice: updatedAdvice,
        tasks: [newTask, ...prev.tasks],
      } satisfies DashboardData;
    });
  }, [severityToPriority, setRecentTaskIds, setToastMessage]);

  const displayData = viewData ?? data ?? null;
  const alerts = displayData?.alerts ?? [];
  const advice = displayData?.advice ?? [];
  const tasks = displayData?.tasks ?? [];

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
            {loading ? <Skeleton variant="rectangular" height={60} /> : <OverviewPanel data={displayData} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Accounts</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : <AccountsPanel data={displayData} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Insights</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : <InsightsPanel data={displayData} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Alerts</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              <AlertsPanel alerts={alerts} loading={loading} onCreateTask={handleCreateTaskFromAlert} />
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Advice</Typography>
            {loading ? <Skeleton variant="rectangular" height={140} /> : <AdvicePanel advice={advice} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Tasks</Typography>
            {loading ? <Skeleton variant="rectangular" height={140} /> : <TasksPanel tasks={tasks} loading={loading} recentTaskIds={recentTaskIds} />}
          </Paper>
        </Grid>
      </Grid>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Development Notes</Typography>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
          <li>Route: /dashboard (flag: enableDashboardWave4)</li>
          <li>Redirects: Incomplete onboarding → /onboarding</li>
          <li>Future: live account aggregation, richer alert → task flows, AI insights</li>
        </ul>
      </Paper>
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToastMessage(null)} sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardWave4;
