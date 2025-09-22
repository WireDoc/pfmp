import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Box,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { Task } from '../types/Task';
import { TaskStatus, getTaskTypeLabel, getTaskStatusLabel, getTaskPriorityLabel, getTaskPriorityColor, getTaskStatusColor } from '../types/Task';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: number, status: TaskStatus, notes?: string) => void;
  onEdit?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onEdit }) => {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const handleComplete = () => {
    onStatusChange(task.taskId!, TaskStatus.Completed, completionNotes);
    setShowCompleteDialog(false);
    setCompletionNotes('');
  };

  const handleDismiss = () => {
    onStatusChange(task.taskId!, TaskStatus.Dismissed);
    setShowDismissDialog(false);
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    onStatusChange(task.taskId!, newStatus);
  };

  const getActionButtons = () => {
    switch (task.status) {
      case TaskStatus.Pending:
        return (
          <>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleStatusChange(TaskStatus.Accepted)}
            >
              Accept
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<CloseIcon />}
              onClick={() => setShowDismissDialog(true)}
            >
              Dismiss
            </Button>
          </>
        );
      case TaskStatus.Accepted:
        return (
          <>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleStatusChange(TaskStatus.InProgress)}
            >
              Start
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<CloseIcon />}
              onClick={() => setShowDismissDialog(true)}
            >
              Dismiss
            </Button>
          </>
        );
      case TaskStatus.InProgress:
        return (
          <>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => setShowCompleteDialog(true)}
            >
              Complete
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<CloseIcon />}
              onClick={() => setShowDismissDialog(true)}
            >
              Dismiss
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.Completed;

  return (
    <>
      <Card sx={{ mb: 2, position: 'relative' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography variant="h6" component="h2" sx={{ flex: 1, pr: 2 }}>
              {task.title}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                label={getTaskPriorityLabel(task.priority)}
                color={getTaskPriorityColor(task.priority)}
                size="small"
              />
              <Chip
                label={getTaskStatusLabel(task.status)}
                color={getTaskStatusColor(task.status)}
                size="small"
              />
            </Box>
          </Box>

          <Chip
            label={getTaskTypeLabel(task.type)}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {task.description}
          </Typography>

          {task.status === TaskStatus.InProgress && (
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Progress</Typography>
                <Typography variant="body2">{task.progressPercentage}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={task.progressPercentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            {task.estimatedImpact && (
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="success" fontSize="small" />
                <Typography variant="body2" color="success.main">
                  {formatCurrency(task.estimatedImpact)}
                </Typography>
                {task.impactDescription && (
                  <Tooltip title={task.impactDescription}>
                    <Typography variant="body2" color="text.secondary">
                      impact
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            )}

            {task.dueDate && (
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon 
                  color={isOverdue ? "error" : "primary"} 
                  fontSize="small" 
                />
                <Typography 
                  variant="body2" 
                  color={isOverdue ? "error.main" : "text.secondary"}
                >
                  Due: {formatDate(task.dueDate)}
                </Typography>
              </Box>
            )}

            {task.confidenceScore && (
              <Typography variant="body2" color="text.secondary">
                Confidence: {Math.round(task.confidenceScore * 100)}%
              </Typography>
            )}
          </Box>

          {task.notes && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2" fontWeight="medium" mb={1}>
                Notes:
              </Typography>
              <Typography variant="body2">{task.notes}</Typography>
            </Box>
          )}

          {task.completionNotes && (
            <Box mt={2} p={2} bgcolor="success.50" borderRadius={1}>
              <Typography variant="body2" fontWeight="medium" mb={1} color="success.main">
                Completion Notes:
              </Typography>
              <Typography variant="body2">{task.completionNotes}</Typography>
            </Box>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Box display="flex" gap={1}>
            {getActionButtons()}
          </Box>
          {onEdit && task.status !== TaskStatus.Completed && task.status !== TaskStatus.Dismissed && (
            <IconButton size="small" onClick={() => onEdit(task)}>
              <EditIcon />
            </IconButton>
          )}
        </CardActions>
      </Card>

      {/* Complete Task Dialog */}
      <Dialog open={showCompleteDialog} onClose={() => setShowCompleteDialog(false)}>
        <DialogTitle>Complete Task</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Mark "{task.title}" as completed. You can add optional notes about what was accomplished.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Completion Notes (Optional)"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Describe what you completed..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
          <Button onClick={handleComplete} variant="contained" color="success">
            Complete Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dismiss Task Dialog */}
      <Dialog open={showDismissDialog} onClose={() => setShowDismissDialog(false)}>
        <DialogTitle>Dismiss Task</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to dismiss "{task.title}"? This will remove it from your active tasks 
            but keep it in your history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDismissDialog(false)}>Cancel</Button>
          <Button onClick={handleDismiss} variant="contained" color="secondary">
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};