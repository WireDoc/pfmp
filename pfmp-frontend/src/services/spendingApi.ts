/**
 * Wave 14 P2: spending dashboard API client.
 * Wraps /api/spending endpoints (summary, cash-flow, by-category, top-merchants,
 * transactions, budgets, rules, recompute).
 */
import apiClient from './api';

// ---------- Cash-flow summary ----------

export interface InflowByType {
  type: string;
  amount: number;
  source: string;
  isProfileOnly: boolean;
  isAmbiguousAllotment: boolean;
}

export interface SavingsAllotment {
  incomeStreamId: string;
  name: string;
  amount: number;
  destinationAccountId: number | null;
  destinationName: string | null;
}

export interface InflowSection {
  byIncomeType: InflowByType[];
  savingsAllotments: SavingsAllotment[];
}

export interface OutflowByCategory {
  category: string;
  actual: number;
  budgeted: number | null;
  source: string;
  isProfileOnly: boolean;
}

export interface InsurancePremium {
  policyType: string;
  policyName: string | null;
  monthlyAmount: number;
  renewalDate: string | null;
}

export interface ExternalAllotment {
  incomeStreamId: string;
  name: string;
  amount: number;
  notes: string | null;
}

export interface OutflowSection {
  byPlaidPrimary: OutflowByCategory[];
  insurancePremiums: InsurancePremium[];
  externalAllotments: ExternalAllotment[];
}

export interface CashFlowVariance {
  stream: string;
  profile: number;
  plaid: number;
  deltaPercent: number;
  severity: string;
}

export interface CashFlowSummary {
  totalMonthlyInflows: number;
  totalMonthlyOutflows: number;
  netMonthlyCashFlow: number;
  inflows: InflowSection;
  outflows: OutflowSection;
  variances: CashFlowVariance[];
  asOfUtc: string;
}

// ---------- Monthly summary / category / merchants / transactions ----------

export interface MonthlySummary {
  from: string;
  to: string;
  totalInflows: number;
  totalOutflows: number;
  net: number;
  transactionCount: number;
}

export interface CategoryRollup {
  plaidPrimaryCategory: string;
  plaidDetailedCategory: string | null;
  actualAmount: number;
  budgetedAmount: number | null;
  transactionCount: number;
}

export interface MerchantAggregate {
  merchant: string;
  totalSpent: number;
  transactionCount: number;
  topCategory: string | null;
}

export interface CashTransaction {
  cashTransactionId: number;
  cashAccountId: number | null;
  liabilityAccountId: number | null;
  transactionDate: string;
  amount: number;
  merchant: string | null;
  description: string | null;
  category: string | null;
  plaidCategory: string | null;
  plaidCategoryDetailed: string | null;
}

// ---------- Budgets ----------

export type BudgetPeriodType = 'Monthly' | 'Weekly' | 'Biweekly' | 'Annual';

