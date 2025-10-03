// Central feature flag registry
// Flags should be documented; unstable/experimental flags prefixed with `exp_`
// Persisting strategies can evolve later (env, remote config, user profile overrides)

export type FeatureFlagKey =
  | 'routing_enabled'
  | 'onboarding_enabled'
  | 'exp_intelligence_dashboards'
  | 'exp_dual_ai_pipeline'
  | 'storybook_docs_enabled';

export interface FeatureFlagsState {
  routing_enabled: boolean;
  onboarding_enabled: boolean;
  exp_intelligence_dashboards: boolean;
  exp_dual_ai_pipeline: boolean;
  storybook_docs_enabled: boolean;
}

const defaultFlags: FeatureFlagsState = {
  routing_enabled: true, // Wave 1 target
  onboarding_enabled: false, // Will flip in Wave 2
  exp_intelligence_dashboards: false, // Wave 4
  exp_dual_ai_pipeline: false, // Wave 5
  storybook_docs_enabled: false,
};

let dynamicOverrides: Partial<FeatureFlagsState> = {};

export function setFeatureFlag<K extends keyof FeatureFlagsState>(key: K, value: FeatureFlagsState[K]) {
  dynamicOverrides[key] = value;
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
  recomputeSnapshot();
  emit();
}

export function useFeatureFlags(): FeatureFlagsState {
  return useSyncExternalStore(subscribe, getFeatureFlags, getFeatureFlags);
}

export function useFeatureFlag<K extends keyof FeatureFlagsState>(key: K): boolean {
  return useFeatureFlags()[key];
}
