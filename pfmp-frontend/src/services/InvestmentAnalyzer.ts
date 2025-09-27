import type { 
  UserProfile, 
  FinancialGoal, 
  InvestmentOption, 
  AllocationRecommendation, 
  InvestmentRecommendation,
  MarketConditions,
  MarketData,
  IInvestmentAnalyzer,
  RiskTolerance,
  AssetClass
} from '../types/investment';

/**
 * Smart Investment Analysis Engine
 * Provides personalized investment recommendations based on user profile, goals, and market conditions
 */
export class InvestmentAnalyzer implements IInvestmentAnalyzer {

  /**
   * Get current investment options with real-time data
   */
  async getInvestmentOptions(filters: { assetClass?: AssetClass; riskLevel?: RiskTolerance; minYield?: number } = {}): Promise<InvestmentOption[]> {
    // In production, this would fetch from multiple financial data APIs
    const allOptions: InvestmentOption[] = [
      // HIGH-YIELD SAVINGS & CDs (Conservative)
      {
        id: 'marcus-savings',
        name: 'Marcus High-Yield Savings',
        symbol: 'MARCUS-HY',
        type: 'high_yield_savings',
        assetClass: 'cash',
        currentYield: 4.5,
        projectedReturn: 4.5,
        riskLevel: 'conservative',
        minimumInvestment: 0,
        liquidityDays: 0,
        taxEfficiency: 'poor',
        description: 'FDIC-insured high-yield savings account',
        pros: ['FDIC insured', 'No minimum balance', 'Instant liquidity'],
        cons: ['Taxable interest', 'Lower than inflation historically']
      },
      {
        id: 'ally-cd-12m',
        name: 'Ally 12-Month CD',
        symbol: 'ALLY-CD-12M',
        type: 'cd',
        assetClass: 'cash',
        currentYield: 4.75,
        projectedReturn: 4.75,
        riskLevel: 'conservative',
        minimumInvestment: 0,
        liquidityDays: 365,
        taxEfficiency: 'poor',
        description: 'FDIC-insured 12-month Certificate of Deposit',
        pros: ['FDIC insured', 'Fixed rate', 'Higher than savings'],
        cons: ['Locked for 12 months', 'Early withdrawal penalty']
      },
      
      // TREASURY & BONDS
      {
        id: 'treasury-bills',
        name: 'US Treasury Bills (3-Month)',
        symbol: 'BIL',
        type: 'treasury',
        assetClass: 'bonds',
        currentYield: 4.8,
        projectedReturn: 4.8,
        riskLevel: 'conservative',
        minimumInvestment: 100,
        liquidityDays: 1,
        expenseRatio: 0.135,
        taxEfficiency: 'good',
        description: 'Government-backed short-term Treasury bills',
        pros: ['Government backed', 'Tax-advantaged', 'Very liquid'],
        cons: ['Interest rate risk', 'Lower long-term returns']
      },
      
      // ETFs & INDEX FUNDS
      {
        id: 'vti-total-market',
        name: 'Vanguard Total Stock Market ETF',
        symbol: 'VTI',
        type: 'index_etf',
        assetClass: 'etfs',
        currentYield: 1.3,
        projectedReturn: 8.5,
        riskLevel: 'moderate',
        minimumInvestment: 0,
        liquidityDays: 1,
        expenseRatio: 0.03,
        taxEfficiency: 'excellent',
        description: 'Broad US stock market exposure',
        pros: ['Diversified', 'Low fees', 'Tax efficient', 'Long-term growth'],
        cons: ['Market volatility', 'No principal protection']
      },
      {
        id: 'vxus-international',
        name: 'Vanguard Total International Stock ETF',
        symbol: 'VXUS',
        type: 'index_etf',
        assetClass: 'etfs',
        currentYield: 2.1,
        projectedReturn: 7.8,
        riskLevel: 'moderate',
        minimumInvestment: 0,
        liquidityDays: 1,
        expenseRatio: 0.08,
        taxEfficiency: 'excellent',
        description: 'International stock market exposure',
        pros: ['Geographic diversification', 'Currency hedge', 'Low fees'],
        cons: ['Currency risk', 'Political risk', 'Lower historical returns']
      },
      
      // DIVIDEND STOCKS
      {
        id: 'jnj-dividend',
        name: 'Johnson & Johnson',
        symbol: 'JNJ',
        type: 'dividend_stocks',
        assetClass: 'stocks',
        currentYield: 3.2,
        projectedReturn: 6.5,
        riskLevel: 'moderate',
        minimumInvestment: 0,
        liquidityDays: 1,
        taxEfficiency: 'good',
        description: 'Dividend Aristocrat with 61-year dividend growth',
        pros: ['Consistent dividends', 'Defensive sector', 'Strong balance sheet'],
        cons: ['Single company risk', 'Regulatory risk', 'Limited growth']
      },
      
      // REITs
      {
        id: 'vgslx-reit',
        name: 'Vanguard Real Estate Index',
        symbol: 'VGSLX',
        type: 'reit',
        assetClass: 'reits',
        currentYield: 3.8,
        projectedReturn: 7.2,
        riskLevel: 'moderate',
        minimumInvestment: 3000,
        liquidityDays: 1,
        expenseRatio: 0.12,
        taxEfficiency: 'fair',
        description: 'Diversified real estate investment trusts',
        pros: ['Real estate exposure', 'High dividends', 'Inflation hedge'],
        cons: ['Interest rate sensitive', 'Sector concentration', 'Tax inefficient']
      },
      
      // CRYPTOCURRENCY
      {
        id: 'bitcoin-btc',
        name: 'Bitcoin',
        symbol: 'BTC',
        type: 'crypto',
        assetClass: 'crypto',
        currentYield: 0,
        projectedReturn: 15.0, // Highly speculative
        riskLevel: 'very_aggressive',
        minimumInvestment: 1,
        liquidityDays: 1,
        taxEfficiency: 'fair',
        description: 'Digital store of value and payment system',
        pros: ['Inflation hedge', 'High growth potential', '24/7 trading'],
        cons: ['Extreme volatility', 'Regulatory risk', 'No intrinsic value']
      }
    ];

    return allOptions.filter(option => {
      if (filters.assetClass && option.assetClass !== filters.assetClass) return false;
      if (filters.riskLevel && option.riskLevel !== filters.riskLevel) return false;
      if (filters.minYield && option.currentYield < filters.minYield) return false;
      return true;
    });
  }

