/**
 * Portfolio Analytics API Service
 * Handles requests for performance, allocation, tax insights, and risk metrics
 */

import { http } from './httpClient';

// ============================================================================
// TypeScript Interfaces (matching backend DTOs)
// ============================================================================

export interface ReturnValue {
  dollar: number;
  percent: number;
}

export interface BenchmarkComparison {
  name: string;
  symbol: string;
  return: number;
  volatility: number;
  sharpeRatio: number;
}

export interface PerformanceDataPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
}

export interface PerformanceMetrics {
  totalReturn: ReturnValue;
  timeWeightedReturn: number;
  moneyWeightedReturn: number;
  sharpeRatio: number;
  volatility: number;
  benchmarks: BenchmarkComparison[];
  historicalPerformance: PerformanceDataPoint[];
}

export interface AllocationItem {
  category: string;
  value: number;
  percent: number;
  targetPercent?: number;
  drift?: number;
}

export interface RebalancingRecommendation {
  action: string; // "Buy" or "Sell"
  holding: string;
  shares?: number;
  dollarAmount?: number;
  reason: string;
}

export interface AllocationBreakdown {
  dimension: string;
  allocations: AllocationItem[];
  rebalancingRecommendations: RebalancingRecommendation[];
}

export interface HoldingTaxDetail {
  symbol: string;
  name: string;
  costBasis: number;
  currentValue: number;
  gainLoss: number;
  percentGain: number;
  holdingPeriod: string;
  taxType: string; // "shortTerm" or "longTerm"
  purchaseDate: string;
}

export interface TaxLossOpportunity {
  symbol: string;
  loss: number;
  holdingPeriod: string;
  taxSavings: number;
  replacementSuggestion?: string;
  reason: string;
}

export interface EstimatedTaxLiability {
  shortTermTax: number;
  longTermTax: number;
  totalFederalTax: number;
  taxRate: number;
}

export interface UnrealizedGainsSummary {
  shortTerm: ReturnValue;
  longTerm: ReturnValue;
  total: ReturnValue;
}

export interface TaxInsights {
  unrealizedGains: UnrealizedGainsSummary;
  holdings: HoldingTaxDetail[];
  harvestingOpportunities: TaxLossOpportunity[];
  estimatedTaxLiability: EstimatedTaxLiability;
}

export interface VolatilityDataPoint {
  date: string;
  volatility: number;
}

export interface DrawdownDataPoint {
  date: string;
  drawdown: number;
}

export interface CorrelationPair {
  symbol1: string;
  symbol2: string;
  correlation: number;
}

export interface RiskMetrics {
  volatility: number;
  beta: number;
  maxDrawdown: number;
  maxDrawdownDate?: string;
  correlationMatrix: CorrelationPair[];
  volatilityHistory: VolatilityDataPoint[];
  drawdownHistory: DrawdownDataPoint[];
}

// Transaction history status for opening balance workflow
export interface HoldingOpeningBalanceInfo {
  holdingId: number;
  symbol: string;
  currentQuantity: number;
  currentPrice: number;
  /** Quantity accounted for by existing transactions (buys - sells) */
  transactionsQuantity: number;
  /** Quantity that needs opening balance (currentQuantity - transactionsQuantity) */
  missingQuantity: number;
}

export interface TransactionHistoryStatus {
  isComplete: boolean;
  isPlaidLinked: boolean;
  hasInitialBalance: boolean;
  firstTransactionDate: string | null;
  message: string;
  holdingsNeedingBalance: HoldingOpeningBalanceInfo[];
}

export interface OpeningBalanceEntry {
  holdingId: number;
  quantity: number;
  pricePerShare: number;
  date: string;
}

export interface AddOpeningBalancesRequest {
  balances: OpeningBalanceEntry[];
}

// ============================================================================
// Period Type
// ============================================================================

export type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'All';

export type AllocationDimension = 'assetClass' | 'sector' | 'geography' | 'marketCap';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch performance metrics for an account
 */
export const fetchPerformanceMetrics = async (
  accountId: number,
  period: Period = '1Y'
): Promise<PerformanceMetrics> => {
  const response = await http.get<PerformanceMetrics>(
    `/portfolios/${accountId}/performance`,
    { params: { period } }
  );
  return response.data;
};

/**
 * Fetch allocation breakdown for an account
 */
export const fetchAllocationBreakdown = async (
  accountId: number,
  dimension: AllocationDimension = 'assetClass'
): Promise<AllocationBreakdown> => {
  const response = await http.get<AllocationBreakdown>(
    `/portfolios/${accountId}/allocation`,
    { params: { dimension } }
  );
  return response.data;
};

/**
 * Fetch tax insights for an account
 */
export const fetchTaxInsights = async (
  accountId: number
): Promise<TaxInsights> => {
  const response = await http.get<TaxInsights>(
    `/portfolios/${accountId}/tax-insights`
  );
  return response.data;
};

/**
 * Fetch risk metrics for an account
 */
export const fetchRiskMetrics = async (
  accountId: number,
  period: Period = '1Y'
): Promise<RiskMetrics> => {
  const response = await http.get<RiskMetrics>(
    `/portfolios/${accountId}/risk-metrics`,
    { params: { period } }
  );
  return response.data;
};

/**
 * Fetch transaction history status for an account
 * Used to detect if opening balances are needed for accurate performance calculations
 */
export const fetchTransactionHistoryStatus = async (
  accountId: number
): Promise<TransactionHistoryStatus> => {
  const response = await http.get<TransactionHistoryStatus>(
    `/portfolios/${accountId}/transaction-history-status`
  );
  return response.data;
};

/**
 * Add opening balances for holdings in an account
 * Creates INITIAL_BALANCE transactions to establish starting positions
 */
export const addOpeningBalances = async (
  accountId: number,
  request: AddOpeningBalancesRequest
): Promise<void> => {
  await http.post(`/portfolios/${accountId}/opening-balances`, request);
};
