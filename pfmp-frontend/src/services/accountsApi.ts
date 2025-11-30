import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

export interface AccountResponse {
  accountId: number;
  userId: number;
  accountName: string;
  institution: string;
  accountType: string;
  accountCategory: string;
  currentBalance: number;
  accountNumber?: string;
  purpose?: string;
  interestRate?: number;
  maturityDate?: string;
  isEmergencyFund: boolean;
  state: string; // "SKELETON" or "DETAILED"
  createdAt: string;
  updatedAt: string;
  lastBalanceUpdate?: string;
}

export interface UpdateAccountRequest {
  name: string;
  institution: string;
  type: string;
  balance: number;
  accountNumber?: string;
  purpose?: string;
}

export interface CreateAccountRequest extends UpdateAccountRequest {
  userId: number;
}

export async function getAccount(accountId: number): Promise<AccountResponse> {
  const response = await axios.get<AccountResponse>(
    `${API_BASE}/accounts/${accountId}`
  );
  return response.data;
}

export async function updateAccount(
  accountId: number,
  data: UpdateAccountRequest
): Promise<AccountResponse> {
  const response = await axios.put<AccountResponse>(
    `${API_BASE}/accounts/${accountId}`,
    data
  );
  return response.data;
}

export async function deleteAccount(accountId: number): Promise<void> {
  await axios.delete(`${API_BASE}/accounts/${accountId}`);
}

export async function listUserAccounts(userId: number): Promise<AccountResponse[]> {
  const response = await axios.get<AccountResponse[]>(
    `${API_BASE}/accounts/user/${userId}`
  );
  return response.data;
}

// SKELETON account operations
export interface UpdateBalanceRequest {
  newBalance: number;
}

export interface InitialHoldingRequest {
  symbol: string;
  name?: string;
  assetType: number;
  quantity: number;
  price: number;
  fee?: number;
  purchaseDate?: string;
}

export interface TransitionToDetailedRequest {
  holdings: InitialHoldingRequest[];
  acquisitionDate: string;
}

export async function updateAccountBalance(
  accountId: number,
  newBalance: number
): Promise<AccountResponse> {
  const response = await axios.patch<AccountResponse>(
    `${API_BASE}/accounts/${accountId}/balance`,
    { newBalance }
  );
  return response.data;
}

export async function transitionToDetailed(
  accountId: number,
  request: TransitionToDetailedRequest
): Promise<AccountResponse> {
  const response = await axios.post<AccountResponse>(
    `${API_BASE}/accounts/${accountId}/transition-to-detailed`,
    request
  );
  return response.data;
}
