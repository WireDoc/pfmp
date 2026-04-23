const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

export interface CashTransactionResponse {
  cashTransactionId: number;
  cashAccountId: string;
  liabilityAccountId?: number;
  transactionType: string;
  amount: number;
  transactionDate: string;
  description?: string;
  category?: string;
  merchant?: string;
  checkNumber?: string;
  fee?: number;
  tags?: string;
  isPending: boolean;
  isRecurring: boolean;
  notes?: string;
  balanceAfter?: number;
}

export interface CreateCashTransactionRequest {
  transactionType: string;
  amount: number;
  transactionDate?: string;
  description?: string;
  category?: string;
  merchant?: string;
  checkNumber?: string;
  fee?: number;
  tags?: string;
  isPending?: boolean;
  isRecurring?: boolean;
  notes?: string;
}

export interface UpdateCashTransactionRequest {
  transactionType?: string;
  amount?: number;
  transactionDate?: string;
  description?: string;
  category?: string;
  merchant?: string;
  checkNumber?: string;
  fee?: number;
  tags?: string;
  isPending?: boolean;
  isRecurring?: boolean;
  notes?: string;
}

export const CASH_TRANSACTION_TYPES = [
  'Deposit',
  'Withdrawal',
  'Transfer',
  'Fee',
  'Interest',
  'Refund',
  'Purchase',
  'Payment',
  'Check',
  'ATM',
  'Other',
] as const;

export type CashTransactionType = (typeof CASH_TRANSACTION_TYPES)[number];

// Categories suggested for cash transactions (used as autocomplete options)
export const CASH_TRANSACTION_CATEGORIES = [
  'Groceries',
  'Dining',
  'Transportation',
  'Utilities',
  'Rent',
  'Mortgage',
  'Insurance',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Travel',
  'Education',
  'Subscriptions',
  'Personal Care',
  'Gifts & Donations',
  'Income',
  'Salary',
  'Interest Earned',
  'Refund',
  'Transfer',
  'Other',
] as const;

export async function createCashTransaction(
  cashAccountId: string,
  request: CreateCashTransactionRequest
): Promise<CashTransactionResponse> {
  const response = await fetch(`${API_BASE_URL}/cash-accounts/${cashAccountId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to create transaction: ${response.status}`);
  }
  return response.json();
}

export async function updateCashTransaction(
  cashAccountId: string,
  transactionId: number,
  request: UpdateCashTransactionRequest
): Promise<CashTransactionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/cash-accounts/${cashAccountId}/transactions/${transactionId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to update transaction: ${response.status}`);
  }
  return response.json();
}

export async function deleteCashTransaction(
  cashAccountId: string,
  transactionId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/cash-accounts/${cashAccountId}/transactions/${transactionId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to delete transaction: ${response.status}`);
  }
}
