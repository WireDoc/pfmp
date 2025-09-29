import axios from 'axios';
import type { Task, CreateTaskRequest, UpdateTaskRequest, CompleteTaskRequest } from '../types/Task';
import { TaskStatus } from '../types/Task';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User types
export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  riskTolerance: number;
  emergencyFundTarget: number;
  vaDisabilityMonthlyAmount?: number;
  vaDisabilityPercentage?: number;
  isGovernmentEmployee: boolean;
  governmentAgency?: string;
  createdAt: string;
  updatedAt: string;
}

// Account types
export interface Account {
  accountId: number;
  userId: number;
  accountName: string;
  accountType: AccountType;
  category: AccountCategory;
  institution?: string;
  accountNumber?: string;
  currentBalance: number;
  interestRate?: number;
  hasAPIIntegration: boolean;
  isEmergencyFund: boolean;
  tspAllocation?: TSPAllocation;
  createdAt: string;
  updatedAt: string;
}

export interface TSPAllocation {
  // Individual Funds
  gFundPercentage: number;
  fFundPercentage: number;
  cFundPercentage: number;
  sFundPercentage: number;
  iFundPercentage: number;
  
  // Lifecycle Funds
  lIncomeFundPercentage: number;
  l2030FundPercentage: number;
  l2035FundPercentage: number;
  l2040FundPercentage: number;
  l2045FundPercentage: number;
  l2050FundPercentage: number;
  l2055FundPercentage: number;
  l2060FundPercentage: number;
  l2065FundPercentage: number;
  l2070FundPercentage: number;
  l2075FundPercentage: number;
  
  lastUpdated: string;
}

