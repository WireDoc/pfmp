/**
 * Cash Accounts API Service
 * Handles CRUD operations for cash accounts
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052';

export interface CashAccountResponse {
  cashAccountId: string;
  userId: number;
  institution: string;
  nickname?: string;
  accountType: string;
  accountNumber?: string;
  routingNumber?: string;
  balance: number;
  interestRateApr?: number;
  purpose?: string;
  isEmergencyFund: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashAccountRequest {
  userId: number;
  institution: string;
  nickname?: string;
  accountType: string;
  balance: number;
  interestRateApr?: number;
  purpose?: string;
  isEmergencyFund?: boolean;
}

export interface UpdateCashAccountRequest {
  nickname?: string;
  institution?: string;
  accountNumber?: string;
  routingNumber?: string;
  balance?: number;
  interestRateApr?: number;
  purpose?: string;
}

/**
 * Get all cash accounts for a user
 */
export async function listCashAccounts(userId: number): Promise<CashAccountResponse[]> {
  const response = await axios.get<CashAccountResponse[]>(
    `${API_BASE_URL}/cashaccounts`,
    { params: { userId } }
  );
  return response.data;
}

/**
 * Get a single cash account by ID
 */
export async function getCashAccount(cashAccountId: string): Promise<CashAccountResponse> {
  const response = await axios.get<CashAccountResponse>(
    `${API_BASE_URL}/cashaccounts/${cashAccountId}`
  );
  return response.data;
}

/**
 * Create a new cash account
 */
export async function createCashAccount(
  request: CreateCashAccountRequest
): Promise<CashAccountResponse> {
  const response = await axios.post<CashAccountResponse>(
    `${API_BASE_URL}/cashaccounts`,
    request
  );
  return response.data;
}

/**
 * Update an existing cash account
 */
export async function updateCashAccount(
  cashAccountId: string,
  request: UpdateCashAccountRequest
): Promise<CashAccountResponse> {
  const response = await axios.put<CashAccountResponse>(
    `${API_BASE_URL}/cashaccounts/${cashAccountId}`,
    request
  );
  return response.data;
}

/**
 * Delete a cash account
 */
export async function deleteCashAccount(cashAccountId: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/cashaccounts/${cashAccountId}`);
}
