import React from 'react';
import {
  Box,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { TaskItem } from '../../services/dashboard';

interface TasksPanelProps {
  tasks: TaskItem[];
  loading: boolean;
  recentTaskIds?: Set<number>;
}

function resolvePriorityColor(priority: TaskItem['priority']): 'default' | 'warning' | 'error' | 'info' {
  const normalized = (priority ?? '').toLowerCase();
  if (normalized === 'high' || normalized === 'critical') return 'error';
  if (normalized === 'medium') return 'warning';
  if (normalized === 'low') return 'info';
  return 'default';
}

export const TasksPanel: React.FC<TasksPanelProps> = ({ tasks, loading, recentTaskIds }) => {
  if (loading && tasks.length === 0) {
    return <Typography variant="body2">Loading tasks…</Typography>;
  }

  if (!loading && tasks.length === 0) {
    return <Typography variant="body2">No tasks yet</Typography>;
  }

  return (
    <Stack spacing={1.5} data-testid="tasks-panel">
      {tasks.slice(0, 5).map((task, idx) => {
        const progress = task.progressPercentage ?? undefined;
        const isRecent = recentTaskIds?.has(task.taskId);
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
              {progress !== undefined && (
                <Box display="flex" alignItems="center" gap={1}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, progress))}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {progress}%
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