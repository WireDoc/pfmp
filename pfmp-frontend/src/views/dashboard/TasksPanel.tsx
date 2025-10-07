import React from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import type { DashboardData } from '../../services/dashboard';

interface Props {
  data: DashboardData | null;
  loading: boolean;
}

export const TasksPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading && !data) {
    return <Typography variant="body2">Loading tasks…</Typography>;
  }

  if (!loading && (!data || data.tasks.length === 0)) {
    return <Typography variant="body2">No tasks yet</Typography>;
  }

  if (!data) {
    return <Typography variant="body2">No task data available</Typography>;
  }

  return (
    <Stack spacing={1} data-testid="tasks-panel">
      {data.tasks.slice(0, 5).map((task) => {
        const progress = task.progressPercentage ?? undefined;
        return (
          <Box key={task.taskId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2">{task.title}</Typography>
              <Chip size="small" label={task.priority} color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'default'} />
              <Chip size="small" variant="outlined" label={task.status} />
            </Box>
            <Typography variant="body2" color="text.secondary">{task.description}</Typography>
            {progress !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                <Typography variant="caption" color="text.secondary">{progress}%</Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.disabled">
              Created {new Date(task.createdDate).toLocaleDateString()}
              {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
            </Typography>
          </Box>
        );
      })}
      {data.tasks.length > 5 && (
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(5, data.tasks.length)} of {data.tasks.length} tasks
        </Typography>
      )}
    </Stack>
  );
};

export default TasksPanel;