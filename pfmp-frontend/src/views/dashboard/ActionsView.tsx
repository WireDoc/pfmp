import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert as MuiAlert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  TaskAlt as TaskIcon,
  WarningAmberRounded as WarningIcon,
  ErrorOutlineRounded as ErrorIcon,
  InfoOutlined as InfoIcon,
  AutoAwesome as AdviceIcon,
  CheckCircleOutline as SuccessIcon,
  Visibility as ReadIcon,
  RestoreFromTrash as UndismissIcon,
  RemoveCircleOutline as DismissAlertIcon,
} from '@mui/icons-material';
import { useDevUserId } from '../../dev/devUserState';
import { taskService, adviceService, alertsService } from '../../services/api';
import type { AlertItem, Advice } from '../../services/api';
import type { Task, CreateTaskRequest } from '../../types/Task';
import {
  TaskStatus,
  TaskType,
  TaskPriority,
  getTaskTypeLabel,
  getTaskPriorityLabel,
} from '../../types/Task';

/* ------------------------------------------------------------------ */
/*  Shared constants                                                   */
/* ------------------------------------------------------------------ */

const TAB_KEYS = ['alerts', 'advice', 'tasks'] as const;
type TabKey = (typeof TAB_KEYS)[number];

type SeverityKey = 'Low' | 'Medium' | 'High' | 'Critical';
type ChipColor = 'default' | 'success' | 'warning' | 'error' | 'info';

const severityMeta: Record<SeverityKey, { color: ChipColor; Icon: typeof SuccessIcon }> = {
  Low: { color: 'success', Icon: SuccessIcon },
  Medium: { color: 'warning', Icon: InfoIcon },
  High: { color: 'error', Icon: WarningIcon },
  Critical: { color: 'error', Icon: ErrorIcon },
};

const adviceStatusColor: Record<string, ChipColor> = {
  Proposed: 'info',
  Accepted: 'success',
  Dismissed: 'warning',
};

const priorityColor = (p: string): 'error' | 'warning' | 'default' => {
  if (p === 'Critical' || p === 'High') return 'error';
  if (p === 'Medium') return 'warning';
  return 'default';
};

const TASK_STATUS_TABS: TaskStatus[] = [
  TaskStatus.Pending,
  TaskStatus.InProgress,
  TaskStatus.Completed,
  TaskStatus.Dismissed,
];
const TASK_TAB_LABELS = ['Pending', 'In Progress', 'Completed', 'Dismissed'];

type AlertFilter = 'all' | 'active' | 'read' | 'dismissed';
type AdviceFilter = 'all' | 'Proposed' | 'Accepted' | 'Dismissed';

/* ================================================================== */
/*  ActionsView  – top‑level shell with 3 tabs                        */
/* ================================================================== */

export function ActionsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab') as TabKey | null;
  const initialTab = raw ? TAB_KEYS.indexOf(raw) : -1;
  const [tabIdx, setTabIdx] = useState(initialTab >= 0 ? initialTab : 0);

  const handleTabChange = (_: unknown, v: number) => {
    setTabIdx(v);
    setSearchParams({ tab: TAB_KEYS[v] }, { replace: true });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Actions
      </Typography>

      <Tabs
        value={tabIdx}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Alerts" />
        <Tab label="Advice" />
        <Tab label="Tasks" />
      </Tabs>

      {tabIdx === 0 && <AlertsTab />}
      {tabIdx === 1 && <AdviceTab />}
      {tabIdx === 2 && <TasksTab />}
    </Box>
  );
}

/* ================================================================== */
/*  ALERTS TAB                                                         */
/* ================================================================== */

