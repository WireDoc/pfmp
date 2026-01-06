/**
 * Loan Analytics API Service
 * Handles requests for loan amortization, credit utilization, and debt payoff strategies
 */

import { http } from './httpClient';

// ============================================================================
// TypeScript Interfaces (matching backend DTOs)
// ============================================================================

export interface LoanDetailsResponse {
  liabilityAccountId: number;
  liabilityType: string;
  lender: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  termMonths: number;
  startDate: string;
  estimatedPayoffDate: string;
  paymentsRemaining: number;
  percentPaidOff: number;
  totalInterestPaid: number;
  totalInterestRemaining: number;
}

export interface AmortizationPayment {
  paymentNumber: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface AmortizationSummary {
  totalPayments: number;
  totalInterest: number;
  totalPrincipal: number;
  percentPaid: number;
  paymentsRemaining: number;
  paymentsMade: number;
}

export interface AmortizationScheduleResponse {
  liabilityAccountId: number;
  loanDetails: LoanDetailsResponse;
  schedule: AmortizationPayment[];
  summary: AmortizationSummary;
}

export interface PayoffCalculatorRequest {
  extraMonthlyPayment: number;
}

export interface PayoffPlan {
  payoffDate: string;
  totalInterest: number;
  totalCost: number;
  monthsRemaining: number;
  monthlyPayment: number;
}

export interface PayoffSavings {
  monthsSaved: number;
  yearsSaved: number;
  interestSaved: number;
  totalSaved: number;
}

export interface PayoffCalculatorResponse {
  liabilityAccountId: number;
  currentPlan: PayoffPlan;
  acceleratedPlan: PayoffPlan;
  savings: PayoffSavings;
}

export interface CreditCardResponse {
  liabilityAccountId: number;
  lender: string;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
  utilizationPercent: number;
  utilizationStatus: 'Good' | 'Fair' | 'Poor';
  utilizationColor: 'green' | 'yellow' | 'red';
  interestRate: number;
  minimumPayment: number;
  paymentDueDate: string | null;
  statementBalance: number | null;
}

export interface CreditUtilizationResponse {
  liabilityAccountId: number;
  lender: string | null;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
  utilizationPercent: number;
  utilizationStatus: 'Good' | 'Fair' | 'Poor';
  utilizationColor: 'green' | 'yellow' | 'red';
  interestRate: number | null;
  minimumPayment: number | null;
  paymentDueDate: string | null;
  statementBalance: number | null;
}

export interface DebtItem {
  liabilityAccountId: number;
  liabilityType: string;
  lender: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

export interface PayoffStrategy {
  name: string;
  description: string;
  payoffDate: string;
  totalInterest: number;
  totalCost: number;
  monthsToPayoff: number;
  firstDebtPayoffMonth: number;
  payoffOrder: number[];
}

export interface DebtPayoffStrategiesResponse {
  totalDebt: number;
  weightedAverageInterestRate: number;
  totalMinimumPayment: number;
  extraMonthlyPayment: number;
  debts: DebtItem[];
  avalanche: PayoffStrategy;
  snowball: PayoffStrategy;
  minimumOnly: PayoffStrategy;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all loans for a user
 */
export const fetchUserLoans = async (userId: number): Promise<LoanDetailsResponse[]> => {
  const response = await http.get<LoanDetailsResponse[]>(
    `/loan-analytics/users/${userId}/loans`
  );
  return response.data;
};

/**
 * Fetch loan details by ID
 */
export const fetchLoanDetails = async (loanId: number): Promise<LoanDetailsResponse> => {
  const response = await http.get<LoanDetailsResponse>(
    `/loan-analytics/loans/${loanId}`
  );
  return response.data;
};

/**
 * Fetch amortization schedule for a loan
 */
export const fetchAmortizationSchedule = async (
  loanId: number
): Promise<AmortizationScheduleResponse> => {
  const response = await http.get<AmortizationScheduleResponse>(
    `/loan-analytics/loans/${loanId}/amortization`
  );
  return response.data;
};

/**
 * Calculate payoff with extra payments
 */
export const calculatePayoff = async (
  loanId: number,
  extraMonthlyPayment: number
): Promise<PayoffCalculatorResponse> => {
  const response = await http.post<PayoffCalculatorResponse>(
    `/loan-analytics/loans/${loanId}/payoff-calculator`,
    { extraMonthlyPayment }
  );
  return response.data;
};

/**
 * Fetch all credit cards for a user
 */
export const fetchUserCreditCards = async (userId: number): Promise<CreditCardResponse[]> => {
  const response = await http.get<CreditCardResponse[]>(
    `/loan-analytics/users/${userId}/credit-cards`
  );
  return response.data;
};

/**
 * Fetch credit utilization for a specific card
 */
export const fetchCreditCardUtilization = async (
  cardId: number
): Promise<CreditUtilizationResponse> => {
  const response = await http.get<CreditUtilizationResponse>(
    `/loan-analytics/credit-cards/${cardId}/utilization`
  );
  return response.data;
};

/**
 * Fetch aggregate credit utilization for a user
 */
export const fetchAggregateCreditUtilization = async (
  userId: number
): Promise<CreditUtilizationResponse> => {
  const response = await http.get<CreditUtilizationResponse>(
    `/loan-analytics/users/${userId}/credit-utilization`
  );
  return response.data;
};

/**
 * Fetch debt payoff strategy comparison for a user
 */
export const fetchDebtPayoffStrategies = async (
  userId: number,
  extraMonthlyPayment: number = 0,
  includeAutoLoans: boolean = true,
  includeMortgages: boolean = false
): Promise<DebtPayoffStrategiesResponse> => {
  const response = await http.get<DebtPayoffStrategiesResponse>(
    `/loan-analytics/users/${userId}/payoff-strategies`,
    { params: { extraMonthlyPayment, includeAutoLoans, includeMortgages } }
  );
  return response.data;
};

// ============================================================================
// Credit Dashboard Summary (Wave 12.5)
// ============================================================================

export interface CreditDashboardSummary {
  hasCreditCards: boolean;
  cardCount: number;
  totalCreditLimit: number;
  totalCurrentBalance: number;
  totalAvailableCredit: number;
  utilizationPercent: number;
  utilizationStatus: string;
  utilizationColor: string;
  nextPaymentDueDate: string | null;
  nextPaymentDueAmount: number | null;
  nextPaymentDueLender: string | null;
  recommendations: string[];
}

/**
 * Fetch credit dashboard summary for a user
 */
export const fetchCreditDashboardSummary = async (
  userId: number
): Promise<CreditDashboardSummary> => {
  const response = await http.get<CreditDashboardSummary>(
    `/loan-analytics/users/${userId}/credit-summary`
  );
  return response.data;
};
