// Wave 3 Onboarding Persistence Service (scaffold)
// Guards: only used when feature flag `onboarding_persistence_enabled` is true.
// Endpoints (planned):
//   GET    /api/onboarding/progress           -> OnboardingProgressDTO (or 404 for fresh start)
//   PUT    /api/onboarding/progress           -> Upsert full snapshot
//   PATCH  /api/onboarding/progress/step/{id} -> Partial step update { data, completed? }

import { isFeatureEnabled } from '../flags/featureFlags';
import type { OnboardingStepId } from './steps';

export interface OnboardingProgressDTO {
  userId: string;
  completedStepIds: OnboardingStepId[];
  currentStepId: OnboardingStepId;
  stepPayloads?: Record<string, unknown>;
  updatedUtc: string;
}

const API_BASE = '/api/onboarding';

async function safeJson<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  if (!text) return {} as T; // defensive
  return JSON.parse(text) as T;
}

export async function fetchProgress(): Promise<OnboardingProgressDTO | null> {
  if (!isFeatureEnabled('onboarding_persistence_enabled')) return null;
  const resp = await fetch(`${API_BASE}/progress`);
  if (resp.status === 404) return null; // treat as new user
  if (!resp.ok) throw new Error(`Failed to fetch onboarding progress (${resp.status})`);
  return safeJson<OnboardingProgressDTO>(resp);
}

export async function putProgress(dto: Omit<OnboardingProgressDTO, 'updatedUtc'>): Promise<void> {
  if (!isFeatureEnabled('onboarding_persistence_enabled')) return;
  await fetch(`${API_BASE}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function patchStep(stepId: OnboardingStepId, payload: { data?: unknown; completed?: boolean }): Promise<void> {
  if (!isFeatureEnabled('onboarding_persistence_enabled')) return;
  await fetch(`${API_BASE}/progress/step/${stepId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Debounce utility (simple trailing debounce)
function debounce<F extends (...args: any[]) => void>(fn: F, ms: number) {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

export const debouncedPatchStep = debounce(patchStep, 400);
