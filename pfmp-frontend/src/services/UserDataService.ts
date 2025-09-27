/**
 * UserDataService - Provides user-specific financial data for development
 * This service will be replaced with real API calls in production
 */

export interface UserFinancialProfile {
  // Basic Info
  userId: string;
  name: string;
  email: string;
  
  // Financial Metrics
  totalAssets: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  investmentGains: number;
  savingsRate: number;
  creditScore: number;
  emergencyFundPercent: number;
  
  // Account Balances
  accounts: {
    checking: number;
    savings: number;
    investments: number;
    retirement: number;
    creditCards: number; // negative value for debt
  };
  
  // Goals
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    priority: 'high' | 'medium' | 'low';
    type: 'emergency' | 'house' | 'retirement' | 'vacation' | 'education';
  }>;
  
  // Recent Activity
  recentActivity: Array<{
    id: string;
    description: string;
    amount?: number;
    date: string;
    type: 'transaction' | 'investment' | 'goal' | 'alert';
    category?: string;
  }>;
  
  // Risk Profile
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentExperience: 'beginner' | 'intermediate' | 'advanced';
  timeHorizon: number; // years until retirement
}

class UserDataService {
  private userData: { [key: string]: UserFinancialProfile } = {
    'John Smith': {
      userId: 'john_smith',
      name: 'John Smith',
      email: 'john.smith@gov.mil',
      totalAssets: 127450,
      monthlyIncome: 8500,
      monthlyExpenses: 6120,
      investmentGains: 2340,
      savingsRate: 28,
      creditScore: 785,
      emergencyFundPercent: 82,
      accounts: {
        checking: 8500,
        savings: 24600,
        investments: 67500,
        retirement: 26850,
        creditCards: -2340
      },
      goals: [
        {
          id: 'emergency',
          name: 'Emergency Fund',
          targetAmount: 30000,
          currentAmount: 24600,
          targetDate: '2025-12-31',
          priority: 'high' as const,
          type: 'emergency' as const
        },
        {
          id: 'house',
          name: 'House Down Payment',
          targetAmount: 80000,
          currentAmount: 35000,
          targetDate: '2026-06-01',
          priority: 'high' as const,
          type: 'house' as const
        },
        {
          id: 'retirement',
          name: 'TSP Maximization',
          targetAmount: 750000,
          currentAmount: 26850,
          targetDate: '2055-12-31',
          priority: 'medium' as const,
          type: 'retirement' as const
        }
      ],
      recentActivity: [
        {
          id: '1',
          description: 'TSP Contribution (5% match)',
          amount: 1200,
          date: '2025-09-25',
          type: 'investment' as const,
          category: 'retirement'
        },
        {
          id: '2',
          description: 'Military Salary Deposit',
          amount: 8500,
          date: '2025-09-24',
          type: 'transaction' as const,
          category: 'salary'
        },
        {
          id: '3',
          description: 'Emergency Fund Transfer',
          amount: 500,
          date: '2025-09-22',
          type: 'goal' as const,
          category: 'savings'
        },
        {
          id: '4',
          description: 'Grocery Shopping',
          amount: -245,
          date: '2025-09-21',
          type: 'transaction' as const,
          category: 'food'
        }
      ],
      riskTolerance: 'moderate',
      investmentExperience: 'intermediate',
      timeHorizon: 30
    },
    
    'Sarah Johnson': {
      userId: 'sarah_johnson',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@treasury.gov',
      totalAssets: 89200,
      monthlyIncome: 6800,
      monthlyExpenses: 5304,
      investmentGains: 1180,
      savingsRate: 22,
      creditScore: 742,
      emergencyFundPercent: 65,
      accounts: {
        checking: 4200,
        savings: 19500,
        investments: 45800,
        retirement: 19700,
        creditCards: -1580
      },
      goals: [
        {
          id: 'emergency',
          name: 'Emergency Fund',
          targetAmount: 32000,
          currentAmount: 19500,
          targetDate: '2026-03-31',
          priority: 'high' as const,
          type: 'emergency' as const
        },
        {
          id: 'house',
          name: 'First Home Purchase',
          targetAmount: 60000,
          currentAmount: 18500,
          targetDate: '2027-08-01',
          priority: 'high' as const,
          type: 'house' as const
        },
        {
          id: 'education',
          name: 'MBA Program',
          targetAmount: 45000,
          currentAmount: 12000,
          targetDate: '2026-09-01',
          priority: 'medium' as const,
          type: 'education' as const
        }
      ],
      recentActivity: [
        {
          id: '1',
          description: 'Index Fund Investment',
          amount: 890,
          date: '2025-09-26',
          type: 'investment' as const,
          category: 'stocks'
        },
        {
          id: '2',
          description: 'House Fund Contribution',
          amount: 300,
          date: '2025-09-25',
          type: 'goal' as const,
          category: 'savings'
        },
        {
          id: '3',
          description: 'Federal Salary',
          amount: 6800,
          date: '2025-09-24',
          type: 'transaction' as const,
          category: 'salary'
        },
        {
          id: '4',
          description: 'Rent Payment',
          amount: -1850,
          date: '2025-09-01',
          type: 'transaction' as const,
          category: 'housing'
        }
      ],
      riskTolerance: 'conservative',
      investmentExperience: 'beginner',
      timeHorizon: 35
    },
    
    'Mike Davis': {
      userId: 'mike_davis',
      name: 'Mike Davis',
      email: 'mike.davis@dhs.gov',
      totalAssets: 198750,
      monthlyIncome: 12200,
      monthlyExpenses: 7930,
      investmentGains: 4120,
      savingsRate: 35,
      creditScore: 821,
      emergencyFundPercent: 95,
      accounts: {
        checking: 12400,
        savings: 47500,
        investments: 98600,
        retirement: 40250,
        creditCards: 0 // No credit card debt
      },
      goals: [
        {
          id: 'retirement',
          name: 'Early Retirement',
          targetAmount: 1200000,
          currentAmount: 138850,
          targetDate: '2045-12-31',
          priority: 'high' as const,
          type: 'retirement' as const
        },
        {
          id: 'investment',
          name: 'Investment Property',
          targetAmount: 150000,
          currentAmount: 75000,
          targetDate: '2026-12-31',
          priority: 'medium' as const,
          type: 'house' as const
        },
        {
          id: 'vacation',
          name: 'European Vacation',
          targetAmount: 15000,
          currentAmount: 8500,
          targetDate: '2025-06-01',
          priority: 'low' as const,
          type: 'vacation' as const
        }
      ],
      recentActivity: [
        {
          id: '1',
          description: 'Dividend Payment (VTI)',
          amount: 1240,
          date: '2025-09-26',
          type: 'investment' as const,
          category: 'dividends'
        },
        {
          id: '2',
          description: 'Retirement Goal Update',
          amount: 2500,
          date: '2025-09-25',
          type: 'goal' as const,
          category: 'retirement'
        },
        {
          id: '3',
          description: 'Performance Bonus',
          amount: 5000,
          date: '2025-09-20',
          type: 'transaction' as const,
          category: 'bonus'
        },
        {
          id: '4',
          description: 'Senior Executive Salary',
          amount: 12200,
          date: '2025-09-15',
          type: 'transaction' as const,
          category: 'salary'
        }
      ],
      riskTolerance: 'aggressive',
      investmentExperience: 'advanced',
      timeHorizon: 20
    }
  };

