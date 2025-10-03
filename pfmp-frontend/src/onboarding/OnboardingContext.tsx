import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { sortedSteps, type OnboardingStepId } from './steps';
import { fetchProgress, debouncedPatchStep, putProgress } from './persistence';
import { useFeatureFlag } from '../flags/featureFlags';

interface OnboardingState {
  currentIndex: number;
  completed: Set<OnboardingStepId>;
}

interface OnboardingContextValue {
  steps: ReturnType<typeof sortedSteps>;
  current: { id: OnboardingStepId; index: number; isLast: boolean; isFirst: boolean };
  completed: Set<OnboardingStepId>;
  goNext: () => void;
  goPrev: () => void;
  markComplete: (id?: OnboardingStepId) => void;
  reset: () => void;
  progressPercent: number;
  hydrated: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const stepsArr = sortedSteps();

const INITIAL_STATE: OnboardingState = {
  currentIndex: 0,
  completed: new Set<OnboardingStepId>(),
};

type Action =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'MARK_COMPLETE'; id: OnboardingStepId }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; currentIndex: number; completed: OnboardingStepId[] };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, stepsArr.length - 1) };
    case 'PREV':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'MARK_COMPLETE': {
      const completed = new Set(state.completed);
      completed.add(action.id);
      return { ...state, completed };
    }
    case 'RESET':
      return INITIAL_STATE;
    case 'HYDRATE':
      return { currentIndex: action.currentIndex, completed: new Set(action.completed) };
    default:
      return state;
  }
}

export const OnboardingProvider: React.FC<{ children: React.ReactNode; userId?: string }> = ({ children, userId = 'dev-user' }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const persistenceEnabled = useFeatureFlag('onboarding_persistence_enabled');
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = React.useState(!persistenceEnabled); // if disabled treat as hydrated

  // Hydrate from backend if enabled
  useEffect(() => {
    let cancelled = false;
    if (!persistenceEnabled || hydratedRef.current) return;
    (async () => {
      try {
        const dto = await fetchProgress();
        if (cancelled) return;
        if (dto) {
          const idx = stepsArr.findIndex(s => s.id === dto.currentStepId);
          dispatch({ type: 'HYDRATE', currentIndex: idx >= 0 ? idx : 0, completed: dto.completedStepIds });
        }
      } catch {
        // Ignore; leave initial state intact
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [persistenceEnabled]);

  const goNext = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const goPrev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const markComplete = useCallback((id?: OnboardingStepId) => {
    const target = id ?? stepsArr[state.currentIndex].id;
    dispatch({ type: 'MARK_COMPLETE', id: target });
    if (persistenceEnabled) {
      debouncedPatchStep(target, { completed: true });
    }
  }, [state.currentIndex, persistenceEnabled]);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  // Persist full snapshot on major transitions (index or completion changes)
  useEffect(() => {
    if (!persistenceEnabled || !hydrated) return;
    const currentStepId = stepsArr[state.currentIndex].id;
    const dto = {
      userId,
      completedStepIds: Array.from(state.completed),
      currentStepId,
      stepPayloads: {},
    };
    putProgress(dto).catch(() => {});
  }, [state.currentIndex, state.completed, persistenceEnabled, hydrated, userId]);

  const currentStepDef = stepsArr[state.currentIndex];
  const progressPercent = useMemo(() => (state.completed.size / stepsArr.length) * 100, [state.completed.size]);

  const value: OnboardingContextValue = {
    steps: stepsArr,
    current: { id: currentStepDef.id, index: state.currentIndex, isFirst: state.currentIndex === 0, isLast: state.currentIndex === stepsArr.length - 1 },
    completed: state.completed,
    goNext,
    goPrev,
    markComplete,
    reset,
    progressPercent,
    hydrated,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
