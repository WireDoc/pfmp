/**
 * Properties API Service
 * Handles requests for property management (Wave 12.5)
 */

import { http } from './httpClient';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PropertyDto {
  propertyId: string;
  propertyName: string;
  propertyType: string;
  occupancy: string;
  estimatedValue: number;
  mortgageBalance: number | null;
  equity: number;
  monthlyMortgagePayment: number | null;
  monthlyRentalIncome: number | null;
  monthlyExpenses: number | null;
  monthlyCashFlow: number;
  hasHeloc: boolean;
  interestRate: number | null;
  mortgageTerm: number | null;
  lienholder: string | null;
  monthlyPropertyTax: number | null;
  propertyTaxFrequency: string;
  monthlyInsurance: number | null;
  insuranceFrequency: string;
  estimatedPayoffDate: string | null;
  purpose: string | null;
  address: string | null;
  source: string;
  isPlaidLinked: boolean;
  lastSyncedAt: string | null;
  updatedAt: string;
  valuationSource: string | null;
  valuationConfidence: number | null;
  valuationLow: number | null;
  valuationHigh: number | null;
  lastValuationAt: string | null;
  autoValuationEnabled: boolean;
  addressValidated: boolean;
}

export interface MortgageSummaryDto {
  liabilityAccountId: number;
  lender: string | null;
  currentBalance: number;
  interestRate: number | null;
  minimumPayment: number | null;
  nextPaymentDueDate: string | null;
}

export interface PropertyValueHistoryDto {
  historyId: number;
  propertyId: string;
  estimatedValue: number;
  mortgageBalance: number | null;
  equity: number;
  source: string | null;
  recordedAt: string;
}

export interface PropertyDetailDto extends PropertyDto {
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  linkedMortgageLiabilityId: number | null;
  syncStatus: string | null;
  createdAt: string;
  linkedMortgage: MortgageSummaryDto | null;
  valueHistory: PropertyValueHistoryDto[];
}

export interface CreatePropertyRequest {
  userId: number;
  propertyName: string;
  propertyType?: string;
  occupancy?: string;
  estimatedValue: number;
  mortgageBalance?: number;
  monthlyMortgagePayment?: number;
  monthlyRentalIncome?: number;
  monthlyExpenses?: number;
  hasHeloc?: boolean;
  interestRate?: number;
  mortgageTerm?: number;
  lienholder?: string;
  monthlyPropertyTax?: number;
  propertyTaxFrequency?: string;
  monthlyInsurance?: number;
  insuranceFrequency?: string;
  estimatedPayoffDate?: string;
  purpose?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface UpdatePropertyRequest {
  propertyName?: string;
  propertyType?: string;
  occupancy?: string;
  estimatedValue?: number;
  mortgageBalance?: number;
  monthlyMortgagePayment?: number;
  monthlyRentalIncome?: number;
  monthlyExpenses?: number;
  hasHeloc?: boolean;
  interestRate?: number;
  mortgageTerm?: number;
  lienholder?: string;
  monthlyPropertyTax?: number;
  propertyTaxFrequency?: string;
  monthlyInsurance?: number;
  insuranceFrequency?: string;
  estimatedPayoffDate?: string;
  purpose?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all properties for a user
 */
export const fetchProperties = async (userId: number): Promise<PropertyDto[]> => {
  const response = await http.get<PropertyDto[]>('/properties', {
    params: { userId },
  });
  return response.data;
};

/**
 * Fetch a specific property by ID
 */
export const fetchProperty = async (propertyId: string): Promise<PropertyDetailDto> => {
  const response = await http.get<PropertyDetailDto>(`/properties/${propertyId}`);
  return response.data;
};

/**
 * Create a new property
 */
export const createProperty = async (request: CreatePropertyRequest): Promise<PropertyDto> => {
  const response = await http.post<PropertyDto>('/properties', request);
  return response.data;
};

/**
 * Update an existing property
 */
export const updateProperty = async (
  propertyId: string,
  request: UpdatePropertyRequest
): Promise<PropertyDto> => {
  const response = await http.put<PropertyDto>(`/properties/${propertyId}`, request);
  return response.data;
};

/**
 * Delete a property
 */
export const deleteProperty = async (propertyId: string): Promise<void> => {
  await http.delete(`/properties/${propertyId}`);
};

/**
 * Fetch property value history
 */
export const fetchPropertyHistory = async (
  propertyId: string,
  limit?: number
): Promise<PropertyValueHistoryDto[]> => {
  const response = await http.get<PropertyValueHistoryDto[]>(
    `/properties/${propertyId}/history`,
    { params: { limit } }
  );
  return response.data;
};

/**
 * Generate property value update tasks for stale properties
 */
export const generatePropertyTasks = async (
  userId: number,
  monthsThreshold: number = 3
): Promise<unknown[]> => {
  const response = await http.post('/properties/tasks/generate', null, {
    params: { userId, monthsThreshold },
  });
  return response.data;
};

// ============================================================================
// Address Validation & Valuation (Wave 15)
// ============================================================================

export interface AddressValidationRequest {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface AddressValidationResponse {
  isValid: boolean;
  wasStandardized: boolean;
  street: string;
  city: string;
  state: string;
  zip: string;
  zip4: string | null;
  message: string | null;
}

export interface ValuationRefreshResponse {
  success: boolean;
  estimatedValue: number | null;
  lowEstimate: number | null;
  highEstimate: number | null;
  source: string | null;
  confidence: number | null;
  message: string | null;
}

/**
 * Validate and standardize a US address
 */
export const validateAddress = async (
  request: AddressValidationRequest
): Promise<AddressValidationResponse> => {
  const response = await http.post<AddressValidationResponse>(
    '/properties/validate-address',
    request
  );
  return response.data;
};

/**
 * Trigger a manual valuation refresh for a property
 */
export const refreshValuation = async (
  propertyId: string
): Promise<ValuationRefreshResponse> => {
  const response = await http.post<ValuationRefreshResponse>(
    `/properties/${propertyId}/refresh-valuation`
  );
  return response.data;
};