  /**
   * Get user's financial profile by name
   */
  getUserProfile(userName: string): UserFinancialProfile | null {
    return this.userData[userName] || null;
  }

  /**
   * Get formatted financial summary for dashboard display
   */
  getDashboardSummary(userName: string) {
    const profile = this.getUserProfile(userName);
    if (!profile) return null;

    return {
      totalAssets: `$${profile.totalAssets.toLocaleString()}`,
      monthlyIncome: `$${profile.monthlyIncome.toLocaleString()}`,
      investmentGains: `$${profile.investmentGains.toLocaleString()}`,
      savingsRate: `${profile.savingsRate}%`,
      creditScore: profile.creditScore,
      emergencyFund: profile.emergencyFundPercent,
      netWorth: profile.totalAssets + profile.accounts.creditCards, // Subtract debt
      monthlyNetIncome: profile.monthlyIncome - profile.monthlyExpenses,
      activities: profile.recentActivity.map(activity => ({
        ...activity,
        amount: activity.amount ? (activity.amount > 0 ? `+$${activity.amount.toLocaleString()}` : `-$${Math.abs(activity.amount).toLocaleString()}`) : undefined
      }))
    };
  }

  /**
   * Get user's investment profile for AI analysis
   */
  getInvestmentProfile(userName: string) {
    const profile = this.getUserProfile(userName);
    if (!profile) return null;

    return {
      age: 35, // Could be calculated from birth date
      riskTolerance: profile.riskTolerance,
      investmentExperience: profile.investmentExperience,
      annualIncome: profile.monthlyIncome * 12,
      currentSavings: profile.accounts.savings + profile.accounts.checking,
      monthlyInvestmentCapacity: profile.monthlyIncome - profile.monthlyExpenses,
      taxBracket: this.calculateTaxBracket(profile.monthlyIncome * 12),
      hasEmergencyFund: profile.emergencyFundPercent >= 80,
      retirementGoalAge: 65,
      timeHorizon: profile.timeHorizon
    };
  }

  /**
   * Calculate estimated tax bracket based on income
   */
  private calculateTaxBracket(annualIncome: number): number {
    if (annualIncome <= 41775) return 12;
    if (annualIncome <= 89450) return 22;
    if (annualIncome <= 190750) return 24;
    if (annualIncome <= 364200) return 32;
    if (annualIncome <= 462500) return 35;
    return 37;
  }

  /**
   * Get all available users for development mode
   */
  getAvailableUsers(): string[] {
    return Object.keys(this.userData);
  }

  /**
   * Simulate a real-time update (for demo purposes)
   */
  simulateMarketUpdate(userName: string, gainPercent: number = 0.5) {
    const profile = this.userData[userName];
    if (profile) {
      profile.investmentGains = Math.round(profile.accounts.investments * (gainPercent / 100));
      profile.totalAssets += profile.investmentGains;
    }
  }
}

// Export singleton instance
export const userDataService = new UserDataService();
export default UserDataService;