import { Box, Typography, Paper } from '@mui/material';

/**
 * TasksView - Placeholder for tasks management page
 * Shows actionable tasks from accepted advice
 */
export function TasksView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Task management view coming soon. This will display:
        </Typography>
        <ul>
          <li>Pending tasks from accepted advice</li>
          <li>Task status tracking (Not Started, In Progress, Complete)</li>
          <li>Priority and due date information</li>
          <li>Task completion workflow</li>
          <li>Task history and archive</li>
        </ul>
      </Paper>
    </Box>
  );
}
