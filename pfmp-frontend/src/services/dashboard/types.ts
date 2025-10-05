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

export interface DashboardData {
  netWorth: NetWorthSummary;
  accounts: AccountSnapshot[];
  insights: Insight[];
}

export interface DashboardService {
  load(): Promise<DashboardData>;
  // Future: subscribe(cb: (partial: Partial<DashboardData>) => void): () => void;
}