function AlertsTab() {
  const userId = useDevUserId() ?? 1;
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<AlertFilter>('active');
  const [toast, setToast] = useState('');
  const [generatingAdviceFor, setGeneratingAdviceFor] = useState<number | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams: { isActive?: boolean; isRead?: boolean; isDismissed?: boolean } = {};
      if (filter === 'active') filterParams.isActive = true;
      if (filter === 'read') filterParams.isRead = true;
      if (filter === 'dismissed') filterParams.isDismissed = true;

      const [alertsRes, adviceRes] = await Promise.all([
        alertsService.getByUser(userId, filter === 'all' ? undefined : filterParams),
        adviceService.getForUser(userId),
      ]);
      setAlerts(alertsRes.data);
      setAdvice(adviceRes.data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleGenerateAdvice = useCallback(
    async (alertId: number) => {
      setGeneratingAdviceFor(alertId);
      try {
        await adviceService.generateFromAlert(alertId);
        setToast('Advice generated');
        loadAlerts();
      } catch {
        setToast('Failed to generate advice');
      } finally {
        setGeneratingAdviceFor(null);
      }
    },
    [loadAlerts],
  );

  const handleMarkAsRead = useCallback(
    async (alertId: number) => {
      try {
        await alertsService.markAsRead(alertId);
        setToast('Alert marked as read');
        loadAlerts();
      } catch {
        setToast('Failed to mark alert as read');
      }
    },
    [loadAlerts],
  );

  const handleDismissAlert = useCallback(
    async (alertId: number) => {
      try {
        await alertsService.dismiss(alertId);
        setToast('Alert dismissed');
        loadAlerts();
      } catch {
        setToast('Failed to dismiss alert');
      }
    },
    [loadAlerts],
  );

  const handleUndismissAlert = useCallback(
    async (alertId: number) => {
      try {
        await alertsService.undismiss(alertId);
        setToast('Alert restored');
        loadAlerts();
      } catch {
        setToast('Failed to restore alert');
      }
    },
    [loadAlerts],
  );

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="read">Read</ToggleButton>
          <ToggleButton value="dismissed">Dismissed</ToggleButton>
        </ToggleButtonGroup>
        <Chip label={`${alerts.length} alerts`} size="small" />
        <Tooltip title="Refresh">
          <IconButton onClick={loadAlerts} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {alerts.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No {filter === 'all' ? '' : filter + ' '}alerts
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {alerts.map((alert) => {
            const sev = severityMeta[alert.severity as SeverityKey] ?? severityMeta.Medium;
            const SevIcon = sev.Icon;
            const linkedAdvice = advice.find((a) => a.sourceAlertId === alert.alertId);
            const isGenerating = generatingAdviceFor === alert.alertId;
            const actionable = alert.isActionable && !alert.isDismissed;

            return (
              <Paper key={alert.alertId} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box display="flex" alignItems="flex-start" gap={1} flexWrap="wrap">
                    <Chip
                      icon={<SevIcon fontSize="small" />}
                      color={sev.color}
                      size="small"
                      label={alert.severity}
                    />
                    <Chip size="small" variant="outlined" label={alert.category} />
                    {alert.isRead && <Chip size="small" variant="outlined" label="Read" />}
                    {alert.isDismissed && <Chip size="small" color="default" label="Dismissed" />}
                    {alert.isActionable && !alert.isDismissed && (
                      <Chip size="small" color="info" variant="outlined" label="Actionable" />
                    )}
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600}>
                    {alert.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {alert.message}
                  </Typography>

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography variant="caption" color="text.disabled">
                      {new Date(alert.createdAt).toLocaleString()}
                    </Typography>

                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      {/* Advice status / generate button */}
                      {linkedAdvice ? (
                        <Chip
                          size="small"
                          color={
                            linkedAdvice.status === 'Accepted'
                              ? 'success'
                              : linkedAdvice.status === 'Dismissed'
                                ? 'default'
                                : 'info'
                          }
                          icon={<AdviceIcon fontSize="small" />}
                          label={
                            linkedAdvice.status === 'Accepted'
                              ? 'Advice accepted'
                              : linkedAdvice.status === 'Dismissed'
                                ? 'Advice dismissed'
                                : 'Advice generated'
                          }
                        />
                      ) : actionable ? (
                        <Button
                          size="small"
                          variant="contained"
                          endIcon={
                            isGenerating ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <AdviceIcon fontSize="small" />
                            )
                          }
                          onClick={() => handleGenerateAdvice(alert.alertId)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? 'Generating...' : 'Get AI Advice'}
                        </Button>
                      ) : null}

                      {/* Mark as read */}
                      {!alert.isRead && !alert.isDismissed && (
                        <Tooltip title="Mark as read">
                          <IconButton
                            size="small"
                            onClick={() => handleMarkAsRead(alert.alertId)}
                            aria-label="Mark as read"
                          >
                            <ReadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Dismiss alert */}
                      {!alert.isDismissed && (
                        <Tooltip title="Dismiss alert">
                          <IconButton
                            size="small"
                            onClick={() => handleDismissAlert(alert.alertId)}
                            aria-label="Dismiss alert"
                          >
                            <DismissAlertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Un-dismiss alert */}
                      {alert.isDismissed && (
                        <Tooltip title="Restore alert">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UndismissIcon fontSize="small" />}
                            onClick={() => handleUndismissAlert(alert.alertId)}
                          >
                            Restore
                          </Button>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
      />
    </>
  );
}

/* ================================================================== */
/*  ADVICE TAB                                                         */
/* ================================================================== */

function AdviceTab() {
  const userId = useDevUserId() ?? 1;
  const [allAdvice, setAllAdvice] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<AdviceFilter>('all');
  const [toast, setToast] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);

  const loadAdvice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adviceService.getForUser(userId);
      setAllAdvice(res.data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load advice');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAdvice();
  }, [loadAdvice]);

  const filteredAdvice = filter === 'all' ? allAdvice : allAdvice.filter((a) => a.status === filter);

  const handleAccept = useCallback(
    async (adviceId: number) => {
      setPendingId(adviceId);
      try {
        await adviceService.accept(adviceId);
        setToast('Advice accepted - task created');
        loadAdvice();
      } catch {
        setToast('Failed to accept advice');
      } finally {
        setPendingId(null);
      }
    },
    [loadAdvice],
  );

  const handleDismiss = useCallback(
    async (adviceId: number) => {
      setPendingId(adviceId);
      try {
        await adviceService.dismiss(adviceId);
        setToast('Advice dismissed');
        loadAdvice();
      } catch {
        setToast('Failed to dismiss advice');
      } finally {
        setPendingId(null);
      }
    },
    [loadAdvice],
  );

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="Proposed">Proposed</ToggleButton>
          <ToggleButton value="Accepted">Accepted</ToggleButton>
          <ToggleButton value="Dismissed">Dismissed</ToggleButton>
        </ToggleButtonGroup>
        <Chip label={`${filteredAdvice.length} items`} size="small" />
        <Tooltip title="Refresh">
          <IconButton onClick={loadAdvice} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {filteredAdvice.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {filter === 'all' ? 'No advice generated yet' : `No ${filter.toLowerCase()} advice`}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filteredAdvice.map((item) => (
            <Paper key={item.adviceId} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    color={adviceStatusColor[item.status] ?? 'default'}
                    label={item.status}
                  />
                  {item.theme && <Chip size="small" variant="outlined" label={item.theme} />}
                  {item.confidenceScore != null && (
                    <Chip
                      size="small"
                      color="primary"
                      label={`Confidence ${item.confidenceScore}%`}
                    />
                  )}
                </Box>

                <Typography variant="subtitle1" fontWeight={600}>
                  {item.consensusText}
                </Typography>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography variant="caption" color="text.disabled">
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography>

                  {item.status === 'Proposed' && (
                    <Box display="flex" gap={1}>
                      {pendingId === item.adviceId ? (
                        <CircularProgress size={20} />
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon fontSize="small" />}
                            onClick={() => handleAccept(item.adviceId)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<CancelIcon fontSize="small" />}
                            onClick={() => handleDismiss(item.adviceId)}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                    </Box>
                  )}

                  {item.status === 'Accepted' && item.linkedTaskId != null && (
                    <Chip
                      size="small"
                      color="success"
                      icon={<TaskIcon fontSize="small" />}
                      label={`Task #${item.linkedTaskId} created`}
                    />
                  )}
                  {item.status === 'Dismissed' && (
                    <Chip size="small" color="default" label="Dismissed" />
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
      />
    </>
  );
}

/* ================================================================== */
/*  TASKS TAB                                                          */
/* ================================================================== */

function TasksTab() {
  const userId = useDevUserId() ?? 1;
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIdx, setTabIdx] = useState(0);
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CreateTaskRequest>>({
    userId,
    title: '',
    description: '',
    priority: TaskPriority.Medium,
    type: TaskType.Rebalancing,
  });
  const [creating, setCreating] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await taskService.getByUser(userId);
      setAllTasks(response.data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const currentStatus = TASK_STATUS_TABS[tabIdx];
  const filteredTasks = allTasks.filter((t) => t.status === currentStatus);
  const counts = TASK_STATUS_TABS.map((st) => allTasks.filter((t) => t.status === st).length);

  const handleComplete = useCallback(
    async (taskId: number) => {
      try {
        await taskService.markAsCompleted(taskId, {
          completionNotes: 'Completed via Actions page',
        });
        setToast('Task marked as completed');
        loadTasks();
      } catch {
        setToast('Failed to complete task');
      }
    },
    [loadTasks],
  );

  const handleProgress = useCallback(
    async (taskId: number) => {
      try {
        await taskService.updateStatus(taskId, TaskStatus.InProgress);
        setToast('Task moved to In Progress');
        loadTasks();
      } catch {
        setToast('Failed to update status');
      }
    },
    [loadTasks],
  );

  const handleDismiss = useCallback(
    async (taskId: number) => {
      try {
        await taskService.dismiss(taskId);
        setToast('Task dismissed');
        loadTasks();
      } catch {
        setToast('Failed to dismiss task');
      }
    },
    [loadTasks],
  );

  const handleUpdateProgress = useCallback(
    async (taskId: number, progress: number) => {
      try {
        await taskService.updateProgress(taskId, progress);
        setToast(`Progress updated to ${progress}%`);
        loadTasks();
      } catch {
        setToast('Failed to update progress');
      }
    },
    [loadTasks],
  );

  const handleCreate = useCallback(async () => {
    if (!newTask.title?.trim()) return;
    setCreating(true);
    try {
      await taskService.create(newTask as CreateTaskRequest);
      setToast('Task created');
      setCreateOpen(false);
      setNewTask({
        userId,
        title: '',
        description: '',
        priority: TaskPriority.Medium,
        type: TaskType.Rebalancing,
      });
      loadTasks();
    } catch {
      setToast('Failed to create task');
    } finally {
      setCreating(false);
    }
  }, [newTask, userId, loadTasks]);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Task
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={loadTasks} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={`${allTasks.length} total`} size="small" />
        <Chip label={`${counts[0]} pending`} size="small" color="warning" variant="outlined" />
        <Chip label={`${counts[1]} in progress`} size="small" color="info" variant="outlined" />
        <Chip label={`${counts[2]} completed`} size="small" color="success" variant="outlined" />
      </Stack>

      <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ mb: 2 }}>
        {TASK_TAB_LABELS.map((label, i) => (
          <Tab key={label} label={`${label} (${counts[i]})`} />
        ))}
      </Tabs>

      {filteredTasks.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No {TASK_TAB_LABELS[tabIdx].toLowerCase()} tasks
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filteredTasks.map((t) => (
            <Paper key={t.taskId} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t.title}
                    </Typography>
                    <Chip
                      label={getTaskPriorityLabel(t.priority)}
                      size="small"
                      color={priorityColor(t.priority)}
                    />
                    <Chip label={getTaskTypeLabel(t.type)} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t.description}
                  </Typography>

                  {(t.progressPercentage > 0 || currentStatus === TaskStatus.InProgress) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {currentStatus === TaskStatus.InProgress ? (
                        <Slider
                          size="small"
                          min={0}
                          max={100}
                          step={5}
                          value={t.progressPercentage}
                          onChangeCommitted={(_, value) =>
                            handleUpdateProgress(t.taskId!, value as number)
                          }
                          valueLabelDisplay="auto"
                          sx={{ flex: 1 }}
                          aria-label="Task progress"
                        />
                      ) : (
                        <LinearProgress
                          variant="determinate"
                          value={t.progressPercentage}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                      )}
                      <Typography variant="caption">{t.progressPercentage}%</Typography>
                    </Box>
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    {t.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(t.createdDate).toLocaleDateString()}
                    </Typography>
                    {t.confidenceScore != null && (
                      <Typography variant="caption" color="text.secondary">
                        Confidence: {(t.confidenceScore * 100).toFixed(0)}%
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.5}>
                  {currentStatus === TaskStatus.Pending && (
                    <>
                      <Tooltip title="Start">
                        <IconButton color="info" onClick={() => handleProgress(t.taskId!)}>
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Complete">
                        <IconButton color="success" onClick={() => handleComplete(t.taskId!)}>
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dismiss">
                        <IconButton onClick={() => handleDismiss(t.taskId!)}>
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {currentStatus === TaskStatus.InProgress && (
                    <>
                      <Tooltip title="Complete">
                        <IconButton color="success" onClick={() => handleComplete(t.taskId!)}>
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dismiss">
                        <IconButton onClick={() => handleDismiss(t.taskId!)}>
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={newTask.title}
              onChange={(e) => setNewTask((n) => ({ ...n, title: e.target.value }))}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask((n) => ({ ...n, description: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTask.priority}
                label="Priority"
                onChange={(e) =>
                  setNewTask((n) => ({
                    ...n,
                    priority: e.target.value as unknown as TaskPriority,
                  }))
                }
              >
                <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                <MenuItem value={TaskPriority.High}>High</MenuItem>
                <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newTask.type}
                label="Type"
                onChange={(e) =>
                  setNewTask((n) => ({
                    ...n,
                    type: e.target.value as unknown as TaskType,
                  }))
                }
              >
                <MenuItem value={TaskType.Rebalancing}>Portfolio Rebalancing</MenuItem>
                <MenuItem value={TaskType.StockPurchase}>Stock Purchase</MenuItem>
                <MenuItem value={TaskType.TaxLossHarvesting}>Tax Loss Harvesting</MenuItem>
                <MenuItem value={TaskType.CashOptimization}>Cash Optimization</MenuItem>
                <MenuItem value={TaskType.GoalAdjustment}>Goal Adjustment</MenuItem>
                <MenuItem value={TaskType.InsuranceReview}>Insurance Review</MenuItem>
                <MenuItem value={TaskType.EmergencyFundContribution}>Emergency Fund</MenuItem>
                <MenuItem value={TaskType.TSPAllocationChange}>TSP Allocation</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newTask.title?.trim()}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
      />
    </>
  );
}
