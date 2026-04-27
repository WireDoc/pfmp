import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Paper, Alert, Skeleton, Snackbar, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';
import { OnboardingContext } from '../onboarding/OnboardingContext.shared';
import { Navigate, Link as RouterLink } from 'react-router-dom';
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
import { HealthScoreWidget } from '../components/dashboard/HealthScoreWidget';
import { CashFlowWidget } from '../components/dashboard/CashFlowWidget';
import { UpcomingObligationsWidget } from '../components/dashboard/UpcomingObligationsWidget';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { GoalProjectionsWidget } from '../components/dashboard/GoalProjectionsWidget';
import { AccountsPanel } from './dashboard/AccountsPanel';
import { InsightsPanel } from './dashboard/InsightsPanel';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { AdvicePanel } from './dashboard/AdvicePanel';
import { TasksPanel } from './dashboard/TasksPanel';
import { QuickStatsPanel } from './dashboard/QuickStatsPanel';
import PropertiesPanel from './dashboard/PropertiesPanel';
import LiabilitiesPanel from './dashboard/LiabilitiesPanel';
import TspPanel from './dashboard/TspPanel';
import CryptoSummaryCard from './dashboard/CryptoSummaryCard';
import { listExchangeConnections, syncExchangeConnection } from '../services/cryptoApi';
import { useAuth } from '../contexts/auth/useAuth';
import { getDashboardService } from '../services/dashboard';
import type {
  AdviceItem,
  AlertCard,
  DashboardData,
  TaskItem,
  Insight,
} from '../services/dashboard';
import type { OnboardingStepId } from '../onboarding/steps';
import { adviceService, alertsService } from '../services/api';

function monotonicNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const devUserId = useDevUserId();
  const onboarding = useContext(OnboardingContext);
  const completedSteps = onboarding?.completed ?? new Set<OnboardingStepId>();
  const onboardingSteps = onboarding?.steps ?? [];
  const totalSteps = onboardingSteps.length;
  const completedCount = completedSteps.size;
  const onboardingHydrated = onboarding?.hydrated ?? true;
  // Use the same "review completed" check as DashboardGuard/OnboardingGuard to determine
  // if the user should be on the dashboard. A stricter "all steps completed" check would
  // redirect users who have completed review but still have optional sections as needs_info,
  // creating an infinite redirect loop with OnboardingGuard (which redirects review-completed
  // users back to /dashboard).
  const reviewComplete = onboarding?.statuses?.review === 'completed';
  const onboardingComplete = reviewComplete;
  const nextStepTitle = onboardingSteps.find(step => !completedSteps.has(step.id))?.title ?? null;

  const stepsSummaryText = onboardingHydrated
    ? onboardingComplete
      ? 'Your financial profile is complete. Review insights and recommendations below.'
      : totalSteps > 0
        ? `You're making progress! Complete ${totalSteps - completedCount} more ${totalSteps - completedCount === 1 ? 'section' : 'sections'}${nextStepTitle ? ` (next: ${nextStepTitle})` : ''} to unlock personalized insights.`
        : 'Complete your financial profile to unlock personalized insights.'
    : 'Loading your financial profile\u2026';
  const onboardingStatusText = onboardingHydrated
    ? onboardingComplete
      ? 'Profile complete'
      : totalSteps > 0
        ? `Profile ${completedCount}/${totalSteps} complete`
        : 'Profile incomplete'
    : 'Syncing profile\u2026';
  const onboardingStatusColor = onboardingHydrated
    ? (onboardingComplete ? 'success.main' : 'warning.main')
    : 'text.secondary';

  const { data, loading, error, refetch } = useDashboardData();
  const [viewData, setViewData] = useState<DashboardData | null>(null);
  const [recentTaskIds, setRecentTaskIds] = useState<Set<number>>(new Set());
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
  const [generatingAdviceForAlertId, setGeneratingAdviceForAlertId] = useState<number | null>(null);
  const [pendingAdviceId, setPendingAdviceId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const displayData = viewData ?? data ?? null;
  const displayName = viewData?.userName ?? data?.userName ?? user?.name ?? user?.username ?? 'Client';

  // Data refresh functionality
  const { lastRefreshed, isRefreshing, refresh, timeSinceRefresh } = useDataRefresh({
    refreshFn: refetch,
    autoRefresh: false,
    refreshOnFocus: true,
    isLoading: loading,
    storageKey: 'dashboard-last-refresh',
  });

  // Offline detection
  const { isOffline, wasOffline } = useOfflineDetection();

  const logTelemetry = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[telemetry][dashboard]', event, payload);
    }
  }, []);

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';
  const hasRefreshedPrices = useRef(false);
  const hasSyncedCrypto = useRef(false);
  const [cryptoRefreshKey, setCryptoRefreshKey] = useState(0);

  useEffect(() => {
    performanceMark('dashboard-mount');
  }, []);

  // Auto-refresh prices for investment accounts when dashboard data loads
  useEffect(() => {
    if (!data || hasRefreshedPrices.current) return;
    hasRefreshedPrices.current = true;

    const investmentTypes = ['brokerage', 'retirement', 'other'];
    const investmentAccounts = data.accounts.filter(a =>
      investmentTypes.some(t => a.type === t) && !a.isCashAccount
      && typeof a.id === 'number'
    );

    for (const acct of investmentAccounts) {
      fetch(`${apiBase}/holdings/refresh-prices?accountId=${acct.id}`, { method: 'POST' })
        .then(() => console.debug(`[dashboard] Refreshed prices for account ${acct.id}`))
        .catch(err => console.warn(`[dashboard] Price refresh failed for account ${acct.id}`, err));
    }
  }, [data, apiBase]);

  // Wave 13: refresh crypto prices on the same triggers as Investment Accounts (mount).
  // Each connection sync is fire-and-forget; the SummaryCard re-fetches via `cryptoRefreshKey`.
  const userIdForRefresh = devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');
  useEffect(() => {
    if (!data || hasSyncedCrypto.current) return;
    hasSyncedCrypto.current = true;
    let cancelled = false;
    listExchangeConnections(userIdForRefresh)
      .then(async connections => {
        if (cancelled || !connections?.length) return;
        await Promise.all(
          connections
            .filter(c => c.status === 'Active')
            .map(c =>
              syncExchangeConnection(userIdForRefresh, c.exchangeConnectionId)
                .catch(err => console.warn(`[dashboard] Crypto sync failed for connection ${c.exchangeConnectionId}`, err)),
            ),
        );
        if (!cancelled) setCryptoRefreshKey(k => k + 1);
      })
      .catch(err => console.warn('[dashboard] Crypto connections fetch failed', err));
    return () => { cancelled = true; };
  }, [data, userIdForRefresh]);

  useEffect(() => {
    if (data) {
      performanceMark('dashboard-data-loaded');
      performanceMeasure('dashboard-time-to-data', 'dashboard-mount', 'dashboard-data-loaded');
      setViewData(data);
      setRecentTaskIds(new Set());
    }
  }, [data]);

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

  // -- Alert -> Generate Advice ------------------------------------------------
  const handleGenerateAdvice = useCallback(async (alert: AlertCard) => {
    setGeneratingAdviceForAlertId(alert.alertId);
    logTelemetry('advice_generate_attempt', { alertId: alert.alertId });

    try {
      const response = await adviceService.generateFromAlert(alert.alertId);
      const newAdvice: AdviceItem = {
        adviceId: response.data.adviceId,
        userId: response.data.userId,
        theme: response.data.theme ?? 'General',
        status: response.data.status as AdviceItem['status'],
        consensusText: response.data.consensusText,
        confidenceScore: response.data.confidenceScore,
        sourceAlertId: alert.alertId,
        linkedTaskId: response.data.linkedTaskId ?? null,
        createdAt: response.data.createdAt,
      };

      setViewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          advice: [newAdvice, ...prev.advice],
          alerts: prev.alerts.map(a =>
            a.alertId === alert.alertId ? { ...a, isRead: true } : a,
          ),
        } satisfies DashboardData;
      });
      setToastMessage('AI advice generated \u2014 review it in the Advice panel.');
      logTelemetry('advice_generate_success', { alertId: alert.alertId, adviceId: newAdvice.adviceId });
    } catch (error) {
      console.error('Failed to generate advice', error);
      setToastMessage("Couldn't generate advice. Please try again.");
      logTelemetry('advice_generate_failure', {
        alertId: alert.alertId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    } finally {
      setGeneratingAdviceForAlertId(null);
    }
  }, [logTelemetry]);

  // -- Alert -> Mark as read ---------------------------------------------------
  const handleMarkAlertAsRead = useCallback(async (alertId: number) => {
    try {
      await alertsService.markAsRead(alertId);
      setViewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.map(a =>
            a.alertId === alertId ? { ...a, isRead: true } : a,
          ),
        } satisfies DashboardData;
      });
      setToastMessage('Alert marked as read');
      logTelemetry('alert_mark_read', { alertId });
    } catch {
      setToastMessage('Failed to mark alert as read');
    }
  }, [logTelemetry]);

  // -- Alert -> Dismiss --------------------------------------------------------
  const handleDismissAlert = useCallback(async (alertId: number) => {
    try {
      await alertsService.dismiss(alertId);
      setViewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.map(a =>
            a.alertId === alertId ? { ...a, isDismissed: true, isRead: true } : a,
          ),
        } satisfies DashboardData;
      });
      setToastMessage('Alert dismissed');
      logTelemetry('alert_dismiss', { alertId });
    } catch {
      setToastMessage('Failed to dismiss alert');
    }
  }, [logTelemetry]);

  // -- Advice -> Accept (auto-creates linked Task) -----------------------------
  const handleAcceptAdvice = useCallback(async (adviceId: number) => {
    setPendingAdviceId(adviceId);
    logTelemetry('advice_accept_attempt', { adviceId });

    try {
      const response = await adviceService.accept(adviceId);
      const accepted = response.data;

      setViewData(prev => {
        if (!prev) return prev;

        const updatedAdvice = prev.advice.map(item =>
          item.adviceId === adviceId
            ? { ...item, status: 'Accepted' as AdviceItem['status'], linkedTaskId: accepted.linkedTaskId ?? null }
            : item,
        );

        const newTasks = [...prev.tasks];
        if (accepted.linkedTaskId) {
          const alreadyExists = prev.tasks.some(t => t.taskId === accepted.linkedTaskId);
          if (!alreadyExists) {
            newTasks.unshift({
              taskId: accepted.linkedTaskId,
              userId: accepted.userId,
              type: accepted.theme ?? 'General',
              title: `${accepted.theme ?? 'General'} Action`,
              description: accepted.consensusText.slice(0, 200),
              priority: 'Medium',
              status: 'Pending',
              createdDate: new Date().toISOString(),
              dueDate: null,
              sourceAdviceId: adviceId,
              sourceAlertId: accepted.sourceAlertId ?? null,
              progressPercentage: 0,
              confidenceScore: accepted.confidenceScore,
            });
          }
        }

        return { ...prev, advice: updatedAdvice, tasks: newTasks } satisfies DashboardData;
      });

      if (accepted.linkedTaskId) {
        setRecentTaskIds(prev => { const next = new Set(prev); next.add(accepted.linkedTaskId!); return next; });
      }
      setToastMessage('Advice accepted \u2014 task created.');
      logTelemetry('advice_accept_success', { adviceId, linkedTaskId: accepted.linkedTaskId });
    } catch (error) {
      console.error('Failed to accept advice', error);
      setToastMessage("Couldn't accept advice. Please try again.");
      logTelemetry('advice_accept_failure', {
        adviceId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    } finally {
      setPendingAdviceId(null);
    }
  }, [logTelemetry]);

  // -- Advice -> Dismiss -------------------------------------------------------
  const handleDismissAdvice = useCallback(async (adviceId: number) => {
    setPendingAdviceId(adviceId);
    logTelemetry('advice_dismiss_attempt', { adviceId });

    try {
      await adviceService.dismiss(adviceId);

      setViewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          advice: prev.advice.map(item =>
            item.adviceId === adviceId
              ? { ...item, status: 'Dismissed' as AdviceItem['status'] }
              : item,
          ),
        } satisfies DashboardData;
      });
      setToastMessage('Advice dismissed.');
      logTelemetry('advice_dismiss_success', { adviceId });
    } catch (error) {
      console.error('Failed to dismiss advice', error);
      setToastMessage("Couldn't dismiss advice. Please try again.");
      logTelemetry('advice_dismiss_failure', {
        adviceId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    } finally {
      setPendingAdviceId(null);
    }
  }, [logTelemetry]);

  const handleTaskStatusChange = useCallback((taskId: number, nextStatus: TaskItem['status']) => {
    const service = getDashboardService();
    const baseline = (viewData ?? data) ?? null;
    if (!baseline) {
      setToastMessage('Dashboard data still loading \u2014 please try again in a moment.');
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
        setToastMessage(`Updated "${snapshot.title}"`);
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
        setToastMessage(`Couldn't update "${snapshot.title}". Please try again.`);
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
        setToastMessage(`Updated progress for "${snapshot.title}"`);
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
        setToastMessage(`Couldn't update progress for "${snapshot.title}". Please try again.`);
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
          <Typography variant="body1" gutterBottom>Preparing your dashboard\u2026</Typography>
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
            {loading ? <Skeleton variant="rectangular" height={60} /> : <OverviewPanel data={displayData} loading={loading} userId={devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1')} />}
          </Paper>
        </Grid>
        <Grid size={12}>
          <QuickActionsBar />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <HealthScoreWidget />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CashFlowWidget />
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
          <Stack spacing={2}>
            {loading ? <Skeleton variant="rectangular" height={200} /> : (
              <CryptoSummaryCard
                userId={devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1')}
                refreshKey={cryptoRefreshKey}
              />
            )}
            {loading ? <Skeleton variant="rectangular" height={200} /> : <TspPanel tspAccount={tspAccount} loading={loading} />}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" gutterBottom>Insights</Typography>
            {loading ? <Skeleton variant="rectangular" height={120} /> : <InsightsPanel data={insightsPanelData} loading={loading} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <Skeleton variant="rectangular" height={200} /> : <PropertiesPanel properties={displayData?.properties} loading={loading} userId={devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1')} onRefresh={refresh} />}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <Skeleton variant="rectangular" height={200} /> : <LiabilitiesPanel liabilities={displayData?.liabilities} loading={loading} />}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <UpcomingObligationsWidget />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GoalProjectionsWidget />
        </Grid>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>Alerts</Typography>
              <Typography variant="body2" component={RouterLink} to="/dashboard/actions?tab=alerts" sx={{ textDecoration: 'none', color: 'primary.main' }}>View all &rarr;</Typography>
            </Box>
            {loading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              <AlertsPanel
                alerts={alerts}
                loading={loading}
                advice={advice}
                generatingAdviceForAlertId={generatingAdviceForAlertId}
                onGenerateAdvice={handleGenerateAdvice}
                onMarkAsRead={handleMarkAlertAsRead}
                onDismiss={handleDismissAlert}
              />
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>Advice</Typography>
              <Typography variant="body2" component={RouterLink} to="/dashboard/actions?tab=advice" sx={{ textDecoration: 'none', color: 'primary.main' }}>View all &rarr;</Typography>
            </Box>
            {loading ? <Skeleton variant="rectangular" height={140} /> : (
              <AdvicePanel
                advice={advice}
                loading={loading}
                pendingAdviceId={pendingAdviceId}
                onAccept={handleAcceptAdvice}
                onDismiss={handleDismissAdvice}
              />
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>Tasks</Typography>
              <Typography variant="body2" component={RouterLink} to="/dashboard/actions?tab=tasks" sx={{ textDecoration: 'none', color: 'primary.main' }}>View all &rarr;</Typography>
            </Box>
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
