import apiClient from './api';

export interface EstatePlanningResponse {
  estatePlanningProfileId: number;
  userId: number;
  hasWill: boolean;
  willLastReviewedDate: string | null;
  hasTrust: boolean;
  trustType: string | null;
  trustLastReviewedDate: string | null;
  hasFinancialPOA: boolean;
  hasHealthcarePOA: boolean;
  hasAdvanceDirective: boolean;
  attorneyName: string | null;
  attorneyLastConsultDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveEstatePlanningRequest {
  hasWill: boolean;
  willLastReviewedDate: string | null;
  hasTrust: boolean;
  trustType: string | null;
  trustLastReviewedDate: string | null;
  hasFinancialPOA: boolean;
  hasHealthcarePOA: boolean;
  hasAdvanceDirective: boolean;
  attorneyName: string | null;
  attorneyLastConsultDate: string | null;
  notes: string | null;
}

export async function fetchEstatePlanning(userId: number): Promise<EstatePlanningResponse | null> {
  const { data } = await apiClient.get<EstatePlanningResponse | null>(`/EstatePlanning/user/${userId}`);
  return data;
}

export async function saveEstatePlanning(userId: number, request: SaveEstatePlanningRequest): Promise<EstatePlanningResponse> {
  const { data } = await apiClient.post<EstatePlanningResponse>(`/EstatePlanning/user/${userId}`, request);
  return data;
}
