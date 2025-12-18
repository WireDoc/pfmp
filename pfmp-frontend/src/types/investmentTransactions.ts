// Investment Transaction Types
// Matches backend Transaction.cs model

export interface InvestmentTransaction {
  transactionId: number;
  accountId: number;
  holdingId: number | null;
  transactionType: TransactionType;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  fee: number | null;
  transactionDate: string; // ISO 8601
  settlementDate: string; // ISO 8601
  isTaxable: boolean;
  isLongTermCapitalGains: boolean;
  taxableAmount: number | null;
  costBasis: number | null;
  capitalGainLoss: number | null;
  source: TransactionSource;
  externalTransactionId: string | null;
  description: string | null;
  isDividendReinvestment: boolean;
  isQualifiedDividend: boolean;
  stakingReward: number | null;
  stakingAPY: number | null;
  createdAt: string;
  notes: string | null;
  // Navigation properties (from includes)
  account?: {
    accountId: number;
    accountName: string;
    accountType: string;
  };
  holding?: {
    holdingId: number;
    symbol: string;
    name: string;
  };
}

export type TransactionType =
  // Investment Transactions
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'DIVIDEND_REINVEST'
  | 'CAPITAL_GAINS'
  | 'INTEREST'
  | 'SPLIT'
  | 'SPINOFF'
  | 'INITIAL_BALANCE' // For onboarding existing holdings
  // Cash Transactions
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'FEE'
  | 'INTEREST_EARNED'
  // Crypto Transactions
  | 'CRYPTO_STAKING'
  | 'CRYPTO_SWAP'
  | 'CRYPTO_MINING'
  | 'DEFI_YIELD'
  // TSP Transactions
  | 'TSP_CONTRIBUTION'
  | 'TSP_EMPLOYER_MATCH'
  | 'TSP_REBALANCE'
  // Other
  | 'OTHER';

export const TransactionSource = {
  Manual: 0,
  BinanceAPI: 1,
  CoinbaseAPI: 2,
  TDAmeritrade: 3,
  ETrade: 4,
  Schwab: 5,
  Fidelity: 6,
  TSPUpdate: 7,
  BankAPI: 8,
  PlaidInvestments: 9,
  Other: 10,
} as const;

export type TransactionSource = typeof TransactionSource[keyof typeof TransactionSource];

// Create Transaction Request
export interface CreateTransactionRequest {
  accountId: number;
  holdingId?: number;
  transactionType: TransactionType;
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fee?: number;
  transactionDate: string; // ISO 8601
  settlementDate: string; // ISO 8601
  isTaxable?: boolean;
  isLongTermCapitalGains?: boolean;
  taxableAmount?: number;
  costBasis?: number;
  capitalGainLoss?: number;
  source?: TransactionSource;
  externalTransactionId?: string;
  description?: string;
  isDividendReinvestment?: boolean;
  isQualifiedDividend?: boolean;
  stakingReward?: number;
  stakingAPY?: number;
  notes?: string;
}

// Update Transaction Request (all fields optional)
export interface UpdateTransactionRequest {
  transactionType?: TransactionType;
  symbol?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  fee?: number;
  transactionDate?: string;
  settlementDate?: string;
  isTaxable?: boolean;
  isLongTermCapitalGains?: boolean;
  taxableAmount?: number;
  costBasis?: number;
  capitalGainLoss?: number;
  description?: string;
  isDividendReinvestment?: boolean;
  isQualifiedDividend?: boolean;
  notes?: string;
}

// Transaction type labels for display
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
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

// Investment-specific transaction types (for filtering)
export const INVESTMENT_TRANSACTION_TYPES: TransactionType[] = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'DIVIDEND_REINVEST',
  'CAPITAL_GAINS',
  'INTEREST',
  'SPLIT',
  'SPINOFF',
  'INITIAL_BALANCE',
];

// Crypto-specific transaction types
export const CRYPTO_TRANSACTION_TYPES: TransactionType[] = [
  'CRYPTO_STAKING',
  'CRYPTO_SWAP',
  'CRYPTO_MINING',
  'DEFI_YIELD',
];

// Transaction type categories
export function getTransactionCategory(type: TransactionType): 'investment' | 'cash' | 'crypto' | 'tsp' | 'other' {
  if (INVESTMENT_TRANSACTION_TYPES.includes(type)) return 'investment';
  if (CRYPTO_TRANSACTION_TYPES.includes(type)) return 'crypto';
  if (['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST_EARNED'].includes(type)) return 'cash';
  if (['TSP_CONTRIBUTION', 'TSP_EMPLOYER_MATCH', 'TSP_REBALANCE'].includes(type)) return 'tsp';
  return 'other';
}
