import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Alert, Skeleton, Snackbar } from '@mui/material';
import Grid from '@mui/material/Grid';
import { OnboardingContext } from '../onboarding/OnboardingContext.shared';
import { Navigate } from 'react-router-dom';
import { useDashboardData } from '../services/dashboard/useDashboardData';
import { OverviewPanel } from './dashboard/OverviewPanel';
import { AccountsPanel } from './dashboard/AccountsPanel';
import { InsightsPanel } from './dashboard/InsightsPanel';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { AdvicePanel } from './dashboard/AdvicePanel';
import { TasksPanel } from './dashboard/TasksPanel';
import { useAuth } from '../contexts/auth/useAuth';
import { getDashboardService, TASK_PRIORITY_TO_ENUM, DEFAULT_TASK_PRIORITY_ENUM } from '../services/dashboard';
import type {
  AdviceItem,
  AlertCard,
  DashboardData,
  TaskItem,
  CreateFollowUpTaskRequest,
} from '../services/dashboard';
import type { OnboardingStepId } from '../onboarding/steps';

function resolveTaskTypeFromCategory(category: AlertCard['category']): number {
  const normalized = `${category ?? ''}`.toLowerCase();
  if (normalized.includes('portfolio') || normalized.includes('equity') || normalized.includes('allocation')) {
    return 1; // Rebalancing
  }
  if (normalized.includes('cash') || normalized.includes('bank')) {
    return 4; // CashOptimization
  }
  if (normalized.includes('tax')) {
    return 3; // TaxLossHarvesting
  }
  if (normalized.includes('insurance')) {
    return 6; // InsuranceReview
  }
  if (normalized.includes('emergency')) {
    return 7; // EmergencyFundContribution
  }
  return 5; // GoalAdjustment as a sensible default
}

// (Removed old sections placeholder list; replaced by dedicated panel components.)

