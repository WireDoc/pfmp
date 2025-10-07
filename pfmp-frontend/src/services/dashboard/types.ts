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

export type AccountType = 'bank' | 'brokerage' | 'credit' | 'loan' | 'retirement' | 'other';
export type SyncStatus = 'ok' | 'pending' | 'error';

export interface AccountSnapshot {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: CurrencyAmount;
  syncStatus: SyncStatus;
  lastSync: string; // ISO
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

export interface DashboardData {
  netWorth: NetWorthSummary;
  accounts: AccountSnapshot[];
  insights: Insight[];
  alerts: AlertCard[];
  advice: AdviceItem[];
  tasks: TaskItem[];
}

export interface DashboardService {
  load(): Promise<DashboardData>;
  // Future: subscribe(cb: (partial: Partial<DashboardData>) => void): () => void;
}
