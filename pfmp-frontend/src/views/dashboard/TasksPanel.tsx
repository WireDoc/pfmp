import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { TaskItem } from '../../services/dashboard';

interface TasksPanelProps {
  tasks: TaskItem[];
  loading: boolean;
  recentTaskIds?: Set<number>;
  pendingTaskIds?: Set<number>;
  onUpdateStatus?: (taskId: number, status: TaskItem['status']) => void;
  onUpdateProgress?: (taskId: number, progress: number) => void;
}

function resolvePriorityColor(priority: TaskItem['priority']): 'default' | 'warning' | 'error' | 'info' {
  const normalized = (priority ?? '').toLowerCase();
  if (normalized === 'high' || normalized === 'critical') return 'error';
  if (normalized === 'medium') return 'warning';
  if (normalized === 'low') return 'info';
  return 'default';
}

export const TasksPanel: React.FC<TasksPanelProps> = ({
  tasks,
  loading,
  recentTaskIds,
  pendingTaskIds,
  onUpdateStatus,
  onUpdateProgress,
}) => {
  if (loading && tasks.length === 0) {
    return (
      <Stack spacing={1.5} data-testid="tasks-panel">
        <Typography variant="body2">Loading tasks…</Typography>
      </Stack>
    );
  }

  if (!loading && tasks.length === 0) {
    return (
      <Stack spacing={1.5} data-testid="tasks-panel">
        <Typography variant="body2">No tasks yet</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="tasks-panel">
      {tasks.slice(0, 5).map((task, idx) => {
        const progress = task.progressPercentage ?? undefined;
        const isRecent = recentTaskIds?.has(task.taskId);
        const isPending = pendingTaskIds?.has(task.taskId) ?? false;

        const showProgressControls = onUpdateProgress && task.status !== 'Dismissed';

        const actionButtons: Array<{ label: string; status: TaskItem['status']; testId: string }> = [];

        if (onUpdateStatus) {
          const normalizedStatus = (task.status ?? 'Pending').toString();

          if (normalizedStatus !== 'InProgress' && normalizedStatus !== 'Completed' && normalizedStatus !== 'Dismissed') {
            actionButtons.push({ label: 'Start', status: 'InProgress', testId: 'start' });
          }

          if (normalizedStatus !== 'Pending' && normalizedStatus !== 'Completed' && normalizedStatus !== 'Dismissed') {
            actionButtons.push({ label: 'Mark pending', status: 'Pending', testId: 'pending' });
          }

          if (normalizedStatus !== 'Completed') {
            actionButtons.push({ label: 'Complete', status: 'Completed', testId: 'complete' });
          }

          if (normalizedStatus !== 'Dismissed') {
            actionButtons.push({ label: 'Dismiss', status: 'Dismissed', testId: 'dismiss' });
          }

          if (normalizedStatus === 'Completed' || normalizedStatus === 'Dismissed') {
            actionButtons.push({ label: 'Reopen', status: 'Pending', testId: 'reopen' });
          }
        }

        return (
          <React.Fragment key={task.taskId}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                border: theme => `1px solid ${theme.palette.divider}`,
                padding: 1.5,
                backgroundColor: isRecent ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
              }}
              data-testid={isRecent ? 'recent-task-card' : undefined}
            >
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="subtitle2">{task.title}</Typography>
                <Chip size="small" color={resolvePriorityColor(task.priority)} label={task.priority} />
                <Chip size="small" variant="outlined" label={task.status} />
                {isRecent && (
                  <Tooltip title="Newly created this session" describeChild>
                    <Chip
                      size="small"
                      color="primary"
                      label="New"
                      data-testid="new-task-indicator"
                    />
                  </Tooltip>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {task.description}
              </Typography>
              {showProgressControls && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Slider
                    size="small"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.max(0, Math.min(100, progress ?? 0))}
                    disabled={isPending}
                    onChangeCommitted={(_event, value) => {
                      if (typeof value === 'number') {
                        onUpdateProgress?.(task.taskId, value);
                      }
                    }}
                    valueLabelDisplay="auto"
                    aria-label={`Progress for ${task.title}`}
                    data-testid={`task-progress-slider-${task.taskId}`}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {Math.max(0, Math.min(100, progress ?? 0))}%
                  </Typography>
                </Box>
              )}
              <Typography variant="caption" color="text.disabled">
                Created {new Date(task.createdDate).toLocaleString()}
                {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
              </Typography>
              {task.sourceAlertId != null && (
                <Typography variant="caption" color="text.secondary">
                  Originated from alert #{task.sourceAlertId}
                </Typography>
              )}
              {actionButtons.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {actionButtons.map(action => (
                    <Button
                      key={`${task.taskId}-${action.testId}`}
                      size="small"
                      variant={action.status === 'Completed' ? 'contained' : 'outlined'}
                      color={action.status === 'Dismissed' ? 'inherit' : action.status === 'Completed' ? 'primary' : 'secondary'}
                      disabled={isPending}
                      onClick={() => onUpdateStatus?.(task.taskId, action.status)}
                      data-testid={`task-action-${action.testId}-${task.taskId}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              )}
            </Box>
            {idx < Math.min(tasks.length, 5) - 1 && <Divider flexItem light />}
          </React.Fragment>
        );
      })}
      {tasks.length > 5 && (
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(5, tasks.length)} of {tasks.length} tasks
        </Typography>
      )}
    </Stack>
  );
};

export default TasksPanel;