export const DashboardWave4: React.FC = () => {
  const { user } = useAuth();
  const onboarding = useContext(OnboardingContext);
  const completedSteps = onboarding?.completed ?? new Set<OnboardingStepId>();
  const onboardingSteps = onboarding?.steps ?? [];
  const totalSteps = onboardingSteps.length;
  const completedCount = completedSteps.size;
  const onboardingHydrated = onboarding?.hydrated ?? true;
  const onboardingComplete = onboarding ? completedCount >= totalSteps : true;
  const nextStepTitle = onboardingSteps.find(step => !completedSteps.has(step.id))?.title ?? null;

  const displayName = user?.name ?? user?.username ?? 'Client';
  const stepsSummaryText = onboardingHydrated
    ? onboardingComplete
      ? 'Onboarding complete. Great job staying on track.'
      : totalSteps > 0
        ? `Onboarding ${completedCount} of ${totalSteps} steps complete${nextStepTitle ? ` — next: ${nextStepTitle}` : ''}.`
        : 'Onboarding setup is still in progress.'
    : 'Checking onboarding progress…';
  const onboardingStatusText = onboardingHydrated
    ? onboardingComplete
      ? 'Onboarding complete'
      : totalSteps > 0
        ? `Onboarding in progress (${completedCount}/${totalSteps})`
        : 'Onboarding status unavailable'
    : 'Syncing onboarding status…';
  const onboardingStatusColor = onboardingHydrated
    ? (onboardingComplete ? 'success.main' : 'warning.main')
    : 'text.secondary';

  const { data, loading, error } = useDashboardData();
  const [viewData, setViewData] = useState<DashboardData | null>(null);
  const [recentTaskIds, setRecentTaskIds] = useState<Set<number>>(new Set());
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
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

  const markTaskPending = useCallback((taskId: number, pending: boolean) => {
    setPendingTaskIds(prev => {
      const next = new Set(prev);
      if (pending) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }, []);

  const updateTaskInState = useCallback((taskId: number, mutator: (task: TaskItem) => TaskItem) => {
    const baseline = (viewData ?? data) ?? null;
    if (!baseline) {
      return null;
    }
    const target = baseline.tasks.find(task => task.taskId === taskId);
    if (!target) {
      return null;
    }
    const snapshot = { ...target };
    setViewData(prev => {
      const source = prev ?? baseline;
      if (!source) {
        return prev;
      }
      return {
        ...source,
        tasks: source.tasks.map(task => (
          task.taskId === taskId ? mutator({ ...task }) : task
        )),
      } satisfies DashboardData;
    });
    return snapshot;
  }, [viewData, data]);

  const restoreTaskSnapshot = useCallback((taskId: number, snapshot: TaskItem) => {
    const baseline = (viewData ?? data) ?? null;
    if (!baseline) {
      return;
    }
    setViewData(prev => {
      const source = prev ?? baseline;
      if (!source) {
        return prev;
      }
      return {
        ...source,
        tasks: source.tasks.map(task => (
          task.taskId === taskId ? { ...snapshot } : task
        )),
      } satisfies DashboardData;
    });
  }, [viewData, data]);

  const handleCreateTaskFromAlert = useCallback((alert: AlertCard) => {
    const baseline = viewData ?? data ?? null;
    if (!baseline) {
      setToastMessage('Dashboard data still loading — please try again in a moment.');
      return;
    }

    const existingFollowUpTask = baseline.tasks.find(task =>
      task.sourceAlertId === alert.alertId && task.title.startsWith('Follow up:'),
    );
    if (existingFollowUpTask) {
      setToastMessage(`Task already exists for “${alert.title}”`);
      return;
    }

    const newTaskId = Date.now();
    const createdAt = new Date().toISOString();
    const priority = severityToPriority[alert.severity] ?? 'Medium';
    const newTask: TaskItem = {
      taskId: newTaskId,
      userId: alert.userId,
      type: 'FollowUp',
      title: `Follow up: ${alert.title}`,
      description: alert.message,
      priority,
      status: 'Pending',
      createdDate: createdAt,
      dueDate: null,
      sourceAdviceId: null,
      sourceAlertId: alert.alertId,
      progressPercentage: 0,
      confidenceScore: alert.portfolioImpactScore ?? null,
    };

    const originalAlertSnapshot = baseline.alerts.find(a => a.alertId === alert.alertId);
    const adviceSnapshots = new Map<number, AdviceItem>();
    baseline.advice.forEach(item => {
      if (item.sourceAlertId === alert.alertId) {
        adviceSnapshots.set(item.adviceId, { ...item });
      }
    });

    setViewData(prev => {
      if (!prev) {
        return prev;
      }
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

    setRecentTaskIds(prevIds => {
      const next = new Set(prevIds);
      next.add(newTaskId);
      return next;
    });
    setToastMessage('Creating follow-up task…');

    const service = getDashboardService();
    const requestPayload: CreateFollowUpTaskRequest = {
      userId: alert.userId,
      type: resolveTaskTypeFromCategory(alert.category),
      title: newTask.title,
      description: newTask.description,
  priority: TASK_PRIORITY_TO_ENUM[priority] ?? DEFAULT_TASK_PRIORITY_ENUM,
      dueDate: null,
      sourceAlertId: alert.alertId,
      confidenceScore: alert.portfolioImpactScore ?? null,
    };

    const persistPromise = service.createFollowUpTask?.(requestPayload);

    if (!persistPromise) {
      setToastMessage(`Created task “${alert.title}”`);
      return;
    }

    persistPromise
      .then(({ taskId }) => {
  if (taskId && taskId !== newTaskId) {
          setViewData(prev => {
            if (!prev) {
              return prev;
            }
            return {
              ...prev,
              advice: prev.advice.map(item =>
                item.sourceAlertId === alert.alertId
                  ? { ...item, linkedTaskId: taskId }
                  : item,
              ),
              tasks: prev.tasks.map(task =>
                task.taskId === newTaskId
                  ? { ...task, taskId }
                  : task,
              ),
            } satisfies DashboardData;
          });
          setRecentTaskIds(prevIds => {
            const next = new Set(prevIds);
            next.delete(newTaskId);
            next.add(taskId);
            return next;
          });
        }
        setToastMessage(`Created task “${alert.title}”`);
      })
  .catch(error => {
        console.error('Failed to persist follow-up task', error);
        setToastMessage(`Couldn't save “${alert.title}”. Please try again.`);
        setRecentTaskIds(prevIds => {
          const next = new Set(prevIds);
          next.delete(newTaskId);
          return next;
        });
        setViewData(prev => {
          if (!prev) {
            return prev;
          }
          const revertedAlerts = prev.alerts.map(a => {
            if (a.alertId !== alert.alertId) {
              return a;
            }
            return originalAlertSnapshot ? { ...originalAlertSnapshot } : { ...a, isActionable: true };
          });
          const revertedAdvice = prev.advice.map(item => {
            const snapshot = adviceSnapshots.get(item.adviceId);
            return snapshot ? { ...snapshot } : item;
          });
          return {
            ...prev,
            alerts: revertedAlerts,
            advice: revertedAdvice,
            tasks: prev.tasks.filter(task => task.taskId !== newTaskId),
          } satisfies DashboardData;
        });
      });
  }, [data, viewData, severityToPriority]);

  const handleTaskStatusChange = useCallback((taskId: number, nextStatus: TaskItem['status']) => {
    const service = getDashboardService();
    const baseline = (viewData ?? data) ?? null;
    if (!baseline) {
      setToastMessage('Dashboard data still loading — please try again in a moment.');
      return;
    }
    const existing = baseline.tasks.find(task => task.taskId === taskId);
    if (!existing) {
      setToastMessage('Task is no longer available.');
      return;
    }
    if (existing.status === nextStatus) {
      return;
    }

    const canComplete = nextStatus === 'Completed' && service.completeTask;
    if (!canComplete && !service.updateTaskStatus) {
      setToastMessage('Task updates are unavailable in the current mode.');
      return;
    }

    const snapshot = updateTaskInState(taskId, task => ({
      ...task,
      status: nextStatus,
      progressPercentage: nextStatus === 'Completed'
        ? 100
        : nextStatus === 'Pending'
          ? 0
          : task.progressPercentage ?? 0,
    }));

    if (!snapshot) {
      setToastMessage('Task is no longer available.');
      return;
    }

    markTaskPending(taskId, true);

    const persistPromise = nextStatus === 'Completed' && service.completeTask
      ? service.completeTask({ taskId })
      : service.updateTaskStatus?.({ taskId, status: nextStatus }) ?? Promise.resolve();

    persistPromise
      .then(() => {
        markTaskPending(taskId, false);
        if (nextStatus === 'Completed' || nextStatus === 'Dismissed') {
          setRecentTaskIds(prevIds => {
            const next = new Set(prevIds);
            next.delete(taskId);
            return next;
          });
        }
        setToastMessage(`Updated “${snapshot.title}”`);
      })
      .catch(error => {
        console.error('Failed to update dashboard task status', error);
        markTaskPending(taskId, false);
        restoreTaskSnapshot(taskId, snapshot);
        setToastMessage(`Couldn't update “${snapshot.title}”. Please try again.`);
      });
  }, [data, viewData, markTaskPending, restoreTaskSnapshot, updateTaskInState]);

  const handleTaskProgressChange = useCallback((taskId: number, nextProgress: number) => {
    const service = getDashboardService();
    if (!service.updateTaskProgress) {
      setToastMessage('Task progress updates are unavailable in the current mode.');
      return;
    }

    const clamped = Math.max(0, Math.min(100, Math.round(nextProgress)));
    const derivedStatus: TaskItem['status'] = clamped >= 100
      ? 'Completed'
      : clamped > 0
        ? 'InProgress'
        : 'Pending';

    const snapshot = updateTaskInState(taskId, task => ({
      ...task,
      progressPercentage: clamped,
      status: derivedStatus,
    }));

    if (!snapshot) {
      setToastMessage('Task is no longer available.');
      return;
    }

    markTaskPending(taskId, true);

    service.updateTaskProgress({ taskId, progressPercentage: clamped })
      .then(() => {
        markTaskPending(taskId, false);
        if (derivedStatus === 'Completed') {
          setRecentTaskIds(prevIds => {
            const next = new Set(prevIds);
            next.delete(taskId);
            return next;
          });
        }
        setToastMessage(`Updated progress for “${snapshot.title}”`);
      })
      .catch(error => {
        console.error('Failed to update dashboard task progress', error);
        markTaskPending(taskId, false);
        restoreTaskSnapshot(taskId, snapshot);
        setToastMessage(`Couldn't update progress for “${snapshot.title}”. Please try again.`);
      });
  }, [markTaskPending, restoreTaskSnapshot, updateTaskInState]);

  if (!onboardingHydrated) {
    return (
      <Box data-testid="wave4-dashboard-root" p={3} display="flex" flexDirection="column" gap={3}>
        <Typography variant="h4" gutterBottom>Dashboard (Wave 4)</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body1" gutterBottom>Preparing your dashboard…</Typography>
          <Skeleton variant="rounded" height={120} />
        </Paper>
      </Box>
    );
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

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
            {loading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              <TasksPanel
                tasks={tasks}
                loading={loading}
                recentTaskIds={recentTaskIds}
                pendingTaskIds={pendingTaskIds}
                onUpdateStatus={handleTaskStatusChange}
                onUpdateProgress={handleTaskProgressChange}
              />
            )}
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
