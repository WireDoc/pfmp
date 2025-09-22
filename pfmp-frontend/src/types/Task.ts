export const TaskType = {
  Rebalancing: 1,
  StockPurchase: 2,
  TaxLossHarvesting: 3,
  CashOptimization: 4,
  GoalAdjustment: 5,
  InsuranceReview: 6,
  EmergencyFundContribution: 7,
  TSPAllocationChange: 8
} as const;

export type TaskType = typeof TaskType[keyof typeof TaskType];

export const TaskStatus = {
  Pending: 1,
  Accepted: 2,
  InProgress: 3,
  Completed: 4,
  Dismissed: 5
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const TaskPriority = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
} as const;

export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

export interface Task {
  taskId?: number;
  userId: number;
  type: TaskType;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdDate: Date;
  dueDate?: Date;
  completedDate?: Date;
  dismissedDate?: Date;
  sourceAlertId?: number;
  notes?: string;
  completionNotes?: string;
  estimatedImpact?: number;
  impactDescription?: string;
  progressPercentage: number;
  confidenceScore?: number;
}

export interface CreateTaskRequest {
  userId: number;
  type: TaskType;
  title: string;
  description: string;
  priority?: TaskPriority;
  dueDate?: Date;
  sourceAlertId?: number;
  estimatedImpact?: number;
  impactDescription?: string;
  confidenceScore?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
  notes?: string;
  progressPercentage?: number;
}

export interface CompleteTaskRequest {
  completionNotes?: string;
}

// Utility functions for display
export const getTaskTypeLabel = (type: TaskType): string => {
  const labels = {
    [TaskType.Rebalancing]: 'Portfolio Rebalancing',
    [TaskType.StockPurchase]: 'Stock Purchase',
    [TaskType.TaxLossHarvesting]: 'Tax Loss Harvesting',
    [TaskType.CashOptimization]: 'Cash Optimization',
    [TaskType.GoalAdjustment]: 'Goal Adjustment',
    [TaskType.InsuranceReview]: 'Insurance Review',
    [TaskType.EmergencyFundContribution]: 'Emergency Fund',
    [TaskType.TSPAllocationChange]: 'TSP Allocation Change'
  };
  return labels[type] || 'Unknown';
};

export const getTaskStatusLabel = (status: TaskStatus): string => {
  const labels = {
    [TaskStatus.Pending]: 'Pending',
    [TaskStatus.Accepted]: 'Accepted',
    [TaskStatus.InProgress]: 'In Progress',
    [TaskStatus.Completed]: 'Completed',
    [TaskStatus.Dismissed]: 'Dismissed'
  };
  return labels[status] || 'Unknown';
};

export const getTaskPriorityLabel = (priority: TaskPriority): string => {
  const labels = {
    [TaskPriority.Low]: 'Low',
    [TaskPriority.Medium]: 'Medium',
    [TaskPriority.High]: 'High',
    [TaskPriority.Critical]: 'Critical'
  };
  return labels[priority] || 'Unknown';
};

export const getTaskPriorityColor = (priority: TaskPriority): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colors = {
    [TaskPriority.Low]: 'default' as const,
    [TaskPriority.Medium]: 'primary' as const,
    [TaskPriority.High]: 'warning' as const,
    [TaskPriority.Critical]: 'error' as const
  };
  return colors[priority] || 'default';
};

export const getTaskStatusColor = (status: TaskStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colors = {
    [TaskStatus.Pending]: 'default' as const,
    [TaskStatus.Accepted]: 'info' as const,
    [TaskStatus.InProgress]: 'primary' as const,
    [TaskStatus.Completed]: 'success' as const,
    [TaskStatus.Dismissed]: 'secondary' as const
  };
  return colors[status] || 'default';
};