  /**
   * Optimize allocation based on user profile and goals
   */
  async optimizeAllocation(amount: number, goal: FinancialGoal, userProfile: UserProfile): Promise<AllocationRecommendation[]> {
    const marketConditions = await this.getMarketConditions();
    const availableOptions = await this.getInvestmentOptions();
    
    // Determine allocation strategy based on goal and risk tolerance
    let allocationStrategy = this.determineAllocationStrategy(goal, userProfile, marketConditions);
    
    return allocationStrategy.map(allocation => ({
      ...allocation,
      amount: (allocation.percentage / 100) * amount,
      specificOptions: availableOptions.filter(option => 
        option.assetClass === allocation.assetClass &&
        this.isOptionSuitableForProfile(option, userProfile, goal)
      ).slice(0, 3) // Top 3 options per asset class
    }));
  }

  /**
   * Determine allocation strategy based on multiple factors
   */
  private determineAllocationStrategy(goal: FinancialGoal, userProfile: UserProfile, marketConditions: MarketConditions): Omit<AllocationRecommendation, 'amount' | 'specificOptions'>[] {
    const timeHorizon = goal.timeHorizon;
    const riskTolerance = goal.riskTolerance;
    const goalType = goal.type;

    // Emergency Fund Strategy
    if (goalType === 'emergency_fund') {
      return [
        { assetClass: 'cash', percentage: 100, reasoning: 'Emergency funds require immediate liquidity and capital preservation' }
      ];
    }

    // Conservative Strategy (Short-term goals or conservative users)
    if (timeHorizon === 'short' || riskTolerance === 'conservative') {
      return [
        { assetClass: 'cash', percentage: 60, reasoning: 'High liquidity for short-term goals' },
        { assetClass: 'bonds', percentage: 35, reasoning: 'Stable income with low volatility' },
        { assetClass: 'stocks', percentage: 5, reasoning: 'Minimal equity exposure for slight growth' }
      ];
    }

    // Moderate Strategy (Medium-term goals)
    if (timeHorizon === 'medium' || riskTolerance === 'moderate') {
      return [
        { assetClass: 'cash', percentage: 10, reasoning: 'Emergency liquidity buffer' },
        { assetClass: 'bonds', percentage: 30, reasoning: 'Stable income component' },
        { assetClass: 'etfs', percentage: 45, reasoning: 'Diversified growth through low-cost index funds' },
        { assetClass: 'stocks', percentage: 10, reasoning: 'Individual stock selection for enhanced returns' },
        { assetClass: 'reits', percentage: 5, reasoning: 'Real estate exposure for diversification' }
      ];
    }

    // Aggressive Strategy (Long-term goals)
    if (timeHorizon === 'long' || riskTolerance === 'aggressive') {
      return [
        { assetClass: 'cash', percentage: 5, reasoning: 'Minimal cash for opportunities' },
        { assetClass: 'bonds', percentage: 15, reasoning: 'Reduced fixed income for growth focus' },
        { assetClass: 'etfs', percentage: 50, reasoning: 'Primary growth engine through diversified equity' },
        { assetClass: 'stocks', percentage: 20, reasoning: 'Individual growth and dividend stocks' },
        { assetClass: 'reits', percentage: 5, reasoning: 'Real estate diversification' },
        { assetClass: 'crypto', percentage: 5, reasoning: 'Alternative asset for long-term appreciation' }
      ];
    }

    // Very Aggressive Strategy
    return [
      { assetClass: 'etfs', percentage: 40, reasoning: 'Core equity growth position' },
      { assetClass: 'stocks', percentage: 35, reasoning: 'Individual high-growth stocks' },
      { assetClass: 'crypto', percentage: 15, reasoning: 'Digital assets for maximum growth potential' },
      { assetClass: 'reits', percentage: 5, reasoning: 'Alternative real estate exposure' },
      { assetClass: 'cash', percentage: 5, reasoning: 'Opportunity fund for market dips' }
    ];
  }

