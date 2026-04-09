/**
 * API service for the dashboard overview widgets:
 * - Financial Health Score
 * - Cash Flow Summary
 * - Upcoming Obligations
 */

import { getDevUserId } from '../../dev/devUserState';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5052/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const DASHBOARD_BASE = `${API_ORIGIN}/api/dashboard`;
const FALLBACK_USER_ID = (import.meta.env?.VITE_PFMP_DASHBOARD_USER_ID ?? '1').toString();

function getEffectiveUserId(): string {
  const devUserId = getDevUserId();
  return devUserId !== null ? devUserId.toString() : FALLBACK_USER_ID;
}

// --- Types ---

export interface HealthScoreBreakdownItem {
  score: number;
  weight: number;
  [key: string]: unknown;
}

export interface HealthScoreData {
  overallScore: number;
  grade: string;
  breakdown: {
    emergencyFund: HealthScoreBreakdownItem & { monthsCovered: number | null };
    debtToIncome: HealthScoreBreakdownItem & { dtiPercent: number | null };
    savingsRate: HealthScoreBreakdownItem & { ratePercent: number };
    insuranceCoverage: HealthScoreBreakdownItem & { policiesCount: number; adequateCount: number };
    diversification: HealthScoreBreakdownItem & { assetClassCount: number };
    goalProgress: HealthScoreBreakdownItem & { goalsCount: number };
  };
  computedAt: string;
}

export interface CashFlowCategory {
  category: string;
  monthlyAmount: number;
}

export interface CashFlowData {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  incomeBreakdown: CashFlowCategory[];
  expenseBreakdown: CashFlowCategory[];
  computedAt: string;
}

export interface UpcomingObligation {
  id: number;
  name: string;
  type: string;
  targetDate: string;
  estimatedCost: number;
  fundsAllocated: number;
  fundingProgressPct: number;
  fundingStatus: string;
  isCritical: boolean;
}

export interface UpcomingObligationsData {
  obligations: UpcomingObligation[];
  total: number;
}

// --- API calls ---

export async function fetchHealthScore(): Promise<HealthScoreData> {
  const userId = getEffectiveUserId();
  const resp = await fetch(`${DASHBOARD_BASE}/health-score?userId=${encodeURIComponent(userId)}`);
  if (!resp.ok) throw new Error(`Failed to fetch health score (${resp.status})`);
  return resp.json();
}

export async function fetchCashFlowSummary(): Promise<CashFlowData> {
  const userId = getEffectiveUserId();
  const resp = await fetch(`${DASHBOARD_BASE}/cash-flow-summary?userId=${encodeURIComponent(userId)}`);
  if (!resp.ok) throw new Error(`Failed to fetch cash flow summary (${resp.status})`);
  return resp.json();
}

export async function fetchUpcomingObligations(count = 3): Promise<UpcomingObligationsData> {
  const userId = getEffectiveUserId();
  const resp = await fetch(`${DASHBOARD_BASE}/upcoming-obligations?userId=${encodeURIComponent(userId)}&count=${count}`);
  if (!resp.ok) throw new Error(`Failed to fetch upcoming obligations (${resp.status})`);
  return resp.json();
}
