import apiClient from './api';

// ── Types ──

export interface FederalBenefitsProfile {
  federalBenefitsProfileId: number;
  userId: number;

  // FERS Pension
  high3AverageSalary: number | null;
  projectedAnnuity: number | null;
  projectedMonthlyPension: number | null;
  creditableYearsOfService: number | null;
  creditableMonthsOfService: number | null;
  minimumRetirementAge: string | null;
  isEligibleForSpecialRetirementSupplement: boolean | null;
  estimatedSupplementMonthly: number | null;
  supplementEligibilityAge: number | null;
  supplementEndAge: number | null;
  fersCumulativeRetirement: number | null;
  socialSecurityEstimateAt62: number | null;
  annualSalaryGrowthRate: number | null;

  // FEGLI
  hasFegliBasic: boolean;
  fegliBasicCoverage: number | null;
  hasFegliOptionA: boolean;
  hasFegliOptionB: boolean;
  fegliOptionBMultiple: number | null;
  hasFegliOptionC: boolean;
  fegliOptionCMultiple: number | null;
  fegliTotalMonthlyPremium: number | null;

  // FEHB
  fehbPlanName: string | null;
  fehbCoverageLevel: string | null;
  fehbMonthlyPremium: number | null;
  fehbEmployerContribution: number | null;

  // FEDVIP
  hasFedvipDental: boolean;
  fedvipDentalMonthlyPremium: number | null;
  hasFedvipVision: boolean;
  fedvipVisionMonthlyPremium: number | null;

  // FLTCIP
  hasFltcip: boolean;
  fltcipMonthlyPremium: number | null;

  // FSA/HSA
  hasFsa: boolean;
  fsaAnnualElection: number | null;
  hasHsa: boolean;
  hsaBalance: number | null;
  hsaAnnualContribution: number | null;

  // Upload metadata
  lastSf50UploadDate: string | null;
  lastSf50FileName: string | null;
  lastLesUploadDate: string | null;
  lastLesFileName: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface SaveFederalBenefitsRequest {
  high3AverageSalary?: number | null;
  projectedAnnuity?: number | null;
  projectedMonthlyPension?: number | null;
  creditableYearsOfService?: number | null;
  creditableMonthsOfService?: number | null;
  minimumRetirementAge?: string | null;
  isEligibleForSpecialRetirementSupplement?: boolean | null;
  estimatedSupplementMonthly?: number | null;
  supplementEligibilityAge?: number | null;
  supplementEndAge?: number | null;
  fersCumulativeRetirement?: number | null;
  socialSecurityEstimateAt62?: number | null;
  annualSalaryGrowthRate?: number | null;

  hasFegliBasic: boolean;
  fegliBasicCoverage?: number | null;
  hasFegliOptionA: boolean;
  hasFegliOptionB: boolean;
  fegliOptionBMultiple?: number | null;
  hasFegliOptionC: boolean;
  fegliOptionCMultiple?: number | null;
  fegliTotalMonthlyPremium?: number | null;

  fehbPlanName?: string | null;
  fehbCoverageLevel?: string | null;
  fehbMonthlyPremium?: number | null;
  fehbEmployerContribution?: number | null;

  hasFedvipDental: boolean;
  fedvipDentalMonthlyPremium?: number | null;
  hasFedvipVision: boolean;
  fedvipVisionMonthlyPremium?: number | null;

  hasFltcip: boolean;
  fltcipMonthlyPremium?: number | null;

  hasFsa: boolean;
  fsaAnnualElection?: number | null;
  hasHsa: boolean;
  hsaBalance?: number | null;
  hsaAnnualContribution?: number | null;
}

export interface Sf50UploadResponse {
  parsedSuccessfully: boolean;
  errorMessage: string | null;
  fieldsExtracted: number;
  payGrade: string | null;
  annualBasicPay: number | null;
  payBasis: string | null;
  agency: string | null;
  retirementPlan: string | null;
  serviceComputationDate: string | null;
  dateOfBirth: string | null;
  positionTitle: string | null;
  fegliCode: string | null;
}

export interface LesUploadResponse {
  parsedSuccessfully: boolean;
  errorMessage: string | null;
  fieldsExtracted: number;
  payPeriod: string | null;
  payGrade: string | null;
  annualBasicPay: number | null;
  biweeklyGross: number | null;
  biweeklyNet: number | null;
  fegliDeduction: number | null;
  fehbDeduction: number | null;
  fedvipDentalDeduction: number | null;
  fedvipVisionDeduction: number | null;
  fltcipDeduction: number | null;
  fsaDeduction: number | null;
  hsaDeduction: number | null;
  tspEmployeeDeduction: number | null;
  tspRothDeduction: number | null;
  tspCatchUpDeduction: number | null;
  tspAgencyMatch: number | null;
  retirementDeduction: number | null;
  fersCumulativeRetirement: number | null;
  federalTaxWithholding: number | null;
  stateTaxWithholding: number | null;
  oasdiDeduction: number | null;
  medicareDeduction: number | null;
  annualLeaveBalance: number | null;
  sickLeaveBalance: number | null;
}

export interface RetirementScenario {
  label: string;
  retirementAge: number;
  retirementAgeMonths: number;
  projectedServiceYears: number;
  projectedServiceMonths: number;
  multiplier: number;
  projectedHigh3: number;
  annualAnnuity: number;
  monthlyPension: number;
  supplementEligible: boolean;
  monthlySupplementEstimate: number;
  supplementMonths: number | null;
  totalMonthlyRetirementIncome: number;
  socialSecurityMonthly: number | null;
  projectedTspBalance: number | null;
  monthlyTspWithdrawal: number | null;
  isEligible: boolean;
  eligibilityNote: string | null;
}

export interface RetirementProjectionInputs {
  high3AverageSalary: number | null;
  annualSalaryGrowthRate: number | null;
  dateOfBirth: string | null;
  serviceComputationDate: string | null;
  socialSecurityEstimateAt62: number | null;
  currentCreditableYears: number | null;
  currentCreditableMonths: number | null;
  minimumRetirementAge: string | null;
  currentTspBalance: number | null;
  tspContributionRatePercent: number | null;
  tspEmployerMatchPercent: number | null;
  tspAnnualGrowthRate: number | null;
  inflationAssumptionPercent: number | null;
}

export interface RetirementProjectionResponse {
  scenarios: RetirementScenario[];
  inputs: RetirementProjectionInputs;
}

// ── API Calls ──

export async function fetchFederalBenefits(userId: number): Promise<FederalBenefitsProfile | null> {
  const { data } = await apiClient.get(`/federalbenefits/user/${userId}`);
  return data;
}

export async function saveFederalBenefits(
  userId: number,
  request: SaveFederalBenefitsRequest,
): Promise<FederalBenefitsProfile> {
  const { data } = await apiClient.post(`/federalbenefits/user/${userId}`, request);
  return data;
}

export async function uploadSf50(file: File): Promise<Sf50UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/federalbenefits/upload-sf50', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadLes(file: File): Promise<LesUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/federalbenefits/upload-les', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function applySf50(userId: number, file: File): Promise<FederalBenefitsProfile> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/federalbenefits/user/${userId}/apply-sf50`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function applyLes(userId: number, file: File): Promise<FederalBenefitsProfile> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/federalbenefits/user/${userId}/apply-les`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function fetchRetirementProjection(userId: number): Promise<RetirementProjectionResponse> {
  const { data } = await apiClient.get(`/federalbenefits/user/${userId}/retirement-projection`);
  return data;
}