  /**
   * Check if investment option is suitable for user profile
   */
  private isOptionSuitableForProfile(option: InvestmentOption, userProfile: UserProfile, goal: FinancialGoal): boolean {
    // Risk tolerance check
    const riskLevels = { conservative: 0, moderate: 1, aggressive: 2, very_aggressive: 3 };
    if (riskLevels[option.riskLevel] > riskLevels[userProfile.riskTolerance]) {
      return false;
    }

    // Minimum investment check
    if (option.minimumInvestment > userProfile.monthlyInvestmentCapacity * 12) {
      return false;
    }

    // Liquidity check for short-term goals
    if (goal.timeHorizon === 'short' && option.liquidityDays > 30) {
      return false;
    }

    return true;
  }

  /**
   * Analyze complete portfolio and provide recommendations
   */
  async analyzePortfolio(userProfile: UserProfile, goals: FinancialGoal[], currentHoldings: any[]): Promise<InvestmentRecommendation[]> {
    const recommendations: InvestmentRecommendation[] = [];
    
    for (const goal of goals) {
      const remainingAmount = goal.targetAmount - goal.currentAmount;
      const yearsToGoal = (goal.targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      const allocations = await this.optimizeAllocation(remainingAmount, goal, userProfile);
      const projectedReturn = this.calculateWeightedReturn(allocations);
      const monthlyContribution = this.calculateRequiredMonthlyContribution(
        goal.currentAmount, 
        goal.targetAmount, 
        yearsToGoal, 
        projectedReturn
      );

      recommendations.push({
        goalId: goal.id,
        totalAmount: remainingAmount,
        allocations,
        riskScore: this.calculateRiskScore(allocations),
        projectedReturn,
        timeToGoal: yearsToGoal,
        monthlyContribution,
        confidence: this.assessConfidence(allocations, yearsToGoal),
        reasoning: this.generateRecommendationReasoning(goal, userProfile, allocations),
        warnings: this.generateWarnings(goal, userProfile, allocations),
        alternatives: this.generateAlternatives(goal, userProfile)
      });
    }

    return recommendations;
  }

  /**
   * Calculate weighted expected return across allocations
   */
  private calculateWeightedReturn(allocations: AllocationRecommendation[]): number {
    return allocations.reduce((total, allocation) => {
      const bestOption = allocation.specificOptions[0];
      const expectedReturn = bestOption ? bestOption.projectedReturn : 5.0;
      return total + (allocation.percentage / 100) * expectedReturn;
    }, 0);
  }

  /**
   * Calculate required monthly contribution to reach goal
   */
  private calculateRequiredMonthlyContribution(currentAmount: number, targetAmount: number, years: number, expectedReturn: number): number {
    const monthlyReturn = expectedReturn / 100 / 12;
    const totalMonths = years * 12;
    const futureValue = targetAmount;
    const presentValue = currentAmount;
    
    if (monthlyReturn === 0) {
      return (futureValue - presentValue) / totalMonths;
    }
    
    const futureValueOfPresentValue = presentValue * Math.pow(1 + monthlyReturn, totalMonths);
    const payment = (futureValue - futureValueOfPresentValue) / (((Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn));
    
    return Math.max(0, payment);
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateRiskScore(allocations: AllocationRecommendation[]): number {
    const riskWeights = { conservative: 20, moderate: 50, aggressive: 80, very_aggressive: 100 };
    
    return allocations.reduce((score, allocation) => {
      const avgRisk = allocation.specificOptions.reduce((sum, option) => 
        sum + riskWeights[option.riskLevel], 0) / allocation.specificOptions.length;
      return score + (allocation.percentage / 100) * avgRisk;
    }, 0);
  }

  /**
   * Assess recommendation confidence
   */
  private assessConfidence(allocations: AllocationRecommendation[], timeToGoal: number): 'high' | 'medium' | 'low' {
    if (timeToGoal > 10) return 'high';
    if (timeToGoal > 3) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable recommendation reasoning
   */
  private generateRecommendationReasoning(goal: FinancialGoal, userProfile: UserProfile, allocations: AllocationRecommendation[]): string {
    const primaryAllocation = allocations.reduce((max, current) => 
      current.percentage > max.percentage ? current : max
    );

    return `Based on your ${userProfile.riskTolerance} risk tolerance and ${goal.timeHorizon}-term timeline, we recommend a ${primaryAllocation.assetClass}-focused strategy. This allocation balances growth potential with your comfort level and timeline requirements.`;
  }

  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(goal: FinancialGoal, userProfile: UserProfile, allocations: AllocationRecommendation[]): string[] {
    const warnings: string[] = [];
    
    if (goal.timeHorizon === 'short' && allocations.some(a => a.assetClass === 'stocks' && a.percentage > 20)) {
      warnings.push('Short-term goals with significant stock exposure may not reach target due to market volatility');
    }
    
    if (!userProfile.hasEmergencyFund && goal.type !== 'emergency_fund') {
      warnings.push('Consider building an emergency fund before pursuing other investment goals');
    }
    
    return warnings;
  }

  /**
   * Generate alternative strategies
   */
  private generateAlternatives(goal: FinancialGoal, userProfile: UserProfile): string[] {
    const alternatives: string[] = [];
    
    if (goal.timeHorizon === 'medium') {
      alternatives.push('Consider a more aggressive allocation if you can tolerate higher volatility');
      alternatives.push('Dollar-cost averaging can reduce timing risk');
    }
    
    return alternatives;
  }

  /**
   * Mock market conditions (would integrate with real APIs)
   */
  async getMarketConditions(): Promise<MarketConditions> {
    return {
      marketTrend: 'bull',
      volatilityIndex: 18.5,
      interestRates: {
        fedRate: 5.25,
        treasury10y: 4.75,
        savingsApy: 4.5,
        cdRates: [
          { term: '6M', apy: 4.2 },
          { term: '1Y', apy: 4.75 },
          { term: '2Y', apy: 4.5 }
        ]
      },
      inflationRate: 3.2,
      economicIndicators: {
        gdpGrowth: 2.1,
        unemployment: 3.8,
        consumerConfidence: 102.3
      }
    };
  }

  /**
   * Mock market data (would integrate with real APIs)
   */
  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    // This would integrate with Alpha Vantage, Yahoo Finance, etc.
    return symbols.map(symbol => ({
      symbol,
      price: 100 + Math.random() * 50,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000)
    }));
  }

  /**
   * Calculate projected growth with compound interest
   */
  calculateProjectedGrowth(amount: number, monthlyContribution: number, years: number, expectedReturn: number): number {
    const monthlyReturn = expectedReturn / 100 / 12;
    const totalMonths = years * 12;
    
    // Future value of initial investment
    const futureValueInitial = amount * Math.pow(1 + monthlyReturn, totalMonths);
    
    // Future value of monthly contributions
    const futureValueContributions = monthlyContribution * (Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn;
    
    return futureValueInitial + futureValueContributions;
  }

  /**
   * Assess portfolio risk given market conditions
   */
  assessRisk(allocations: AllocationRecommendation[], marketConditions: MarketConditions): number {
    let baseRisk = this.calculateRiskScore(allocations);
    
    // Adjust for market conditions
    if (marketConditions.volatilityIndex > 25) baseRisk += 10;
    if (marketConditions.marketTrend === 'bear') baseRisk += 15;
    if (marketConditions.inflationRate > 4) baseRisk += 5;
    
    return Math.min(100, baseRisk);
  }
}