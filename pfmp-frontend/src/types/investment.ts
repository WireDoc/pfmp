/**
 * Investment Analysis Engine - Core Types and Interfaces
 */

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';
export type TimeHorizon = 'short' | 'medium' | 'long'; // <2y, 2-10y, >10y
export type GoalType = 'emergency_fund' | 'retirement' | 'house_down_payment' | 'education' | 'vacation' | 'general_wealth';
export type AssetClass = 'cash' | 'bonds' | 'stocks' | 'etfs' | 'mutual_funds' | 'reits' | 'crypto' | 'commodities';
export type InvestmentType = 'high_yield_savings' | 'cd' | 'treasury' | 'corporate_bonds' | 'dividend_stocks' | 'growth_stocks' | 'index_etf' | 'sector_etf' | 'crypto' | 'reit';

export interface UserProfile {
  age: number;
  riskTolerance: RiskTolerance;
  investmentExperience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  annualIncome: number;
  currentSavings: number;
  monthlyInvestmentCapacity: number;
  taxBracket: number;
  hasEmergencyFund: boolean;
  retirementGoalAge: number;
}

export interface FinancialGoal {
  id: string;
  type: GoalType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  timeHorizon: TimeHorizon;
  priority: 'high' | 'medium' | 'low';
  riskTolerance: RiskTolerance;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  expenseRatio?: number; // For ETFs/Mutual Funds
  apy?: number; // For savings/CDs
  minimumInvestment?: number;
}

export interface InvestmentOption {
  id: string;
  name: string;
  symbol: string;
  type: InvestmentType;
  assetClass: AssetClass;
  currentYield: number;
  projectedReturn: number; // Annual expected return
  riskLevel: RiskTolerance;
  minimumInvestment: number;
  liquidityDays: number; // Days to convert to cash
  expenseRatio?: number;
  taxEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
  pros: string[];
  cons: string[];
  marketData?: MarketData;
}

export interface AllocationRecommendation {
  assetClass: AssetClass;
  percentage: number;
  amount: number;
  reasoning: string;
  specificOptions: InvestmentOption[];
}

export interface InvestmentRecommendation {
  goalId: string;
  totalAmount: number;
  allocations: AllocationRecommendation[];
  riskScore: number;
  projectedReturn: number;
  timeToGoal: number; // years
  monthlyContribution: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  warnings: string[];
  alternatives: string[];
}

export interface MarketConditions {
  marketTrend: 'bull' | 'bear' | 'sideways';
  volatilityIndex: number; // VIX
  interestRates: {
    fedRate: number;
    treasury10y: number;
    savingsApy: number;
    cdRates: { term: string; apy: number }[];
  };
  inflationRate: number;
  economicIndicators: {
    gdpGrowth: number;
    unemployment: number;
    consumerConfidence: number;
  };
}

/**
 * Investment Analysis Engine Interface
 */
export interface IInvestmentAnalyzer {
  analyzePortfolio(userProfile: UserProfile, goals: FinancialGoal[], currentHoldings: any[]): Promise<InvestmentRecommendation[]>;
  getMarketData(symbols: string[]): Promise<MarketData[]>;
  getInvestmentOptions(filters: { assetClass?: AssetClass; riskLevel?: RiskTolerance; minYield?: number }): Promise<InvestmentOption[]>;
  getMarketConditions(): Promise<MarketConditions>;
  optimizeAllocation(amount: number, goal: FinancialGoal, userProfile: UserProfile): Promise<AllocationRecommendation[]>;
  calculateProjectedGrowth(amount: number, monthlyContribution: number, years: number, expectedReturn: number): number;
  assessRisk(allocations: AllocationRecommendation[], marketConditions: MarketConditions): number;
}