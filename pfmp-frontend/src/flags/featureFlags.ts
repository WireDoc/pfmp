// Central feature flag registry
// Flags should be documented; unstable/experimental flags prefixed with `exp_`
// Persisting strategies can evolve later (env, remote config, user profile overrides)

export type FeatureFlagKey =
  | 'routing_enabled'
  | 'onboarding_enabled'
  | 'onboarding_persistence_enabled'
  | 'exp_intelligence_dashboards'
  | 'exp_dual_ai_pipeline'
  | 'storybook_docs_enabled'
  | 'use_simulated_auth'
  | 'enableDashboardWave4'
  | 'dashboard_wave4_real_data';

export interface FeatureFlagsState {
  routing_enabled: boolean;
  onboarding_enabled: boolean;
  onboarding_persistence_enabled: boolean;
  exp_intelligence_dashboards: boolean;
  exp_dual_ai_pipeline: boolean;
  storybook_docs_enabled: boolean;
  use_simulated_auth: boolean;
  enableDashboardWave4: boolean;
  dashboard_wave4_real_data: boolean;
}

// Wave 25 Phase E — real Microsoft login is now the default. Simulated auth
// stays available for development three ways (any one works):
//   1. VITE_USE_SIMULATED_AUTH=true in .env.development.local (build-time default)
//   2. Dev Flags panel toggle (persisted in localStorage, survives refresh)
//   3. "Use simulated dev auth" button on the login page (dev builds only)
// Vitest keeps simulated auth on so the existing suite exercises the dev path.
const IS_TEST_MODE = import.meta.env.MODE === 'test';
const SIMULATED_AUTH_DEFAULT =
  IS_TEST_MODE || import.meta.env.VITE_USE_SIMULATED_AUTH === 'true';

const defaultFlags: FeatureFlagsState = {
  routing_enabled: true, // Wave 1 target
  onboarding_enabled: true, // Enabled for active onboarding dev testing
  onboarding_persistence_enabled: true, // Backend persistence now implemented
  exp_intelligence_dashboards: false, // Wave 4
  exp_dual_ai_pipeline: false, // Wave 5
  storybook_docs_enabled: false,
  use_simulated_auth: SIMULATED_AUTH_DEFAULT, // Wave 25 Phase E: real MSAL login by default
  enableDashboardWave4: true, // Wave 5 MVP - real dashboard with onboarding complete
  dashboard_wave4_real_data: true, // Wave 5 MVP - use real API instead of mocks
};

// Runtime overrides persist across refreshes so a Dev Flags panel toggle (e.g.
// switching back to simulated auth) sticks. Test mode skips persistence to keep
// runs hermetic.
const OVERRIDES_STORAGE_KEY = 'pfmp_flag_overrides';

function readPersistedOverrides(): Partial<FeatureFlagsState> {
  if (IS_TEST_MODE) return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<FeatureFlagsState> = {};
    for (const key of Object.keys(defaultFlags) as (keyof FeatureFlagsState)[]) {
      if (typeof parsed[key] === 'boolean') out[key] = parsed[key] as boolean;
    }
    return out;
  } catch {
    return {};
  }
}

function persistOverrides(overrides: Partial<FeatureFlagsState>) {
  if (IS_TEST_MODE) return;
  try {
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(OVERRIDES_STORAGE_KEY);
    } else {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch { /* restricted storage */ }
}

let dynamicOverrides: Partial<FeatureFlagsState> = readPersistedOverrides();

export function setFeatureFlag<K extends keyof FeatureFlagsState>(key: K, value: FeatureFlagsState[K]) {
  dynamicOverrides[key] = value;
  persistOverrides(dynamicOverrides);
}

// Internal cached snapshot to satisfy useSyncExternalStore requirement that
// getSnapshot returns the SAME reference when no state change occurred.
let currentSnapshot: FeatureFlagsState = { ...defaultFlags };
// Ensure initial snapshot reflects any preset overrides (none normally during tests)
recomputeSnapshot();

function recomputeSnapshot() {
  // Rebuild snapshot (cheap shallow merge – only 5 keys) and assign new ref.
  currentSnapshot = { ...defaultFlags, ...dynamicOverrides };
}

export function getFeatureFlags(): FeatureFlagsState {
  return currentSnapshot;
}

export function isFeatureEnabled<K extends keyof FeatureFlagsState>(key: K): boolean {
  return currentSnapshot[key];
}

// React hook (can later evolve to context/provider if runtime mutation grows)
import { useSyncExternalStore } from 'react';

type Subscriber = () => void;
const subs = new Set<Subscriber>();

function subscribe(cb: Subscriber) {
  subs.add(cb);
  return () => subs.delete(cb);
}

function emit() {
  subs.forEach((cb) => cb());
}

export function updateFlags(partial: Partial<FeatureFlagsState>) {
  let changed = false;
  for (const k of Object.keys(partial) as (keyof FeatureFlagsState)[]) {
    if (dynamicOverrides[k] !== partial[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) {
    // Even if nothing changed, allow an explicit refresh by forcing emit? Skip to avoid loops.
    return;
  }
  dynamicOverrides = { ...dynamicOverrides, ...partial };
  persistOverrides(dynamicOverrides);
  recomputeSnapshot();
  emit();
}

export function useFeatureFlags(): FeatureFlagsState {
  return useSyncExternalStore(subscribe, getFeatureFlags, getFeatureFlags);
}

export function useFeatureFlag<K extends keyof FeatureFlagsState>(key: K): boolean {
  return useFeatureFlags()[key];
}
