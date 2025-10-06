import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { sortedSteps, type OnboardingStepId } from './steps';
import { fetchProgress, debouncedPatchStep, putProgress, resetProgress } from './persistence';
import { useFeatureFlag } from '../flags/featureFlags';
import { useDevUserId } from '../dev/devUserState';

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
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
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

interface OnboardingProviderProps {
  children: React.ReactNode;
  userId?: string;
  /** Test helper: if true, provider starts with all steps completed */
  testCompleteAll?: boolean;
  /** Test helper: explicit completed step IDs */
  testCompletedSteps?: OnboardingStepId[];
  /** Test helper: skip the automatic hydration side-effect on mount */
  skipAutoHydrate?: boolean;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  userId = 'dev-user',
  testCompleteAll,
  testCompletedSteps,
  skipAutoHydrate,
}) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (base) => {
    if (testCompleteAll) {
      return { currentIndex: stepsArr.length - 1, completed: new Set(stepsArr.map(s => s.id)) };
    }
    if (testCompletedSteps && testCompletedSteps.length) {
      return { currentIndex: stepsArr.length - 1, completed: new Set(testCompletedSteps) };
    }
    return base;
  });
  const persistenceEnabled = useFeatureFlag('onboarding_persistence_enabled');
  const devUserId = useDevUserId();
  const hydrationSeqRef = useRef(0);
  const isHydratingRef = useRef(false);
  const [hydrated, setHydrated] = React.useState(() => skipAutoHydrate ? true : !persistenceEnabled);

  const hydrate = useCallback(async () => {
    hydrationSeqRef.current += 1;
    const runId = hydrationSeqRef.current;

    if (!persistenceEnabled) {
      setHydrated(true);
      return;
    }

    isHydratingRef.current = true;
    setHydrated(false);
    dispatch({ type: 'RESET' });

    try {
      const dto = await fetchProgress();
      if (runId !== hydrationSeqRef.current) return;
      if (dto) {
        const validCompleted = (dto.completedStepIds ?? []).filter((id): id is OnboardingStepId =>
          stepsArr.some(step => step.id === id)
        );
        const currentIdx = dto.currentStepId ? stepsArr.findIndex(step => step.id === dto.currentStepId) : -1;
        let targetIndex = currentIdx;
        if (targetIndex < 0) {
          targetIndex = stepsArr.findIndex(step => !validCompleted.includes(step.id));
          if (targetIndex < 0) {
            targetIndex = stepsArr.length - 1;
          }
        }
        dispatch({ type: 'HYDRATE', currentIndex: targetIndex, completed: validCompleted });
      }
    } catch {
      if (runId !== hydrationSeqRef.current) return;
      // Ignore fetch errors; leave reset state in place.
    } finally {
      if (runId === hydrationSeqRef.current) {
        isHydratingRef.current = false;
        setHydrated(true);
      }
    }
  }, [persistenceEnabled]);

  useEffect(() => {
    if (skipAutoHydrate) {
      return;
    }
    void hydrate();
  }, [hydrate, devUserId, skipAutoHydrate]);

  const goNext = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const goPrev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const markComplete = useCallback((id?: OnboardingStepId) => {
    const target = id ?? stepsArr[state.currentIndex].id;
    dispatch({ type: 'MARK_COMPLETE', id: target });
    if (persistenceEnabled && hydrated) {
      debouncedPatchStep(target, { completed: true });
    }
  }, [state.currentIndex, persistenceEnabled, hydrated]);
  const reset = useCallback(async () => {
    dispatch({ type: 'RESET' });
    if (persistenceEnabled) {
      try {
        await resetProgress();
      } catch {
        // Ignore reset errors; UI already shows cleared state.
      }
      await hydrate();
    }
  }, [persistenceEnabled, hydrate]);
  const refresh = useCallback(() => hydrate(), [hydrate]);

  useEffect(() => {
    if (!persistenceEnabled || !hydrated || isHydratingRef.current) return;
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
    refresh,
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
