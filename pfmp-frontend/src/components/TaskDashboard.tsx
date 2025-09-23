import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { TaskCard } from './TaskCard';
import { taskService } from '../services/api';
import type { 
  Task, 
  CreateTaskRequest, 
} from '../types/Task';
import { 
  TaskStatus, 
  TaskType, 
  TaskPriority, 
  getTaskTypeLabel, 
  getTaskPriorityLabel 
} from '../types/Task';

interface TaskDashboardProps {
  userId: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CreateTaskRequest>>({
    userId,
    type: TaskType.Rebalancing,
    priority: TaskPriority.Medium,
    title: '',
    description: '',
  });

  useEffect(() => {
    loadTasks();
  }, [userId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getByUser(userId);
      setTasks(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, status: TaskStatus, notes?: string) => {
    try {
      if (status === TaskStatus.Completed) {
        await taskService.markAsCompleted(taskId, { completionNotes: notes });
      } else if (status === TaskStatus.Dismissed) {
        await taskService.dismiss(taskId);
      } else {
        await taskService.updateStatus(taskId, status);
      }
      await loadTasks();
    } catch (err) {
      setError('Failed to update task status');
      console.error('Error updating task:', err);
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.title || !newTask.description) {
        setError('Title and description are required');
        return;
      }

      await taskService.create(newTask as CreateTaskRequest);
      setShowCreateDialog(false);
      setNewTask({
        userId,
        type: TaskType.Rebalancing,
        priority: TaskPriority.Medium,
        title: '',
        description: '',
      });
      await loadTasks();
    } catch (err) {
      setError('Failed to create task');
      console.error('Error creating task:', err);
    }
  };

  const getTasksByStatus = (status: TaskStatus[]) => {
    return tasks.filter(task => status.includes(task.status));
  };

  const activeTasks = getTasksByStatus([TaskStatus.Pending, TaskStatus.Accepted, TaskStatus.InProgress]);
  const completedTasks = getTasksByStatus([TaskStatus.Completed]);
  const dismissedTasks = getTasksByStatus([TaskStatus.Dismissed]);

  const getTaskCounts = () => {
    return {
      pending: tasks.filter(t => t.status === TaskStatus.Pending).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.InProgress).length,
      completed: tasks.filter(t => t.status === TaskStatus.Completed).length,
      dismissed: tasks.filter(t => t.status === TaskStatus.Dismissed).length,
    };
  };

  const counts = getTaskCounts();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Task Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateDialog(true)}
        >
          Create Task
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Task Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AssignmentIcon color="primary" />
                <Box>
                  <Typography variant="h6">{counts.pending}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PlayArrowIcon color="info" />
                <Box>
                  <Typography variant="h6">{counts.inProgress}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h6">{counts.completed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CancelIcon color="action" />
                <Box>
                  <Typography variant="h6">{counts.dismissed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dismissed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Task Tabs */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Active Tasks
                {activeTasks.length > 0 && <Chip label={activeTasks.length} size="small" />}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Completed
                {completedTasks.length > 0 && <Chip label={completedTasks.length} size="small" />}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Dismissed
                {dismissedTasks.length > 0 && <Chip label={dismissedTasks.length} size="small" />}
              </Box>
            } 
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {activeTasks.length === 0 ? (
            <Box textAlign="center" py={4}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No active tasks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a new task or accept AI recommendations to get started.
              </Typography>
            </Box>
          ) : (
            <Box>
              {activeTasks.map(task => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {completedTasks.length === 0 ? (
            <Box textAlign="center" py={4}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No completed tasks
              </Typography>
            </Box>
          ) : (
            <Box>
              {completedTasks.map(task => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {dismissedTasks.length === 0 ? (
            <Box textAlign="center" py={4}>
              <CancelIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No dismissed tasks
              </Typography>
            </Box>
          ) : (
            <Box>
              {dismissedTasks.map(task => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </Box>
          )}
        </TabPanel>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newTask.type}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
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
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
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
              value={newTask.dueDate ? new Date(newTask.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setNewTask({ 
                ...newTask, 
                dueDate: e.target.value ? new Date(e.target.value) : undefined 
              })}
            />

            <TextField
              fullWidth
              type="number"
              label="Estimated Impact ($)"
              value={newTask.estimatedImpact || ''}
              onChange={(e) => setNewTask({ 
                ...newTask, 
                estimatedImpact: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
            />

            <TextField
              fullWidth
              label="Impact Description"
              value={newTask.impactDescription || ''}
              onChange={(e) => setNewTask({ ...newTask, impactDescription: e.target.value })}
              placeholder="e.g., Annual savings, performance improvement..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};