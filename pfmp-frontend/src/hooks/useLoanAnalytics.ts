/**
 * Custom hooks for loan analytics data fetching
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUserLoans,
  fetchLoanDetails,
  fetchAmortizationSchedule,
  calculatePayoff,
  fetchUserCreditCards,
  fetchCreditCardUtilization,
  fetchAggregateCreditUtilization,
  fetchDebtPayoffStrategies,
  type LoanDetailsResponse,
  type AmortizationScheduleResponse,
  type PayoffCalculatorResponse,
  type CreditCardResponse,
  type CreditUtilizationResponse,
  type DebtPayoffStrategiesResponse,
} from '../api/loanAnalytics';

// ============================================================================
// useLoanDetails Hook
// ============================================================================

interface UseLoanDetailsResult {
  loan: LoanDetailsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLoanDetails(loanId: number | null): UseLoanDetailsResult {
  const [loan, setLoan] = useState<LoanDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!loanId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLoanDetails(loanId);
      setLoan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loan details');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loan, loading, error, refetch };
}

// ============================================================================
// useUserLoans Hook
// ============================================================================

interface UseUserLoansResult {
  loans: LoanDetailsResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserLoans(userId: number | null): UseUserLoansResult {
  const [loans, setLoans] = useState<LoanDetailsResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserLoans(userId);
      setLoans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loans, loading, error, refetch };
}

// ============================================================================
// useAmortizationSchedule Hook
// ============================================================================

interface UseAmortizationScheduleResult {
  schedule: AmortizationScheduleResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAmortizationSchedule(loanId: number | null): UseAmortizationScheduleResult {
  const [schedule, setSchedule] = useState<AmortizationScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!loanId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAmortizationSchedule(loanId);
      setSchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch amortization schedule');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { schedule, loading, error, refetch };
}

// ============================================================================
// usePayoffCalculator Hook
// ============================================================================

interface UsePayoffCalculatorResult {
  result: PayoffCalculatorResponse | null;
  loading: boolean;
  error: string | null;
  calculate: (extraPayment: number) => Promise<void>;
}

export function usePayoffCalculator(loanId: number | null): UsePayoffCalculatorResult {
  const [result, setResult] = useState<PayoffCalculatorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (extraPayment: number) => {
    if (!loanId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await calculatePayoff(loanId, extraPayment);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate payoff');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  return { result, loading, error, calculate };
}

// ============================================================================
// useUserCreditCards Hook
// ============================================================================

interface UseUserCreditCardsResult {
  creditCards: CreditCardResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserCreditCards(userId: number | null): UseUserCreditCardsResult {
  const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserCreditCards(userId);
      setCreditCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credit cards');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { creditCards, loading, error, refetch };
}

// ============================================================================
// useCreditUtilization Hook
// ============================================================================

interface UseCreditUtilizationResult {
  utilization: CreditUtilizationResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCreditUtilization(cardId: number | null): UseCreditUtilizationResult {
  const [utilization, setUtilization] = useState<CreditUtilizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!cardId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCreditCardUtilization(cardId);
      setUtilization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credit utilization');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { utilization, loading, error, refetch };
}

// ============================================================================
// useAggregateCreditUtilization Hook
// ============================================================================

export function useAggregateCreditUtilization(userId: number | null): UseCreditUtilizationResult {
  const [utilization, setUtilization] = useState<CreditUtilizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAggregateCreditUtilization(userId);
      setUtilization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch aggregate utilization');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { utilization, loading, error, refetch };
}

// ============================================================================
// useDebtPayoffStrategies Hook
// ============================================================================

export interface DebtFilterOptions {
  includeAutoLoans: boolean;
  includeMortgages: boolean;
}

interface UseDebtPayoffStrategiesResult {
  strategies: DebtPayoffStrategiesResponse | null;
  loading: boolean;
  error: string | null;
  refetch: (extraPayment?: number, filters?: DebtFilterOptions) => Promise<void>;
}

export function useDebtPayoffStrategies(
  userId: number | null,
  initialExtraPayment: number = 0,
  initialFilters: DebtFilterOptions = { includeAutoLoans: true, includeMortgages: false }
): UseDebtPayoffStrategiesResult {
  const [strategies, setStrategies] = useState<DebtPayoffStrategiesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraPayment, setExtraPayment] = useState(initialExtraPayment);
  const [filters, setFilters] = useState(initialFilters);

  const refetch = useCallback(async (newExtraPayment?: number, newFilters?: DebtFilterOptions) => {
    if (!userId) return;
    
    const paymentToUse = newExtraPayment !== undefined ? newExtraPayment : extraPayment;
    const filtersToUse = newFilters !== undefined ? newFilters : filters;
    
    if (newExtraPayment !== undefined) {
      setExtraPayment(newExtraPayment);
    }
    if (newFilters !== undefined) {
      setFilters(newFilters);
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDebtPayoffStrategies(
        userId, 
        paymentToUse, 
        filtersToUse.includeAutoLoans, 
        filtersToUse.includeMortgages
      );
      setStrategies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payoff strategies');
    } finally {
      setLoading(false);
    }
  }, [userId, extraPayment, filters]);

  useEffect(() => {
    if (userId) {
      fetchDebtPayoffStrategies(
        userId, 
        initialExtraPayment, 
        initialFilters.includeAutoLoans, 
        initialFilters.includeMortgages
      )
        .then(setStrategies)
        .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch strategies'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only refetch on userId change

  return { strategies, loading, error, refetch };
}
