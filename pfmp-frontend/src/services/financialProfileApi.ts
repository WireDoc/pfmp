import axios from 'axios';
import apiClient from './api';

export type FinancialProfileSectionKey =
  | 'household'
  | 'risk-goals'
  | 'tsp'
  | 'cash'
  | 'investments'
  | 'real-estate'
  | 'long-term-obligations'
  | 'liabilities'
  | 'expenses'
  | 'tax'
  | 'insurance'
  | 'benefits'
  | 'income'
  | 'equity';

export type FinancialProfileSectionStatusValue = 'completed' | 'opted_out' | 'needs_info';

export interface FinancialProfileSectionStatus {
  sectionStatusId: string;
  userId: number;
  sectionKey: FinancialProfileSectionKey;
  status: FinancialProfileSectionStatusValue;
  optOutReason: string | null;
  optOutAcknowledgedAt: string | null;
  dataChecksum: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface SectionOptOutPayload {
  isOptedOut: boolean;
  reason?: string | null;
  acknowledgedAt?: string | null;
}

export interface HouseholdProfilePayload {
  preferredName?: string | null;
  maritalStatus?: string | null;
  dependentCount?: number | null;
  serviceNotes?: string | null;
  optOut?: SectionOptOutPayload | null;
}

export interface RiskGoalsProfilePayload {
  riskTolerance?: number | null;
  targetRetirementDate?: string | null;
  passiveIncomeGoal?: number | null;
  liquidityBufferMonths?: number | null;
  emergencyFundTarget?: number | null;
  optOut?: SectionOptOutPayload | null;
}

export interface TspProfilePayload {
  contributionRatePercent?: number | null;
  employerMatchPercent?: number | null;
  currentBalance?: number | null;
  targetBalance?: number | null;
  gFundPercent?: number | null;
  fFundPercent?: number | null;
  cFundPercent?: number | null;
  sFundPercent?: number | null;
  iFundPercent?: number | null;
  lifecyclePercent?: number | null;
  lifecycleBalance?: number | null;
  // added - granular lifecycle positions (e.g., L2030, L2035, ... L2075)
  lifecyclePositions?: Array<{
    // Unified fund codes: base funds + L-Income + lifecycle dated funds
    fundCode:
      | 'G'
      | 'F'
      | 'C'
      | 'S'
      | 'I'
      | 'L-INCOME'
      | 'L2030'
      | 'L2035'
      | 'L2040'
      | 'L2045'
      | 'L2050'
      | 'L2055'
      | 'L2060'
      | 'L2065'
      | 'L2070'
      | 'L2075';
    contributionPercent?: number | null;
    units?: number | null;
    dateUpdated?: string | null;
  }> | null;
  optOut?: SectionOptOutPayload | null;
}

export interface CashAccountPayload {
  nickname?: string | null;
  accountType?: string | null;
  institution?: string | null;
  balance?: number | null;
  interestRateApr?: number | null;
  isEmergencyFund?: boolean | null;
  rateLastChecked?: string | null;
}

export interface CashAccountsProfilePayload {
  accounts: CashAccountPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface InvestmentAccountPayload {
  accountName?: string | null;
  accountCategory?: string | null;
  institution?: string | null;
  assetClass?: string | null;
  currentValue?: number | null;
  costBasis?: number | null;
  contributionRatePercent?: number | null;
  isTaxAdvantaged?: boolean | null;
  lastContributionDate?: string | null;
}

export interface InvestmentAccountsProfilePayload {
  accounts: InvestmentAccountPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface PropertyPayload {
  propertyName?: string | null;
  propertyType?: string | null;
  occupancy?: string | null;
  estimatedValue?: number | null;
  mortgageBalance?: number | null;
  monthlyMortgagePayment?: number | null;
  monthlyRentalIncome?: number | null;
  monthlyExpenses?: number | null;
  hasHeloc?: boolean | null;
}

export interface PropertiesProfilePayload {
  properties: PropertyPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface InsurancePolicyPayload {
  policyType?: string | null;
  carrier?: string | null;
  policyName?: string | null;
  coverageAmount?: number | null;
  premiumAmount?: number | null;
  premiumFrequency?: string | null;
  renewalDate?: string | null;
  isAdequateCoverage?: boolean | null;
  recommendedCoverage?: number | null;
}

export interface InsurancePoliciesProfilePayload {
  policies: InsurancePolicyPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface LongTermObligationPayload {
  obligationName?: string | null;
  obligationType?: string | null;
  targetDate?: string | null;
  estimatedCost?: number | null;
  fundsAllocated?: number | null;
  fundingStatus?: string | null;
  isCritical?: boolean | null;
  notes?: string | null;
}

export interface LongTermObligationsProfilePayload {
  obligations: LongTermObligationPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface LiabilityPayload {
  liabilityType?: string | null;
  lender?: string | null;
  currentBalance?: number | null;
  interestRateApr?: number | null;
  minimumPayment?: number | null;
  payoffTargetDate?: string | null;
  isPriorityToEliminate?: boolean | null;
}

export interface LiabilitiesProfilePayload {
  liabilities: LiabilityPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface ExpenseBudgetPayload {
  category?: string | null;
  monthlyAmount?: number | null;
  isEstimated?: boolean | null;
  notes?: string | null;
}

export interface ExpensesProfilePayload {
  expenses: ExpenseBudgetPayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface TaxProfilePayload {
  filingStatus?: string | null;
  stateOfResidence?: string | null;
  marginalRatePercent?: number | null;
  effectiveRatePercent?: number | null;
  federalWithholdingPercent?: number | null;
  expectedRefundAmount?: number | null;
  expectedPaymentAmount?: number | null;
  usesCpaOrPreparer?: boolean | null;
  notes?: string | null;
  optOut?: SectionOptOutPayload | null;
}

export interface BenefitCoveragePayload {
  benefitType?: string | null;
  provider?: string | null;
  isEnrolled?: boolean | null;
  employerContributionPercent?: number | null;
  monthlyCost?: number | null;
  notes?: string | null;
}

export interface BenefitsProfilePayload {
  benefits: BenefitCoveragePayload[];
  optOut?: SectionOptOutPayload | null;
}

export interface EquityInterestPayload {
  isInterestedInTracking?: boolean | null;
  notes?: string | null;
  optOut?: SectionOptOutPayload | null;
}

export interface IncomeStreamPayload {
  name?: string | null;
  incomeType?: string | null;
  monthlyAmount?: number | null;
  annualAmount?: number | null;
  isGuaranteed?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
}

export interface IncomeStreamsProfilePayload {
  streams: IncomeStreamPayload[];
  optOut?: SectionOptOutPayload | null;
}

interface FinancialProfileSectionStatusDto {
  sectionStatusId: string;
  userId: number;
  sectionKey: string;
  status: FinancialProfileSectionStatusValue;
  optOutReason?: string | null;
  optOutAcknowledgedAt?: string | null;
  dataChecksum?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface FinancialProfileSnapshot {
  userId: number;
  completionPercent: number;
  completedSectionCount: number;
  optedOutSectionCount: number;
  outstandingSectionCount: number;
  profileCompletedAt: string | null;
  netWorthEstimate: number;
  monthlyCashFlowEstimate: number;
  longTermObligationCount: number;
  longTermObligationEstimate: number;
  nextObligationDueDate: string | null;
  totalLiabilityBalance: number;
  monthlyDebtServiceEstimate: number;
  monthlyExpenseEstimate: number;
  marginalTaxRatePercent: number | null;
  effectiveTaxRatePercent: number | null;
  federalWithholdingPercent: number | null;
  usesCpaOrPreparer: boolean;
  completedSections: FinancialProfileSectionKey[];
  optedOutSections: FinancialProfileSectionKey[];
  outstandingSections: FinancialProfileSectionKey[];
  calculatedAt: string;
}

interface FinancialProfileSnapshotDto {
  userId: number;
  completionPercent: number;
  completedSectionCount: number;
  optedOutSectionCount: number;
  outstandingSectionCount: number;
  profileCompletedAt?: string | null;
  netWorthEstimate: number;
  monthlyCashFlowEstimate: number;
  longTermObligationCount?: number;
  longTermObligationEstimate?: number;
  nextObligationDueDate?: string | null;
  totalLiabilityBalance?: number;
  monthlyDebtServiceEstimate?: number;
  monthlyExpenseEstimate?: number;
  marginalTaxRatePercent?: number | null;
  effectiveTaxRatePercent?: number | null;
  federalWithholdingPercent?: number | null;
  usesCpaOrPreparer?: boolean;
  completedSectionsJson?: string | null;
  optedOutSectionsJson?: string | null;
  outstandingSectionsJson?: string | null;
  calculatedAt: string;
}

function assertSectionKey(value: string): value is FinancialProfileSectionKey {
  return (
    value === 'household' ||
    value === 'risk-goals' ||
    value === 'tsp' ||
    value === 'cash' ||
    value === 'investments' ||
    value === 'real-estate' ||
  value === 'long-term-obligations' ||
    value === 'liabilities' ||
    value === 'expenses' ||
    value === 'tax' ||
    value === 'insurance' ||
    value === 'benefits' ||
    value === 'income' ||
    value === 'equity'
  );
}

// Temporary freshness guard: trigger a daily TSP snapshot on demand.
// This will be replaced by a background job (server-side scheduler) later.
export async function ensureTspSnapshotFresh(userId: number): Promise<void> {
  try {
    // Backend is idempotent per user+asOf; safe to call unconditionally on dashboard load.
    await apiClient.post(`/api/financial-profile/${userId}/tsp/snapshot`);
  } catch (err) {
    // Non-fatal: dashboard can continue even if snapshot creation fails.
    // Vite: use import.meta.env.MODE for environment checks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mode = (import.meta as any)?.env?.MODE ?? 'production';
    if (mode !== 'production') {
      console.debug('[tsp] snapshot ensure failed (non-fatal):', err);
    }
  }
}

// TSP summary-lite shapes for quick reads
export interface TspSummaryLiteItem {
  fundCode: string;
  currentPrice: number | null;
  units: number;
  currentMarketValue: number | null;
  currentMixPercent: number | null;
}
export interface TspSummaryLite {
  items: TspSummaryLiteItem[];
  totalBalance: number | null;
  asOfUtc: string | null;
}

export async function fetchTspSummaryLite(userId: number): Promise<TspSummaryLite> {
  const resp = await apiClient.get(`/api/financial-profile/${userId}/tsp/summary-lite`);
  const dto = resp.data as {
    items?: Array<{ fundCode?: string; currentPrice?: number | null; units?: number | null; currentMarketValue?: number | null; currentMixPercent?: number | null }>;
    totalBalance?: number | null;
    asOfUtc?: string | null;
  };
  return {
    items: (dto.items ?? []).map((i) => ({
      fundCode: String(i.fundCode ?? ''),
      currentPrice: i.currentPrice ?? null,
      units: Number(i.units ?? 0),
      currentMarketValue: i.currentMarketValue ?? null,
      currentMixPercent: i.currentMixPercent ?? null,
    })),
    totalBalance: dto.totalBalance ?? null,
    asOfUtc: dto.asOfUtc ?? null,
  };
}

function mapStatusDto(dto: FinancialProfileSectionStatusDto): FinancialProfileSectionStatus {
  const key = assertSectionKey(dto.sectionKey) ? dto.sectionKey : 'household';
  return {
    sectionStatusId: dto.sectionStatusId,
    userId: dto.userId,
    sectionKey: key,
    status: dto.status,
    optOutReason: dto.optOutReason ?? null,
    optOutAcknowledgedAt: dto.optOutAcknowledgedAt ?? null,
    dataChecksum: dto.dataChecksum ?? null,
    updatedAt: dto.updatedAt,
    createdAt: dto.createdAt,
  };
}

function parseSectionList(value?: string | null): FinancialProfileSectionKey[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FinancialProfileSectionKey => typeof item === 'string' && assertSectionKey(item));
  } catch {
    return [];
  }
}

function mapSnapshotDto(dto: FinancialProfileSnapshotDto): FinancialProfileSnapshot {
  return {
    userId: dto.userId,
    completionPercent: Number(dto.completionPercent ?? 0),
    completedSectionCount: dto.completedSectionCount ?? 0,
    optedOutSectionCount: dto.optedOutSectionCount ?? 0,
    outstandingSectionCount: dto.outstandingSectionCount ?? 0,
    profileCompletedAt: dto.profileCompletedAt ?? null,
    netWorthEstimate: Number(dto.netWorthEstimate ?? 0),
    monthlyCashFlowEstimate: Number(dto.monthlyCashFlowEstimate ?? 0),
  longTermObligationCount: Number(dto.longTermObligationCount ?? 0),
  longTermObligationEstimate: Number(dto.longTermObligationEstimate ?? 0),
  nextObligationDueDate: dto.nextObligationDueDate ?? null,
    totalLiabilityBalance: Number(dto.totalLiabilityBalance ?? 0),
    monthlyDebtServiceEstimate: Number(dto.monthlyDebtServiceEstimate ?? 0),
    monthlyExpenseEstimate: Number(dto.monthlyExpenseEstimate ?? 0),
    marginalTaxRatePercent: dto.marginalTaxRatePercent ?? null,
    effectiveTaxRatePercent: dto.effectiveTaxRatePercent ?? null,
    federalWithholdingPercent: dto.federalWithholdingPercent ?? null,
    usesCpaOrPreparer: dto.usesCpaOrPreparer ?? false,
    completedSections: parseSectionList(dto.completedSectionsJson),
    optedOutSections: parseSectionList(dto.optedOutSectionsJson),
    outstandingSections: parseSectionList(dto.outstandingSectionsJson),
    calculatedAt: dto.calculatedAt,
  };
}

function normalizeOptOut(optOut?: SectionOptOutPayload | null): SectionOptOutPayload | null {
  if (!optOut) return null;
  return {
    isOptedOut: Boolean(optOut.isOptedOut),
    reason: optOut.reason ?? null,
    acknowledgedAt: optOut.acknowledgedAt ?? null,
  };
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export async function fetchFinancialProfileSectionStatuses(userId: number): Promise<FinancialProfileSectionStatus[]> {
  const { data } = await apiClient.get<FinancialProfileSectionStatusDto[]>(`/financial-profile/${userId}/sections`);
  return (data ?? []).map(mapStatusDto);
}

export async function fetchFinancialProfileSnapshot(userId: number): Promise<FinancialProfileSnapshot | null> {
  try {
    const { data } = await apiClient.get<FinancialProfileSnapshotDto>(`/financial-profile/${userId}/snapshot`);
    return mapSnapshotDto(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function upsertHouseholdProfile(userId: number, payload: HouseholdProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/household`, payload);
}

export async function fetchHouseholdProfile(userId: number): Promise<HouseholdProfilePayload> {
  const { data } = await apiClient.get<HouseholdProfilePayload>(`/financial-profile/${userId}/household`);
  return {
    preferredName: data?.preferredName ?? null,
    maritalStatus: data?.maritalStatus ?? null,
    dependentCount: data?.dependentCount ?? null,
    serviceNotes: data?.serviceNotes ?? null,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertRiskGoalsProfile(userId: number, payload: RiskGoalsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/risk-goals`, payload);
}

export async function fetchRiskGoalsProfile(userId: number): Promise<RiskGoalsProfilePayload> {
  const { data } = await apiClient.get<RiskGoalsProfilePayload>(`/financial-profile/${userId}/risk-goals`);
  return {
    riskTolerance: data?.riskTolerance ?? null,
    targetRetirementDate: data?.targetRetirementDate ?? null,
    passiveIncomeGoal: data?.passiveIncomeGoal ?? null,
    liquidityBufferMonths: data?.liquidityBufferMonths ?? null,
    emergencyFundTarget: data?.emergencyFundTarget ?? null,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertTspProfile(userId: number, payload: TspProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/tsp`, payload);
}

export async function fetchTspProfile(userId: number): Promise<TspProfilePayload> {
  const { data } = await apiClient.get<TspProfilePayload>(`/financial-profile/${userId}/tsp`);
  return {
    contributionRatePercent: data?.contributionRatePercent ?? 0,
    employerMatchPercent: data?.employerMatchPercent ?? 0,
    currentBalance: data?.currentBalance ?? 0,
    targetBalance: data?.targetBalance ?? 0,
    gFundPercent: data?.gFundPercent ?? 0,
    fFundPercent: data?.fFundPercent ?? 0,
    cFundPercent: data?.cFundPercent ?? 0,
    sFundPercent: data?.sFundPercent ?? 0,
    iFundPercent: data?.iFundPercent ?? 0,
    lifecyclePercent: data?.lifecyclePercent ?? null,
    lifecycleBalance: data?.lifecycleBalance ?? null,
    lifecyclePositions: Array.isArray(data?.lifecyclePositions) ? data?.lifecyclePositions ?? [] : [],
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertCashAccountsProfile(userId: number, payload: CashAccountsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/cash`, payload);
}

export async function fetchCashAccountsProfile(userId: number): Promise<CashAccountsProfilePayload> {
  const { data } = await apiClient.get<CashAccountsProfilePayload>(`/financial-profile/${userId}/cash`);
  const accounts = ensureArray(data?.accounts).map((account) => ({
    nickname: account?.nickname ?? null,
    accountType: account?.accountType ?? 'checking',
    institution: account?.institution ?? null,
    balance: account?.balance ?? null,
    interestRateApr: account?.interestRateApr ?? null,
    isEmergencyFund: account?.isEmergencyFund ?? false,
    rateLastChecked: account?.rateLastChecked ?? null,
  }));

  return {
    accounts,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertInvestmentAccountsProfile(userId: number, payload: InvestmentAccountsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/investments`, payload);
}

export async function fetchInvestmentAccountsProfile(userId: number): Promise<InvestmentAccountsProfilePayload> {
  const { data } = await apiClient.get<InvestmentAccountsProfilePayload>(`/financial-profile/${userId}/investments`);
  const accounts = ensureArray(data?.accounts).map((account) => ({
    accountName: account?.accountName ?? null,
    accountCategory: account?.accountCategory ?? 'brokerage',
    institution: account?.institution ?? null,
    assetClass: account?.assetClass ?? null,
    currentValue: account?.currentValue ?? null,
    costBasis: account?.costBasis ?? null,
    contributionRatePercent: account?.contributionRatePercent ?? null,
    isTaxAdvantaged: account?.isTaxAdvantaged ?? false,
    lastContributionDate: account?.lastContributionDate ?? null,
  }));

  return {
    accounts,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertPropertiesProfile(userId: number, payload: PropertiesProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/real-estate`, payload);
}

export async function fetchPropertiesProfile(userId: number): Promise<PropertiesProfilePayload> {
  const { data } = await apiClient.get<PropertiesProfilePayload>(`/financial-profile/${userId}/real-estate`);
  const properties = ensureArray(data?.properties).map((property) => ({
    propertyName: property?.propertyName ?? null,
    propertyType: property?.propertyType ?? 'primary',
    occupancy: property?.occupancy ?? 'owner',
    estimatedValue: property?.estimatedValue ?? null,
    mortgageBalance: property?.mortgageBalance ?? null,
    monthlyMortgagePayment: property?.monthlyMortgagePayment ?? null,
    monthlyRentalIncome: property?.monthlyRentalIncome ?? null,
    monthlyExpenses: property?.monthlyExpenses ?? null,
    hasHeloc: property?.hasHeloc ?? false,
  }));

  return {
    properties,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertLongTermObligationsProfile(userId: number, payload: LongTermObligationsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/long-term-obligations`, payload);
}

export async function fetchLongTermObligationsProfile(userId: number): Promise<LongTermObligationsProfilePayload> {
  const { data } = await apiClient.get<LongTermObligationsProfilePayload>(
    `/financial-profile/${userId}/long-term-obligations`
  );
  const obligations = ensureArray(data?.obligations).map((obligation) => ({
    obligationName: obligation?.obligationName ?? null,
    obligationType: obligation?.obligationType ?? 'general',
    targetDate: obligation?.targetDate ?? null,
    estimatedCost: obligation?.estimatedCost ?? null,
    fundsAllocated: obligation?.fundsAllocated ?? null,
    fundingStatus: obligation?.fundingStatus ?? null,
    isCritical: obligation?.isCritical ?? false,
    notes: obligation?.notes ?? null,
  }));

  return {
    obligations,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertLiabilitiesProfile(userId: number, payload: LiabilitiesProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/liabilities`, payload);
}

export async function fetchLiabilitiesProfile(userId: number): Promise<LiabilitiesProfilePayload> {
  const { data } = await apiClient.get<LiabilitiesProfilePayload>(`/financial-profile/${userId}/liabilities`);
  const liabilities = ensureArray(data?.liabilities).map((liability) => ({
    liabilityType: liability?.liabilityType ?? null,
    lender: liability?.lender ?? null,
    currentBalance: liability?.currentBalance ?? null,
    interestRateApr: liability?.interestRateApr ?? null,
    minimumPayment: liability?.minimumPayment ?? null,
    payoffTargetDate: liability?.payoffTargetDate ?? null,
    isPriorityToEliminate: liability?.isPriorityToEliminate ?? false,
  }));

  return {
    liabilities,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertExpensesProfile(userId: number, payload: ExpensesProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/expenses`, payload);
}

export async function fetchExpensesProfile(userId: number): Promise<ExpensesProfilePayload> {
  const { data } = await apiClient.get<ExpensesProfilePayload>(`/financial-profile/${userId}/expenses`);
  const expenses = ensureArray(data?.expenses).map((expense) => ({
    category: expense?.category ?? null,
    monthlyAmount: expense?.monthlyAmount ?? null,
    isEstimated: expense?.isEstimated ?? false,
    notes: expense?.notes ?? null,
  }));

  return {
    expenses,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertTaxProfile(userId: number, payload: TaxProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/tax`, payload);
}

export async function fetchTaxProfile(userId: number): Promise<TaxProfilePayload> {
  const { data } = await apiClient.get<TaxProfilePayload>(`/financial-profile/${userId}/tax`);
  return {
    filingStatus: data?.filingStatus ?? 'single',
    stateOfResidence: data?.stateOfResidence ?? null,
    marginalRatePercent: data?.marginalRatePercent ?? null,
    effectiveRatePercent: data?.effectiveRatePercent ?? null,
    federalWithholdingPercent: data?.federalWithholdingPercent ?? null,
    expectedRefundAmount: data?.expectedRefundAmount ?? null,
    expectedPaymentAmount: data?.expectedPaymentAmount ?? null,
    usesCpaOrPreparer: data?.usesCpaOrPreparer ?? false,
    notes: data?.notes ?? null,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertInsurancePoliciesProfile(userId: number, payload: InsurancePoliciesProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/insurance`, payload);
}

export async function fetchInsurancePoliciesProfile(userId: number): Promise<InsurancePoliciesProfilePayload> {
  const { data } = await apiClient.get<InsurancePoliciesProfilePayload>(`/financial-profile/${userId}/insurance`);
  const policies = ensureArray(data?.policies).map((policy) => ({
    policyType: policy?.policyType ?? null,
    carrier: policy?.carrier ?? null,
    policyName: policy?.policyName ?? null,
    coverageAmount: policy?.coverageAmount ?? null,
    premiumAmount: policy?.premiumAmount ?? null,
    premiumFrequency: policy?.premiumFrequency ?? null,
    renewalDate: policy?.renewalDate ?? null,
    isAdequateCoverage: policy?.isAdequateCoverage ?? false,
    recommendedCoverage: policy?.recommendedCoverage ?? null,
  }));

  return {
    policies,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertBenefitsProfile(userId: number, payload: BenefitsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/benefits`, payload);
}

export async function fetchBenefitsProfile(userId: number): Promise<BenefitsProfilePayload> {
  const { data } = await apiClient.get<BenefitsProfilePayload>(`/financial-profile/${userId}/benefits`);
  const benefits = ensureArray(data?.benefits).map((benefit) => ({
    benefitType: benefit?.benefitType ?? null,
    provider: benefit?.provider ?? null,
    isEnrolled: benefit?.isEnrolled ?? false,
    employerContributionPercent: benefit?.employerContributionPercent ?? null,
    monthlyCost: benefit?.monthlyCost ?? null,
    notes: benefit?.notes ?? null,
  }));

  return {
    benefits,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertIncomeStreamsProfile(userId: number, payload: IncomeStreamsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/income`, payload);
}

export async function fetchIncomeStreamsProfile(userId: number): Promise<IncomeStreamsProfilePayload> {
  const { data } = await apiClient.get<IncomeStreamsProfilePayload>(`/financial-profile/${userId}/income`);
  const streams = ensureArray(data?.streams).map((stream) => ({
    name: stream?.name ?? null,
    incomeType: stream?.incomeType ?? 'salary',
    monthlyAmount: stream?.monthlyAmount ?? null,
    annualAmount: stream?.annualAmount ?? null,
    isGuaranteed: stream?.isGuaranteed ?? false,
    startDate: stream?.startDate ?? null,
    endDate: stream?.endDate ?? null,
    isActive: stream?.isActive ?? true,
  }));

  return {
    streams,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}

export async function upsertEquityInterest(userId: number, payload: EquityInterestPayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/equity`, payload);
}

export async function fetchEquityInterest(userId: number): Promise<EquityInterestPayload> {
  const { data } = await apiClient.get<EquityInterestPayload>(`/financial-profile/${userId}/equity`);
  return {
    isInterestedInTracking: data?.isInterestedInTracking ?? false,
    notes: data?.notes ?? null,
    optOut: normalizeOptOut(data?.optOut ?? null),
  };
}
