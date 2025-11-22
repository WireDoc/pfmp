import axios from 'axios';
import type {
  InvestmentTransaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionType,
} from '../types/investmentTransactions';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

// Configure axios with 60-second timeout
const axiosInstance = axios.create({
  timeout: 60000,
  baseURL: API_BASE_URL,
});

export interface FetchTransactionsParams {
  accountId: number;
  holdingId?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  transactionType?: TransactionType;
}

/**
 * Fetch investment transactions with optional filtering
 */
export async function fetchInvestmentTransactions(
  params: FetchTransactionsParams
): Promise<InvestmentTransaction[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('accountId', params.accountId.toString());

  if (params.holdingId) {
    queryParams.append('holdingId', params.holdingId.toString());
  }
  if (params.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  if (params.transactionType) {
    queryParams.append('transactionType', params.transactionType);
  }

  const response = await axiosInstance.get<InvestmentTransaction[]>(
    `/transactions?${queryParams.toString()}`
  );
  return response.data;
}

/**
 * Fetch a single transaction by ID
 */
export async function fetchTransaction(id: number): Promise<InvestmentTransaction> {
  const response = await axiosInstance.get<InvestmentTransaction>(`/transactions/${id}`);
  return response.data;
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  request: CreateTransactionRequest
): Promise<InvestmentTransaction> {
  const response = await axiosInstance.post<InvestmentTransaction>('/transactions', request);
  return response.data;
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  id: number,
  request: UpdateTransactionRequest
): Promise<InvestmentTransaction> {
  const response = await axiosInstance.put<InvestmentTransaction>(`/transactions/${id}`, request);
  return response.data;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: number): Promise<void> {
  await axiosInstance.delete(`/transactions/${id}`);
}

/**
 * Helper: Format transaction type for display
 */
export function formatTransactionType(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    BUY: 'Buy',
    SELL: 'Sell',
    DIVIDEND: 'Dividend',
    DIVIDEND_REINVEST: 'Dividend Reinvest',
    CAPITAL_GAINS: 'Capital Gains',
    INTEREST: 'Interest',
    SPLIT: 'Stock Split',
    SPINOFF: 'Spinoff',
    INITIAL_BALANCE: 'Initial Balance',
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    TRANSFER: 'Transfer',
    FEE: 'Fee',
    INTEREST_EARNED: 'Interest Earned',
    CRYPTO_STAKING: 'Staking Reward',
    CRYPTO_SWAP: 'Crypto Swap',
    CRYPTO_MINING: 'Mining Reward',
    DEFI_YIELD: 'DeFi Yield',
    TSP_CONTRIBUTION: 'TSP Contribution',
    TSP_EMPLOYER_MATCH: 'Employer Match',
    TSP_REBALANCE: 'Rebalance',
    OTHER: 'Other',
  };
  return map[type] || type;
}

/**
 * Helper: Determine if transaction increases holdings
 */
export function isIncreasingTransaction(type: TransactionType): boolean {
  return [
    'BUY',
    'INITIAL_BALANCE',
    'DIVIDEND_REINVEST',
    'SPLIT',
    'CRYPTO_STAKING',
    'CRYPTO_MINING',
    'DEFI_YIELD',
    'TSP_CONTRIBUTION',
    'TSP_EMPLOYER_MATCH',
  ].includes(type);
}

/**
 * Helper: Determine if transaction decreases holdings
 */
export function isDecreasingTransaction(type: TransactionType): boolean {
  return ['SELL', 'CRYPTO_SWAP'].includes(type);
}

/**
 * Helper: Determine if transaction is income (dividend, interest, etc.)
 */
export function isIncomeTransaction(type: TransactionType): boolean {
  return [
    'DIVIDEND',
    'DIVIDEND_REINVEST',
    'CAPITAL_GAINS',
    'INTEREST',
    'CRYPTO_STAKING',
    'CRYPTO_MINING',
    'DEFI_YIELD',
  ].includes(type);
}

/**
 * Helper: Get transaction type color
 */
export function getTransactionTypeColor(
  type: TransactionType
): 'success' | 'error' | 'info' | 'warning' | 'default' {
  if (isIncreasingTransaction(type)) return 'success';
  if (isDecreasingTransaction(type)) return 'error';
  if (isIncomeTransaction(type)) return 'info';
  return 'default';
}

/**
 * Helper: Get transaction type icon name (Material-UI icon)
 */
export function getTransactionTypeIcon(type: TransactionType): string {
  switch (type) {
    case 'BUY':
    case 'INITIAL_BALANCE':
    case 'DEPOSIT':
      return 'TrendingUp';
    case 'SELL':
    case 'WITHDRAWAL':
      return 'TrendingDown';
    case 'DIVIDEND':
    case 'DIVIDEND_REINVEST':
    case 'CAPITAL_GAINS':
    case 'INTEREST':
    case 'INTEREST_EARNED':
      return 'AttachMoney';
    case 'CRYPTO_STAKING':
    case 'CRYPTO_MINING':
    case 'DEFI_YIELD':
      return 'AccountBalance';
    case 'SPLIT':
      return 'CallSplit';
    case 'SPINOFF':
      return 'Autorenew';
    case 'TRANSFER':
      return 'SwapHoriz';
    case 'FEE':
      return 'Receipt';
    case 'CRYPTO_SWAP':
      return 'CompareArrows';
    case 'TSP_CONTRIBUTION':
    case 'TSP_EMPLOYER_MATCH':
      return 'Savings';
    case 'TSP_REBALANCE':
      return 'Balance';
    default:
      return 'Receipt';
  }
}
