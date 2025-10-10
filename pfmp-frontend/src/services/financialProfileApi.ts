import axios from 'axios';
import apiClient from './api';

export type FinancialProfileSectionKey =
  | 'household'
  | 'risk-goals'
  | 'tsp'
  | 'cash'
  | 'investments'
  | 'real-estate'
  | 'insurance'
  | 'income';

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
    value === 'insurance' ||
    value === 'income'
  );
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
    completedSections: parseSectionList(dto.completedSectionsJson),
    optedOutSections: parseSectionList(dto.optedOutSectionsJson),
    outstandingSections: parseSectionList(dto.outstandingSectionsJson),
    calculatedAt: dto.calculatedAt,
  };
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

export async function upsertRiskGoalsProfile(userId: number, payload: RiskGoalsProfilePayload): Promise<void> {
  await apiClient.post(`/financial-profile/${userId}/risk-goals`, payload);
}
