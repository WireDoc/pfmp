import React, { useState, useCallback, useEffect } from 'react';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDevUserId } from '../../dev/devUserState';
import { taskService } from '../../services/api';
import type { Task, CreateTaskRequest } from '../../types/Task';
import { TaskStatus, TaskType, TaskPriority, getTaskTypeLabel, getTaskStatusLabel, getTaskPriorityLabel } from '../../types/Task';

const priorityColor = (p: string): 'error' | 'warning' | 'default' => {
  if (p === 'Critical' || p === 'High') return 'error';
  if (p === 'Medium') return 'warning';
  return 'default';
};

const STATUS_TABS: TaskStatus[] = [TaskStatus.Pending, TaskStatus.InProgress, TaskStatus.Completed, TaskStatus.Dismissed];
const TAB_LABELS = ['Pending', 'In Progress', 'Completed', 'Dismissed'];

export function TasksView() {
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

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const currentStatus = STATUS_TABS[tabIdx];
  const filteredTasks = allTasks.filter(t => t.status === currentStatus);
  const counts = STATUS_TABS.map(st => allTasks.filter(t => t.status === st).length);

  const handleComplete = useCallback(async (taskId: number) => {
    try {
      await taskService.markAsCompleted(taskId, { completionNotes: 'Completed via Tasks page' });
      setToast('Task marked as completed');
      loadTasks();
    } catch { setToast('Failed to complete task'); }
  }, [loadTasks]);

  const handleProgress = useCallback(async (taskId: number) => {
    try {
      await taskService.updateStatus(taskId, TaskStatus.InProgress);
      setToast('Task moved to In Progress');
      loadTasks();
    } catch { setToast('Failed to update status'); }
  }, [loadTasks]);

  const handleDismiss = useCallback(async (taskId: number) => {
    try {
      await taskService.dismiss(taskId);
      setToast('Task dismissed');
      loadTasks();
    } catch { setToast('Failed to dismiss task'); }
  }, [loadTasks]);

  const handleCreate = useCallback(async () => {
    if (!newTask.title?.trim()) return;
    setCreating(true);
    try {
      await taskService.create(newTask as CreateTaskRequest);
      setToast('Task created');
      setCreateOpen(false);
      setNewTask({ userId, title: '', description: '', priority: TaskPriority.Medium, type: TaskType.Rebalancing });
      loadTasks();
    } catch { setToast('Failed to create task'); }
    finally { setCreating(false); }
  }, [newTask, userId, loadTasks]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Tasks</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Task
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={loadTasks} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={`${allTasks.length} total`} size="small" />
        <Chip label={`${counts[0]} pending`} size="small" color="warning" variant="outlined" />
        <Chip label={`${counts[1]} in progress`} size="small" color="info" variant="outlined" />
        <Chip label={`${counts[2]} completed`} size="small" color="success" variant="outlined" />
      </Stack>

      <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ mb: 2 }}>
        {TAB_LABELS.map((label, i) => (
          <Tab key={label} label={`${label} (${counts[i]})`} />
        ))}
      </Tabs>

      {filteredTasks.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No {TAB_LABELS[tabIdx].toLowerCase()} tasks</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filteredTasks.map(t => (
            <Paper key={t.taskId} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{t.title}</Typography>
                    <Chip label={getTaskPriorityLabel(t.priority)} size="small" color={priorityColor(t.priority)} />
                    <Chip label={getTaskTypeLabel(t.type)} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t.description}</Typography>

                  {t.progressPercentage > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinearProgress variant="determinate" value={t.progressPercentage} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
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

                {/* Actions */}
                <Stack direction="row" spacing={0.5}>
                  {currentStatus === TaskStatus.Pending && (
                    <>
                      <Tooltip title="Start"><IconButton color="info" onClick={() => handleProgress(t.taskId!)}><PlayArrowIcon /></IconButton></Tooltip>
                      <Tooltip title="Complete"><IconButton color="success" onClick={() => handleComplete(t.taskId!)}><CheckCircleIcon /></IconButton></Tooltip>
                      <Tooltip title="Dismiss"><IconButton onClick={() => handleDismiss(t.taskId!)}><CancelIcon /></IconButton></Tooltip>
                    </>
                  )}
                  {currentStatus === TaskStatus.InProgress && (
                    <>
                      <Tooltip title="Complete"><IconButton color="success" onClick={() => handleComplete(t.taskId!)}><CheckCircleIcon /></IconButton></Tooltip>
                      <Tooltip title="Dismiss"><IconButton onClick={() => handleDismiss(t.taskId!)}><CancelIcon /></IconButton></Tooltip>
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
            <TextField label="Title" fullWidth value={newTask.title} onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))} />
            <TextField label="Description" fullWidth multiline rows={3} value={newTask.description} onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={newTask.priority} label="Priority" onChange={e => setNewTask(n => ({ ...n, priority: e.target.value as unknown as TaskPriority }))}>
                <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                <MenuItem value={TaskPriority.High}>High</MenuItem>
                <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={newTask.type} label="Type" onChange={e => setNewTask(n => ({ ...n, type: e.target.value as unknown as TaskType }))}>
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
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newTask.title?.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