export const AccountType = {
  Brokerage: 'Brokerage',
  RetirementAccount401k: 'RetirementAccount401k',
  RetirementAccountIRA: 'RetirementAccountIRA',
  RetirementAccountRoth: 'RetirementAccountRoth',
  TSP: 'TSP',
  HSA: 'HSA',
  Checking: 'Checking',
  Savings: 'Savings',
  MoneyMarket: 'MoneyMarket',
  CertificateOfDeposit: 'CertificateOfDeposit',
  CryptoCustodial: 'CryptoCustodial',
  CryptoNonCustodial: 'CryptoNonCustodial',
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

export const AccountCategory = {
  Taxable: 'Taxable',
  TaxDeferred: 'TaxDeferred',
  TaxFree: 'TaxFree',
  TaxAdvantaged: 'TaxAdvantaged',
  Cash: 'Cash',
  Cryptocurrency: 'Cryptocurrency',
  RealEstate: 'RealEstate',
  Alternative: 'Alternative',
} as const;

export type AccountCategory = typeof AccountCategory[keyof typeof AccountCategory];

// Goal types
export interface Goal {
  goalId: number;
  userId: number;
  name: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyContribution?: number;
  requiredMonthlyContribution?: number;
  priority: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export const GoalType = {
  EmergencyFund: 'EmergencyFund',
  Retirement: 'Retirement',
  Education: 'Education',
  HouseDownPayment: 'HouseDownPayment',
  VacationTravel: 'VacationTravel',
  DebtPayoff: 'DebtPayoff',
  CarPurchase: 'CarPurchase',
  HomeImprovement: 'HomeImprovement',
  Investment: 'Investment',
  Business: 'Business',
  Custom: 'Custom',
} as const;

export type GoalType = typeof GoalType[keyof typeof GoalType];

export const GoalCategory = {
  ShortTerm: 'ShortTerm',
  MediumTerm: 'MediumTerm',
  LongTerm: 'LongTerm',
  Ongoing: 'Ongoing',
} as const;

export type GoalCategory = typeof GoalCategory[keyof typeof GoalCategory];

export const GoalStatus = {
  Planning: 'Planning',
  Active: 'Active',
  OnTrack: 'OnTrack',
  BehindTarget: 'BehindTarget',
  AheadOfTarget: 'AheadOfTarget',
  Paused: 'Paused',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const;

export type GoalStatus = typeof GoalStatus[keyof typeof GoalStatus];

// API Services
export const userService = {
  getAll: () => apiClient.get<User[]>('/Users'),
  getById: (id: number) => apiClient.get<User>(`/Users/${id}`),
  getSummary: (id: number) => apiClient.get(`/Users/${id}/summary`),
  create: (user: Omit<User, 'userId' | 'createdAt' | 'updatedAt'>) => 
    apiClient.post<User>('/Users', user),
  update: (id: number, user: User) => apiClient.put(`/Users/${id}`, user),
  delete: (id: number) => apiClient.delete(`/Users/${id}`),
};

export const accountService = {
  getByUser: (userId: number) => apiClient.get<Account[]>(`/Accounts/user/${userId}`),
  getById: (id: number) => apiClient.get<Account>(`/Accounts/${id}`),
  getPerformance: (id: number) => apiClient.get(`/Accounts/${id}/performance`),
  getCashOptimization: (userId: number) => apiClient.get(`/Accounts/cash-optimization/user/${userId}`),
  create: (account: Omit<Account, 'accountId' | 'createdAt' | 'updatedAt'>) => 
    apiClient.post<Account>('/Accounts', account),
  update: (id: number, account: Account) => apiClient.put(`/Accounts/${id}`, account),
  updateTSPAllocation: (id: number, allocation: TSPAllocation) => 
    apiClient.post(`/Accounts/${id}/tsp-allocation`, allocation),
  delete: (id: number) => apiClient.delete(`/Accounts/${id}`),
};

export const goalService = {
  getByUser: (userId: number) => apiClient.get<Goal[]>(`/Goals/user/${userId}`),
  getById: (id: number) => apiClient.get<Goal>(`/Goals/${id}`),
  getEmergencyFundStatus: (userId: number) => apiClient.get(`/Goals/emergency-fund/user/${userId}`),
  create: (goal: Omit<Goal, 'goalId' | 'createdAt' | 'updatedAt'>) => 
    apiClient.post<Goal>('/Goals', goal),
  update: (id: number, goal: Goal) => apiClient.put(`/Goals/${id}`, goal),
  updateProgress: (id: number, newAmount: number) => 
    apiClient.post(`/Goals/${id}/progress`, newAmount),
  delete: (id: number) => apiClient.delete(`/Goals/${id}`),
};

export const incomeSourceService = {
  getByUser: (userId: number) => apiClient.get(`/IncomeSources/user/${userId}`),
  getVADisabilityInfo: (userId: number) => apiClient.get(`/IncomeSources/va-disability/user/${userId}`),
  getSummary: (userId: number) => apiClient.get(`/IncomeSources/summary/user/${userId}`),
  getById: (id: number) => apiClient.get(`/IncomeSources/${id}`),
  // Minimal IncomeSource shape; extend as fields are actually consumed in UI
  create: (incomeSource: {
    userId: number;
    sourceType: string;
    amount: number;
    description?: string;
    frequency?: string;
    // index signature to remain flexible during transition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }) => apiClient.post('/IncomeSources', incomeSource),
  update: (id: number, incomeSource: Partial<{
    userId: number;
    sourceType: string;
    amount: number;
    description?: string;
    frequency?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>) => apiClient.put(`/IncomeSources/${id}`, incomeSource),
  delete: (id: number) => apiClient.delete(`/IncomeSources/${id}`),
};

export const taskService = {
  getByUser: (userId: number, status?: TaskStatus) => {
    const params = new URLSearchParams();
    params.append('userId', userId.toString());
    if (status) {
      params.append('status', status.toString());
    }
    return apiClient.get<Task[]>(`/tasks?${params.toString()}`);
  },
  getById: (id: number) => apiClient.get<Task>(`/tasks/${id}`),
  create: (task: CreateTaskRequest) => apiClient.post<Task>('/tasks', task),
  update: (id: number, task: UpdateTaskRequest) => apiClient.put<Task>(`/tasks/${id}`, task),
  updateStatus: (id: number, status: TaskStatus) => apiClient.patch<Task>(`/tasks/${id}/status`, status),
  markAsCompleted: (id: number, request: CompleteTaskRequest) => 
    apiClient.patch<Task>(`/tasks/${id}/complete`, request),
  dismiss: (id: number) => apiClient.patch<Task>(`/tasks/${id}/dismiss`),
  delete: (id: number) => apiClient.delete(`/tasks/${id}`),
};

// Advice types (Wave 1)
export interface Advice {
  adviceId: number;
  userId: number;
  theme?: string | null;
  status: string; // Proposed | Accepted | Rejected | ConvertedToTask
  consensusText: string;
  confidenceScore: number;
  primaryJson?: string | null;
  validatorJson?: string | null;
  violationsJson?: string | null;
  linkedTaskId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateAdviceResponse extends Advice {}

export const adviceService = {
  generate: (userId: number) => apiClient.post<GenerateAdviceResponse>(`/Advice/generate/${userId}`, {}),
  getForUser: (userId: number) => apiClient.get<Advice[]>(`/Advice/user/${userId}`),
  accept: (adviceId: number) => apiClient.post<Advice>(`/Advice/${adviceId}/accept`, {}),
  reject: (adviceId: number) => apiClient.post<Advice>(`/Advice/${adviceId}/reject`, {}),
};

export default apiClient;