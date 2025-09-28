/**
 * Minimal domain model interfaces used to replace widespread `any`.
 * Keep fields optional; add only what calling code actually consumes.
 * Each interface includes an index signature to avoid over-specification during transition.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LooseObject { [key: string]: any }

export interface UserProfile extends LooseObject {
  id?: number;
  userId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string;
}

export interface Account extends LooseObject {
  id?: number;
  userId?: number;
  name?: string;
  type?: string; // e.g., 'brokerage', 'bank', 'tsp'
  balance?: number;
  currency?: string;
  institution?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task extends LooseObject {
  id?: number;
  userId?: number;
  title?: string;
  description?: string;
  status?: string; // 'open' | 'completed' etc. (left loose for now)
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert extends LooseObject {
  id?: number;
  userId?: number;
  type?: string;
  message?: string;
  isActive?: boolean;
  isRead?: boolean;
  createdAt?: string;
}

export interface MarketIndex extends LooseObject {
  symbol?: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  updatedAt?: string;
}

export interface StockQuote extends LooseObject {
  symbol?: string;
  price?: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  updatedAt?: string;
}

export interface TspFundPrice extends LooseObject {
  fund?: string; // e.g., 'C', 'S', 'I'
  date?: string;
  price?: number;
  change?: number;
}

export interface PortfolioSummary extends LooseObject {
  userId?: number;
  totalValue?: number;
  totalGainLoss?: number;
  gainLossPercent?: number;
  lastUpdated?: string;
}

export interface PortfolioValuation extends LooseObject {
  userId?: number;
  positions?: LooseObject[]; // refine later
  totalValue?: number;
  asOf?: string;
}

export interface NetWorthSummary extends LooseObject {
  userId?: number;
  assets?: number;
  liabilities?: number;
  netWorth?: number;
  asOf?: string;
}

export interface AccountPerformance extends LooseObject {
  userId?: number;
  accountId?: number;
  period?: string; // e.g., '1D', '1M'
  returns?: number;
  asOf?: string;
}
