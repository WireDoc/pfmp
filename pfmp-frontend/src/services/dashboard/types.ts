// Wave 4 Dashboard domain types
// These interfaces define the contract between UI and data services (mock or real).

export interface CurrencyAmount {
  amount: number;        // raw major units
  currency: string;      // ISO 4217 code e.g. 'USD'
}

export interface NetWorthSummary {
  totalAssets: CurrencyAmount;
  totalLiabilities: CurrencyAmount;
  netWorth: CurrencyAmount;
  change1dPct?: number;
  change30dPct?: number;
  lastUpdated: string; // ISO string
}

export type AccountType = 'cash' | 'bank' | 'brokerage' | 'credit' | 'loan' | 'retirement' | 'other';
export type SyncStatus = 'ok' | 'pending' | 'error' | 'manual';

export interface AccountSnapshot {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: CurrencyAmount;
  syncStatus: SyncStatus;
  lastSync: string; // ISO
  isCashAccount?: boolean; // Flag for UUID-based cash accounts
}

export type InsightCategory = 'cashflow' | 'allocation' | 'savings' | 'risk' | 'general';
export type InsightSeverity = 'info' | 'warn' | 'critical';

export interface Insight {
  id: string;
  category: InsightCategory;
  title: string;
  body: string;
  severity: InsightSeverity;
  generatedAt: string; // ISO
}

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AlertCategory =
  | 'Portfolio'
  | 'Banking'
  | 'Cashflow'
  | 'Insurance'
  | 'Planning'
  | 'General'
  | string;

export interface AlertCard {
  alertId: number;
  userId: number;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  isActionable: boolean;
  portfolioImpactScore?: number | null;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
  expiresAt: string | null;
  actionUrl: string | null;
}

export type AdviceStatus = 'Proposed' | 'Accepted' | 'Dismissed' | string;

export interface AdviceItem {
  adviceId: number;
  userId: number;
  theme: string;
  status: AdviceStatus;
  consensusText: string;
  confidenceScore?: number | null;
  sourceAlertId: number | null;
  linkedTaskId: number | null;
  createdAt: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | string;
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Dismissed' | string;

export interface TaskItem {
  taskId: number;
  userId: number;
  type: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdDate: string;
  dueDate: string | null;
  sourceAdviceId: number | null;
  sourceAlertId: number | null;
  progressPercentage?: number | null;
  confidenceScore?: number | null;
}

export interface LongTermObligationSummary {
  count: number;
  totalEstimate: number;
  nextDueDate: string | null;
}

export type LongTermObligationListener = (summary: LongTermObligationSummary | undefined) => void;

export interface PropertySnapshot {
  id: number;
  address: string;
  type: string;
  estimatedValue: CurrencyAmount;
  mortgageBalance: CurrencyAmount;
  lastUpdated: string | null;
}

export interface LiabilitySnapshot {
  id: number;
  name: string;
  type: string;
  currentBalance: CurrencyAmount;
  minimumPayment: CurrencyAmount;
  interestRate: number | null;
  lastUpdated: string | null;
  propertyId?: string | null;  // If set, this is a property mortgage (not a standalone liability)
}

export interface DashboardData {
  netWorth: NetWorthSummary;
  accounts: AccountSnapshot[];
  properties?: PropertySnapshot[];
  liabilities?: LiabilitySnapshot[];
  insights: Insight[];
  alerts: AlertCard[];
  advice: AdviceItem[];
  tasks: TaskItem[];
  longTermObligations?: LongTermObligationSummary;
}

export interface DashboardService {
  load(): Promise<DashboardData>;
  subscribeToLongTermObligations?(listener: LongTermObligationListener): () => void;
  createFollowUpTask?(request: CreateFollowUpTaskRequest): Promise<{ taskId: number | null }>;
  updateTaskStatus?(request: UpdateTaskStatusRequest): Promise<void>;
  updateTaskProgress?(request: UpdateTaskProgressRequest): Promise<void>;
  completeTask?(request: CompleteTaskRequestPayload): Promise<void>;
  // Future: subscribe(cb: (partial: Partial<DashboardData>) => void): () => void;
}

export interface CreateFollowUpTaskRequest {
  userId: number;
  type: number;
  title: string;
  description: string;
  priority: number;
  dueDate?: string | null;
  sourceAlertId?: number | null;
  estimatedImpact?: number | null;
  impactDescription?: string | null;
  confidenceScore?: number | null;
}

export interface UpdateTaskStatusRequest {
  taskId: number;
  status: TaskStatus;
}

export interface UpdateTaskProgressRequest {
  taskId: number;
  progressPercentage: number;
}

export interface CompleteTaskRequestPayload {
  taskId: number;
  completionNotes?: string | null;
}

export const TASK_PRIORITY_TO_ENUM: Record<TaskPriority, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

export const TASK_PRIORITY_FROM_ENUM: Record<number, TaskPriority> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
};

export const DEFAULT_TASK_PRIORITY_ENUM = TASK_PRIORITY_TO_ENUM['Medium'];

export const TASK_STATUS_TO_ENUM: Record<TaskStatus, number> = {
  Pending: 1,
  Accepted: 2,
  InProgress: 3,
  Completed: 4,
  Dismissed: 5,
};

export const TASK_STATUS_FROM_ENUM: Record<number, TaskStatus> = {
  1: 'Pending',
  2: 'Accepted',
  3: 'InProgress',
  4: 'Completed',
  5: 'Dismissed',
};

export const TASK_TYPE_FROM_ENUM: Record<number, string> = {
  1: 'Rebalancing',
  2: 'StockPurchase',
  3: 'TaxLossHarvesting',
  4: 'CashOptimization',
  5: 'GoalAdjustment',
  6: 'InsuranceReview',
  7: 'EmergencyFundContribution',
  8: 'TSPAllocationChange',
};
