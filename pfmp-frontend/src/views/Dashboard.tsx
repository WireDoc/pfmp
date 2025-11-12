import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Alert, Skeleton, Snackbar } from '@mui/material';
import Grid from '@mui/material/Grid';
import { OnboardingContext } from '../onboarding/OnboardingContext.shared';
import { Navigate } from 'react-router-dom';
import { useDevUserId } from '../dev/devUserState';
import { useDashboardData } from '../services/dashboard/useDashboardData';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { performanceMark, performanceMeasure } from '../hooks/usePerformanceMetric';
import { DataRefreshIndicator } from '../components/data/DataRefreshIndicator';
import { ErrorDisplay } from '../components/error/ErrorDisplay';
import { DashboardErrorBoundary } from '../components/error/DashboardErrorBoundary';
import { OfflineBanner } from '../components/offline/OfflineBanner';
import { OverviewPanel } from './dashboard/OverviewPanel';
import { AccountsPanel } from './dashboard/AccountsPanel';
import { InsightsPanel } from './dashboard/InsightsPanel';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { AdvicePanel } from './dashboard/AdvicePanel';
import { TasksPanel } from './dashboard/TasksPanel';
import { QuickStatsPanel } from './dashboard/QuickStatsPanel';
import PropertiesPanel from './dashboard/PropertiesPanel';
import LiabilitiesPanel from './dashboard/LiabilitiesPanel';
import TspPanel from './dashboard/TspPanel';
import { useAuth } from '../contexts/auth/useAuth';
import { getDashboardService, TASK_PRIORITY_TO_ENUM, DEFAULT_TASK_PRIORITY_ENUM } from '../services/dashboard';
import { ensureTspSnapshotFresh } from '../services/financialProfileApi';
import type {
  AdviceItem,
  AlertCard,
  DashboardData,
  TaskItem,
  CreateFollowUpTaskRequest,
  Insight,
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

function monotonicNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

// (Removed old sections placeholder list; replaced by dedicated panel components.)

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const devUserId = useDevUserId();
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
      ? 'Your financial profile is complete. Review insights and recommendations below.'
      : totalSteps > 0
        ? `You're making progress! Complete ${totalSteps - completedCount} more ${totalSteps - completedCount === 1 ? 'section' : 'sections'}${nextStepTitle ? ` (next: ${nextStepTitle})` : ''} to unlock personalized insights.`
        : 'Complete your financial profile to unlock personalized insights.'
    : 'Loading your financial profile…';
  const onboardingStatusText = onboardingHydrated
    ? onboardingComplete
      ? 'Profile complete'
      : totalSteps > 0
        ? `Profile ${completedCount}/${totalSteps} complete`
        : 'Profile incomplete'
    : 'Syncing profile…';
  const onboardingStatusColor = onboardingHydrated
    ? (onboardingComplete ? 'success.main' : 'warning.main')
    : 'text.secondary';

  const { data, loading, error, refetch } = useDashboardData();
  const [viewData, setViewData] = useState<DashboardData | null>(null);
  const [recentTaskIds, setRecentTaskIds] = useState<Set<number>>(new Set());
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const displayData = viewData ?? data ?? null;

  // Data refresh functionality
  const { lastRefreshed, isRefreshing, refresh, timeSinceRefresh } = useDataRefresh({
    refreshFn: refetch,
    autoRefresh: false, // TODO: Load from user settings when settings page is implemented
    refreshOnFocus: true, // TODO: Load from user settings when settings page is implemented
    isLoading: loading, // Track initial load to set timestamp
    storageKey: 'dashboard-last-refresh', // Persist timestamp across page reloads
  });

  // Offline detection
  const { isOffline, wasOffline } = useOfflineDetection();

  const logTelemetry = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[telemetry][dashboard]', event, payload);
    }
  }, []);

  useEffect(() => {
    // Performance: Mark component mount
    performanceMark('dashboard-mount');

    // Ensure daily TSP snapshot is captured for analytics. Backend is idempotent per user+day.
    // TODO(ops): Replace this on-load trigger with a server-side scheduled job (e.g., Hangfire/Quartz) and remove this effect.
    const uid = user?.localAccountId ? Number(user.localAccountId) : undefined;
    if (uid && Number.isFinite(uid)) {
      void ensureTspSnapshotFresh(uid);
    }
  // run only on first mount when user is known
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) {
      // Performance: Mark data loaded and measure time from mount
      performanceMark('dashboard-data-loaded');
      performanceMeasure('dashboard-time-to-data', 'dashboard-mount', 'dashboard-data-loaded');
      
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
      logTelemetry('alert_task_create_blocked', { reason: 'no-data', alertId: alert.alertId });
      return;
    }

    const existingFollowUpTask = baseline.tasks.find(task =>
      task.sourceAlertId === alert.alertId && task.title.startsWith('Follow up:'),
    );
    if (existingFollowUpTask) {
      setToastMessage(`Task already exists for “${alert.title}”`);
      logTelemetry('alert_task_create_duplicate', {
        alertId: alert.alertId,
        existingTaskId: existingFollowUpTask.taskId,
      });
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

    const attemptStartedAt = monotonicNow();
    logTelemetry('alert_task_create_attempt', {
      alertId: alert.alertId,
      severity: alert.severity,
      category: alert.category,
    });

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
      logTelemetry('alert_task_create_local_only', {
        alertId: alert.alertId,
        taskId: newTaskId,
      });
      return;
    }

    persistPromise
      .then(({ taskId }) => {
        const durationMs = Math.max(0, Math.round(monotonicNow() - attemptStartedAt));
        logTelemetry('alert_task_create_success', {
          alertId: alert.alertId,
          durationMs,
          taskId: taskId ?? newTaskId,
        });
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
          logTelemetry('alert_task_id_swap', {
            temporaryTaskId: newTaskId,
            persistedTaskId: taskId,
            alertId: alert.alertId,
          });
        }
        setToastMessage(`Created task “${alert.title}”`);
    })
    .catch(error => {
        const durationMs = Math.max(0, Math.round(monotonicNow() - attemptStartedAt));
        console.error('Failed to persist follow-up task', error);
        setToastMessage(`Couldn't save “${alert.title}”. Please try again.`);
        setRecentTaskIds(prevIds => {
          const next = new Set(prevIds);
          next.delete(newTaskId);
          return next;
        });
        logTelemetry('alert_task_create_failure', {
          alertId: alert.alertId,
          durationMs,
          error:
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'unknown',
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
  }, [data, viewData, severityToPriority, logTelemetry]);

  const handleTaskStatusChange = useCallback((taskId: number, nextStatus: TaskItem['status']) => {
    const service = getDashboardService();
    const baseline = (viewData ?? data) ?? null;
    if (!baseline) {
      setToastMessage('Dashboard data still loading — please try again in a moment.');
      logTelemetry('task_status_update_blocked', { taskId, reason: 'no-data' });
      return;
    }
    const existing = baseline.tasks.find(task => task.taskId === taskId);
    if (!existing) {
      setToastMessage('Task is no longer available.');
      logTelemetry('task_status_update_blocked', { taskId, reason: 'missing-task' });
      return;
    }
    if (existing.status === nextStatus) {
      logTelemetry('task_status_update_skipped', { taskId, status: nextStatus, reason: 'no-op' });
      return;
    }

    const canComplete = nextStatus === 'Completed' && service.completeTask;
    if (!canComplete && !service.updateTaskStatus) {
      setToastMessage('Task updates are unavailable in the current mode.');
      logTelemetry('task_status_update_blocked', { taskId, reason: 'no-service' });
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
      logTelemetry('task_status_update_blocked', { taskId, reason: 'missing-snapshot' });
      return;
    }

    const attemptStartedAt = monotonicNow();
    logTelemetry('task_status_update_attempt', {
      taskId,
      fromStatus: existing.status,
      toStatus: nextStatus,
    });

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
        logTelemetry('task_status_update_success', {
          taskId,
          toStatus: nextStatus,
          durationMs: Math.max(0, Math.round(monotonicNow() - attemptStartedAt)),
        });
      })
      .catch(error => {
        console.error('Failed to update dashboard task status', error);
        markTaskPending(taskId, false);
        restoreTaskSnapshot(taskId, snapshot);
        setToastMessage(`Couldn't update “${snapshot.title}”. Please try again.`);
        logTelemetry('task_status_update_failure', {
          taskId,
          toStatus: nextStatus,
          error:
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'unknown',
        });
      });
  }, [data, viewData, markTaskPending, restoreTaskSnapshot, updateTaskInState, logTelemetry]);

  const handleTaskProgressChange = useCallback((taskId: number, nextProgress: number) => {
    const service = getDashboardService();
    if (!service.updateTaskProgress) {
      setToastMessage('Task progress updates are unavailable in the current mode.');
      logTelemetry('task_progress_update_blocked', { taskId, reason: 'no-service' });
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
      logTelemetry('task_progress_update_blocked', { taskId, reason: 'missing-snapshot' });
      return;
    }

    markTaskPending(taskId, true);

    const attemptStartedAt = monotonicNow();
    logTelemetry('task_progress_update_attempt', {
      taskId,
      progress: clamped,
      derivedStatus,
    });

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
        logTelemetry('task_progress_update_success', {
          taskId,
          progress: clamped,
          durationMs: Math.max(0, Math.round(monotonicNow() - attemptStartedAt)),
        });
      })
      .catch(error => {
        console.error('Failed to update dashboard task progress', error);
        markTaskPending(taskId, false);
        restoreTaskSnapshot(taskId, snapshot);
        setToastMessage(`Couldn't update progress for “${snapshot.title}”. Please try again.`);
        logTelemetry('task_progress_update_failure', {
          taskId,
          progress: clamped,
          error:
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'unknown',
        });
      });
  }, [markTaskPending, restoreTaskSnapshot, updateTaskInState, logTelemetry]);

  const insightsPanelData = useMemo(() => {
    if (!displayData) {
      return displayData;
    }

    const obligations = displayData.longTermObligations;
    if (!obligations) {
      return displayData;
    }

    const extras: Insight[] = [];
    const generatedAt = new Date();
    const timestamp = generatedAt.toISOString();
    let formatCurrency = (value: number) => `$${value.toLocaleString()}`;

    const currencyCode = displayData.netWorth?.netWorth?.currency ?? 'USD';
    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      });
      formatCurrency = (value: number) => formatter.format(value);
    } catch {
      // fall back to basic formatting defined above if Intl.NumberFormat fails
    }

    if (obligations.count === 0) {
      extras.push({
        id: 'derived:obligations:capture',
        category: 'general',
        title: 'Capture your long-term obligations',
        body: 'Add mortgages, loans, and other commitments so the dashboard can project funding needs and reminders.',
        severity: 'info',
        generatedAt: timestamp,
      });
    } else {
      const pluralizedLabel = obligations.count === 1 ? 'obligation' : 'obligations';
      const totalEstimateLabel = obligations.totalEstimate > 0
        ? formatCurrency(Math.round(obligations.totalEstimate))
        : `your ${pluralizedLabel}`;

      const nextDueDate = obligations.nextDueDate ? new Date(obligations.nextDueDate) : null;
      const hasValidDueDate = nextDueDate && !Number.isNaN(nextDueDate.getTime());

      if (hasValidDueDate) {
        const now = generatedAt;
        const diffMs = (nextDueDate as Date).getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const dueLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          .format(nextDueDate as Date);

        let severity: Insight['severity'] = 'info';
        let title = 'Upcoming obligation milestone scheduled';
        let body = `Your next long-term obligation is scheduled for ${dueLabel}. Budgeting ${totalEstimateLabel} keeps those commitments funded.`;

        if (diffDays < 0) {
          severity = 'critical';
          title = 'Obligation milestone slipped';
          body = `An obligation milestone was due on ${dueLabel}. Allocate ${totalEstimateLabel} to catch up and update the plan once paid.`;
        } else if (diffDays === 0) {
          severity = 'warn';
          title = 'Obligation milestone due today';
          body = `One of your ${pluralizedLabel} is due today (${dueLabel}). Reserving ${totalEstimateLabel} keeps your plan on track.`;
        } else if (diffDays <= 45) {
          severity = 'warn';
          title = 'Obligation milestone coming up';
          body = `Your next long-term obligation hits in ${diffDays} days (${dueLabel}). Set aside ${totalEstimateLabel} so cash flow stays aligned.`;
        }

        extras.push({
          id: 'derived:obligations:next-due',
          category: 'cashflow',
          title,
          body,
          severity,
          generatedAt: timestamp,
        });
      } else {
        extras.push({
          id: 'derived:obligations:missing-due',
          category: 'general',
          title: 'Track obligation due dates',
          body: `Add the next milestone date for your ${pluralizedLabel} to unlock reminders and planning insights.`,
          severity: 'info',
          generatedAt: timestamp,
        });
      }

      if (obligations.totalEstimate > 0) {
        const averageEstimate = obligations.totalEstimate / obligations.count;
        if (Number.isFinite(averageEstimate) && averageEstimate > 0) {
          const averageLabel = formatCurrency(Math.round(averageEstimate));
          extras.push({
            id: 'derived:obligations:average-funding',
            category: 'savings',
            title: 'Budget for each obligation',
            body: `Plan on roughly ${averageLabel} per obligation based on the ${totalEstimateLabel} total you've captured.`,
            severity: 'info',
            generatedAt: timestamp,
          });
        }
      }
    }

    if (extras.length === 0) {
      return displayData;
    }

    return {
      ...displayData,
      insights: [...displayData.insights, ...extras],
    } satisfies DashboardData;
  }, [displayData]);

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
  const alerts = displayData?.alerts ?? [];
  const advice = displayData?.advice ?? [];
  const tasks = displayData?.tasks ?? [];
  
  // Separate TSP accounts from regular accounts
  const tspAccount = displayData?.accounts?.find(acc => acc.type === 'retirement' && acc.institution === 'TSP');
  const regularAccounts = displayData?.accounts?.filter(acc => !(acc.type === 'retirement' && acc.institution === 'TSP')) ?? [];

  return (
    <DashboardErrorBoundary onRetry={refetch}>
      <OfflineBanner isOffline={isOffline} wasOffline={wasOffline} />
      <Box data-testid="wave4-dashboard-root" p={3} display="flex" flexDirection="column" gap={3}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h4">Your Financial Dashboard</Typography>
            <DataRefreshIndicator
              lastRefreshed={lastRefreshed}
              isRefreshing={isRefreshing}
              onRefresh={refresh}
              timeSinceRefresh={timeSinceRefresh}
              isOffline={isOffline}
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Track your financial progress, act on personalized insights, and stay on top of your goals.
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
      {Boolean(error) && (
        <ErrorDisplay
          variant="banner"
          message="Failed to load dashboard data"
          description="There was an error loading your dashboard. Please try refreshing or contact support if the problem persists."
          onRetry={refetch}
        />
      )}
      <Grid container spacing={2}>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Overview</Typography>
            {loading ? <Skeleton variant="rectangular" height={60} /> : <OverviewPanel data={displayData} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>Quick glance</Typography>
            <QuickStatsPanel data={displayData} loading={loading} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Accounts</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : (
              <AccountsPanel 
                data={displayData ? { ...displayData, accounts: regularAccounts } : null} 
                loading={loading} 
                userId={devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1')} 
                onRefresh={refresh} 
              />
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <Skeleton variant="rectangular" height={200} /> : <TspPanel tspAccount={tspAccount} loading={loading} />}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Insights</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : <InsightsPanel data={insightsPanelData} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <Skeleton variant="rectangular" height={200} /> : <PropertiesPanel properties={displayData?.properties} loading={loading} />}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <Skeleton variant="rectangular" height={200} /> : <LiabilitiesPanel liabilities={displayData?.liabilities} loading={loading} />}
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
    </DashboardErrorBoundary>
  );
};

export default Dashboard;
