/**
 * Wave 22 Phase C — admin UI API client for /api/admin/ai-models.
 * Wraps GET (all slots), PUT (one slot), test ping, and catalog endpoints.
 */
import apiClient from './api';

// ----- Types -----

export type AIModelSlot = 'Primary' | 'Verifier' | 'Chat' | 'News' | 'Fusion';

export type AIReasoningEffort = 'Minimal' | 'Low' | 'Medium' | 'High' | 'XHigh';

export interface AISettingsRow {
  id: number;
  slot: AIModelSlot;
  model: string | null;
  maxTokens: number | null;
  temperature: number | null;
  topP: number | null;
  reasoningEffort: AIReasoningEffort | null;
  reasoningExclude: boolean | null;
  reasoningMaxTokens: number | null;
  fusionPreset: string | null;
  fusionJudgeModel: string | null;
  fusionMaxToolCalls: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedSlotConfig {
  slot: AIModelSlot;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number | null;
  reasoningEffort: AIReasoningEffort | null;
  reasoningExclude: boolean | null;
  reasoningMaxTokens: number | null;
  fusionPreset: string | null;
  fusionJudgeModel: string | null;
  fusionMaxToolCalls: number | null;
  /** Map of field name → "db" | "appsettings" | "unset" */
  fieldSources: Record<string, string>;
}

export interface SlotConfigEntry {
  slot: AIModelSlot;
  row: AISettingsRow | null;
  resolved: ResolvedSlotConfig;
}

export interface AppsettingsDefaults {
  primaryModel: string;
  verifierModel: string;
  chatModel: string;
  newsModel: string;
  fusionModel: string;
  fusionPreset: string;
  fusionJudgeModel: string;
  fusionMaxToolCalls: number;
  maxTokens: number;
  temperature: number;
}

export interface AIModelsResponse {
  slots: SlotConfigEntry[];
  appsettings: AppsettingsDefaults;
}

export interface AISettingsUpsertPayload {
  model?: string | null;
  maxTokens?: number | null;
  temperature?: number | null;
  topP?: number | null;
  reasoningEffort?: AIReasoningEffort | null;
  reasoningExclude?: boolean | null;
  reasoningMaxTokens?: number | null;
  fusionPreset?: string | null;
  fusionJudgeModel?: string | null;
  fusionMaxToolCalls?: number | null;
}

export interface TestPingResponse {
  slot: AIModelSlot;
  requestedModel?: string;
  actualModel?: string;
  model?: string;
  success: boolean;
  elapsedMs: number;
  cost?: number;
  tokens?: number;
  response?: string;
  error?: string;
}

export interface CatalogModel {
  id: string;
  name: string;
  description: string | null;
  contextLength: number | null;
  promptCostPer1M: number | null;
  completionCostPer1M: number | null;
  supportedParameters: string[] | null;
  created: string | null;
}

export interface CatalogResponse {
  fetchedAt: string;
  count: number;
  models: CatalogModel[];
}

// ----- API calls -----

export async function fetchAIModels(): Promise<AIModelsResponse> {
  const r = await apiClient.get<AIModelsResponse>('/admin/ai-models');
  return r.data;
}

export async function upsertSlot(slot: AIModelSlot, payload: AISettingsUpsertPayload): Promise<SlotConfigEntry> {
  const r = await apiClient.put<SlotConfigEntry>(`/admin/ai-models/${slot}`, payload);
  return r.data;
}

export async function testSlot(slot: AIModelSlot): Promise<TestPingResponse> {
  const r = await apiClient.post<TestPingResponse>(`/admin/ai-models/${slot}/test`);
  return r.data;
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  const r = await apiClient.get<CatalogResponse>('/admin/ai-models/catalog');
  return r.data;
}

export async function refreshCatalog(): Promise<CatalogResponse> {
  const r = await apiClient.post<CatalogResponse>('/admin/ai-models/catalog/refresh');
  return r.data;
}
