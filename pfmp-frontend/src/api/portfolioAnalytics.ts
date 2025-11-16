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
  value: number;
  portfolioReturn: number;
  benchmarkReturn: number;
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
  name: string;
  value: number;
  percentage: number;
  targetPercentage?: number;
  deviation?: number;
}

export interface RebalancingRecommendation {
  action: 'Buy' | 'Sell';
  security: string;
  currentValue: number;
  targetValue: number;
  difference: number;
  shares?: number;
}

export interface AllocationBreakdown {
  dimension: string;
  allocations: AllocationItem[];
  rebalancingRecommendations: RebalancingRecommendation[];
}

export interface HoldingTaxDetail {
  symbol: string;
  securityName: string;
  shares: number;
  costBasis: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  holdingPeriodDays: number;
  isLongTerm: boolean;
  estimatedTaxIfSold: number;
}

export interface TaxLossOpportunity {
  symbol: string;
  securityName: string;
  unrealizedLoss: number;
  potentialTaxSavings: number;
  replacementSuggestion?: string;
}

export interface TaxInsights {
  totalUnrealizedGain: number;
  shortTermGain: number;
  longTermGain: number;
  estimatedTaxLiability: number;
  holdingDetails: HoldingTaxDetail[];
  harvestingOpportunities: TaxLossOpportunity[];
}

export interface VolatilityDataPoint {
  date: string;
  volatility: number;
}

export interface DrawdownDataPoint {
  date: string;
  drawdown: number;
}

export interface RiskMetrics {
  volatility: number;
  beta: number;
  maxDrawdown: number;
  maxDrawdownDate?: string;
  correlationMatrix: Record<string, Record<string, number>>;
  volatilityHistory: VolatilityDataPoint[];
  drawdownHistory: DrawdownDataPoint[];
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
