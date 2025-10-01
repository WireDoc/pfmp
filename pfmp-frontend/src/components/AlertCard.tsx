import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { taskService, adviceService } from '../services/api';
import type { 
  CreateTaskRequest,
} from '../types/Task';
import { 
  TaskType, 
  TaskPriority, 
  getTaskTypeLabel,
  getTaskPriorityLabel 
} from '../types/Task';

interface AlertData {
  alertId: number;
  userId: number;
  title: string;
  message: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  isRead: boolean;
  isActionable: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface AlertCardProps {
  alert: AlertData;
  onMarkAsRead?: (alertId: number) => void;
  onDismiss?: (alertId: number) => void;
  onTaskCreated?: () => void;
  onAdviceGenerated?: (alertId: number) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ 
  alert, 
  onMarkAsRead, 
  onDismiss,
  onTaskCreated,
  onAdviceGenerated
}) => {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskData, setTaskData] = useState<Partial<CreateTaskRequest>>({
    userId: alert.userId,
    sourceAlertId: alert.alertId,
    title: alert.title,
    description: alert.message,
    type: TaskType.Rebalancing,
    priority: getSuggestedPriority(alert.severity),
  });
  const [creating, setCreating] = useState(false);
  const [generatingAdvice, setGeneratingAdvice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getSuggestedPriority(severity: string): TaskPriority {
    switch (severity) {
      case 'Critical': return TaskPriority.Critical;
      case 'High': return TaskPriority.High;
      case 'Medium': return TaskPriority.Medium;
      default: return TaskPriority.Low;
    }
  }

  function getSuggestedTaskType(category: string): TaskType {
    switch (category.toLowerCase()) {
      case 'rebalancing': return TaskType.Rebalancing;
      case 'tax': return TaskType.TaxLossHarvesting;
      case 'goal': return TaskType.GoalAdjustment;
      case 'portfolio': return TaskType.Rebalancing;
      default: return TaskType.Rebalancing;
    }
  }

  const handleCreateTask = async () => {
    try {
      setCreating(true);
      setError(null);
      
      if (!taskData.title || !taskData.description) {
        setError('Title and description are required');
        return;
      }

      await taskService.create(taskData as CreateTaskRequest);
      setShowTaskDialog(false);
      onTaskCreated?.();
      
      // Optionally mark alert as read when task is created
      onMarkAsRead?.(alert.alertId);
    } catch (err) {
      setError('Failed to create task');
      console.error('Error creating task:', err);
    } finally {
      setCreating(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <ErrorIcon color="error" />;
      case 'High': return <WarningIcon color="warning" />;
      case 'Medium': return <InfoIcon color="info" />;
      default: return <CheckCircleIcon color="success" />;
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'success';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = alert.expiresAt && new Date(alert.expiresAt) < new Date();

  const handleGenerateAdvice = async () => {
    try {
      setGeneratingAdvice(true);
      setError(null);
      await adviceService.generateFromAlert(alert.alertId);
      onAdviceGenerated?.(alert.alertId);
      // Optionally mark as read when advice generated
      onMarkAsRead?.(alert.alertId);
    } catch (err) {
      setError('Failed to generate advice');
      console.error('Error generating advice:', err);
    } finally {
      setGeneratingAdvice(false);
    }
  };

  return (
    <>
      <Card sx={{ mb: 2, opacity: alert.isRead ? 0.7 : 1 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="flex-start" gap={2} flex={1}>
              {getSeverityIcon(alert.severity)}
              <Box flex={1}>
                <Typography variant="h6" component="h3">
                  {alert.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {alert.message}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                label={alert.severity}
                color={getSeverityColor(alert.severity)}
                size="small"
              />
              <Chip
                label={alert.category}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          <Box display="flex" gap={2} mt={2}>
            <Typography variant="body2" color="text.secondary">
              {formatDate(alert.createdAt)}
            </Typography>
            {alert.expiresAt && (
              <Typography 
                variant="body2" 
                color={isExpired ? "error.main" : "text.secondary"}
              >
                {isExpired ? 'Expired' : `Expires: ${formatDate(alert.expiresAt)}`}
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Box display="flex" gap={1}>
            {alert.isActionable && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<AssignmentIcon />}
                  onClick={() => {
                    setTaskData({
                      ...taskData,
                      type: getSuggestedTaskType(alert.category)
                    });
                    setShowTaskDialog(true);
                  }}
                >
                  Create Task
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={generatingAdvice}
                  onClick={handleGenerateAdvice}
                >
                  {generatingAdvice ? 'Generating...' : 'Generate Advice'}
                </Button>
              </>
            )}
            {!alert.isRead && onMarkAsRead && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onMarkAsRead(alert.alertId)}
              >
                Mark as Read
              </Button>
            )}
          </Box>
          {onDismiss && (
            <Button
              size="small"
              variant="text"
              color="secondary"
              startIcon={<CloseIcon />}
              onClick={() => onDismiss(alert.alertId)}
            >
              Dismiss
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Create Task Dialog */}
      <Dialog 
        open={showTaskDialog} 
        onClose={() => setShowTaskDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Create Task from Recommendation</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Convert this alert into an actionable task that you can track and complete.
          </DialogContentText>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              fullWidth
              label="Task Title"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Task Description"
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Task Type</InputLabel>
              <Select
                value={taskData.type}
                onChange={(e) => setTaskData({ ...taskData, type: e.target.value as TaskType })}
              >
                {Object.values(TaskType).filter(t => typeof t === 'number').map((type) => (
                  <MenuItem key={type} value={type}>
                    {getTaskTypeLabel(type as TaskType)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={taskData.priority}
                onChange={(e) => setTaskData({ ...taskData, priority: e.target.value as TaskPriority })}
              >
                {Object.values(TaskPriority).filter(p => typeof p === 'number').map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {getTaskPriorityLabel(priority as TaskPriority)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="date"
              label="Due Date (Optional)"
              InputLabelProps={{ shrink: true }}
              value={taskData.dueDate ? new Date(taskData.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setTaskData({ 
                ...taskData, 
                dueDate: e.target.value ? new Date(e.target.value) : undefined 
              })}
            />

            <TextField
              fullWidth
              type="number"
              label="Estimated Financial Impact ($)"
              value={taskData.estimatedImpact || ''}
              onChange={(e) => setTaskData({ 
                ...taskData, 
                estimatedImpact: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};