export interface ExpenseBudget {
  expenseBudgetId: number;
  userId: number;
  category: string;
  monthlyAmount: number;
  isEstimated: boolean;
  notes: string | null;
  periodType: BudgetPeriodType;
  effectiveFrom: string;
  effectiveTo: string | null;
  rolloverEnabled: boolean;
  rolloverAmount: number;
  plaidPrimaryCategory: string | null;
  plaidDetailedCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseBudgetInput = Omit<ExpenseBudget, 'expenseBudgetId' | 'createdAt' | 'updatedAt'>;

// ---------- Rules ----------

export type SpendingCategoryRuleMatchType =
  | 'MerchantExact'
  | 'MerchantContains'
  | 'DescriptionContains'
  | 'PlaidDetailedCategory';

export interface SpendingCategoryRule {
  ruleId: number;
  userId: number;
  matchType: SpendingCategoryRuleMatchType;
  matchValue: string;
  assignedPrimaryCategory: string;
  assignedDetailedCategory: string | null;
  priority: number;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;
}

// ---------- Recompute ----------

export interface RecomputeResponse {
  recomputed: boolean;
  asOf: string;
}

// ---------- Endpoint helpers ----------

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export async function getCashFlowSummary(userId: number): Promise<CashFlowSummary> {
  const { data } = await apiClient.get<CashFlowSummary>('/spending/cash-flow-summary', { params: { userId } });
  return data;
}

export async function getMonthlySummary(userId: number, range?: DateRangeParams): Promise<MonthlySummary> {
  const { data } = await apiClient.get<MonthlySummary>('/spending/summary', { params: { userId, ...range } });
  return data;
}

export async function getByCategory(userId: number, range?: DateRangeParams): Promise<CategoryRollup[]> {
  const { data } = await apiClient.get<CategoryRollup[]>('/spending/by-category', {
    params: { userId, periodStart: range?.from, periodEnd: range?.to },
  });
  return data;
}

export async function getTopMerchants(
  userId: number,
  options?: { limit?: number } & DateRangeParams,
): Promise<MerchantAggregate[]> {
  const { data } = await apiClient.get<MerchantAggregate[]>('/spending/top-merchants', {
    params: { userId, limit: options?.limit ?? 10, from: options?.from, to: options?.to },
  });
  return data;
}

export async function getSpendingTransactions(
  userId: number,
  options?: { category?: string } & DateRangeParams,
): Promise<CashTransaction[]> {
  const { data } = await apiClient.get<CashTransaction[]>('/spending/transactions', {
    params: { userId, category: options?.category, from: options?.from, to: options?.to },
  });
  return data;
}

export async function listBudgets(userId: number, asOf?: string): Promise<ExpenseBudget[]> {
  const { data } = await apiClient.get<ExpenseBudget[]>('/spending/budgets', { params: { userId, asOf } });
  return data;
}

export async function createBudget(input: ExpenseBudgetInput): Promise<ExpenseBudget> {
  const { data } = await apiClient.post<ExpenseBudget>('/spending/budgets', input);
  return data;
}

export async function updateBudget(id: number, patch: ExpenseBudgetInput): Promise<ExpenseBudget> {
  const { data } = await apiClient.put<ExpenseBudget>(`/spending/budgets/${id}`, patch);
  return data;
}

export async function deleteBudget(id: number): Promise<void> {
  await apiClient.delete(`/spending/budgets/${id}`);
}

export async function listRules(userId: number): Promise<SpendingCategoryRule[]> {
  const { data } = await apiClient.get<SpendingCategoryRule[]>('/spending/rules', { params: { userId } });
  return data;
}

export async function recomputeRollups(userId: number): Promise<RecomputeResponse> {
  const { data } = await apiClient.post<RecomputeResponse>('/spending/recompute', null, { params: { userId } });
  return data;
}

/**
 * Group Plaid primary rows that share a primary category (detailed rows duplicate the
 * parent because the backend keys rollups on (primary, detailed)). Returns one entry per
 * primary with summed actual + summed budgeted, and a `detailed` array for drilldown.
 */
export interface CategoryRollupGrouped {
  plaidPrimaryCategory: string;
  totalActual: number;
  totalBudgeted: number | null;
  transactionCount: number;
  detailed: CategoryRollup[];
}

export function groupByPlaidPrimary(rows: CategoryRollup[]): CategoryRollupGrouped[] {
  const map = new Map<string, CategoryRollupGrouped>();
  for (const row of rows) {
    const key = row.plaidPrimaryCategory;
    const existing = map.get(key);
    if (existing) {
      existing.totalActual += row.actualAmount;
      existing.transactionCount += row.transactionCount;
      if (row.budgetedAmount !== null) {
        existing.totalBudgeted = (existing.totalBudgeted ?? 0) + row.budgetedAmount;
      }
      existing.detailed.push(row);
    } else {
      map.set(key, {
        plaidPrimaryCategory: key,
        totalActual: row.actualAmount,
        totalBudgeted: row.budgetedAmount,
        transactionCount: row.transactionCount,
        detailed: [row],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalActual - a.totalActual);
}
