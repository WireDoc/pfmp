import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { sortedSteps, type OnboardingStepId } from './steps';
import { useDevUserId } from '../dev/devUserState';
import { fetchFinancialProfileSectionStatuses, type FinancialProfileSectionStatusValue } from '../services/financialProfileApi';
import { OnboardingContext } from './OnboardingContext.shared';
import type { OnboardingContextValue } from './OnboardingContext.shared';

const stepsArr = sortedSteps();

type StatusMap = Record<OnboardingStepId, FinancialProfileSectionStatusValue>;

interface OnboardingState {
  currentIndex: number;
  completed: Set<OnboardingStepId>;
  statuses: StatusMap;
}

const createInitialStatuses = (): StatusMap =>
  stepsArr.reduce((acc, step) => {
    acc[step.id] = 'needs_info';
    return acc;
  }, {} as StatusMap);

const createInitialState = (): OnboardingState => ({
  currentIndex: 0,
  completed: new Set<OnboardingStepId>(),
  statuses: createInitialStatuses(),
});

type Action =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'RESET' }
  | { type: 'SET_STATUS'; id: OnboardingStepId; status: FinancialProfileSectionStatusValue }
  | { type: 'HYDRATE'; currentIndex: number; statuses: StatusMap }
  | { type: 'SET_INDEX'; index: number };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, stepsArr.length - 1) };
    case 'PREV':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'RESET':
      return createInitialState();
    case 'SET_STATUS': {
      const statuses: StatusMap = { ...state.statuses, [action.id]: action.status };
      const completed = new Set(state.completed);
      if (action.status === 'completed' || action.status === 'opted_out') {
        completed.add(action.id);
      } else {
        completed.delete(action.id);
      }
      return { ...state, statuses, completed };
    }
    case 'HYDRATE': {
      const statuses: StatusMap = { ...action.statuses };
      const completed = new Set<OnboardingStepId>();
      (Object.entries(statuses) as [OnboardingStepId, FinancialProfileSectionStatusValue][]).forEach(([id, status]) => {
        if (status === 'completed' || status === 'opted_out') {
          completed.add(id);
        }
      });
      return { currentIndex: action.currentIndex, statuses, completed };
    }
    case 'SET_INDEX': {
      const nextIndex = Math.max(0, Math.min(action.index, stepsArr.length - 1));
      if (nextIndex === state.currentIndex) return state;
      return { ...state, currentIndex: nextIndex };
    }
    default:
      return state;
  }
}

interface OnboardingProviderProps {
  children: React.ReactNode;
  userId?: number;
  /** Test helper: if true, provider starts with all steps completed */
  testCompleteAll?: boolean;
  /** Test helper: explicit completed step IDs */
  testCompletedSteps?: OnboardingStepId[];
  /** Test helper: skip the automatic hydration side-effect on mount */
  skipAutoHydrate?: boolean;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  userId,
  testCompleteAll,
  testCompletedSteps,
  skipAutoHydrate,
}) => {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const base = createInitialState();
    if (testCompleteAll) {
      stepsArr.forEach((step) => {
        base.statuses[step.id] = 'completed';
      });
      base.completed = new Set(stepsArr.map((s) => s.id));
      base.currentIndex = stepsArr.length - 1;
      return base;
    }
    if (testCompletedSteps && testCompletedSteps.length) {
      testCompletedSteps.forEach((id) => {
        base.statuses[id] = 'completed';
      });
      base.completed = new Set(testCompletedSteps);
      base.currentIndex = stepsArr.length - 1;
      return base;
    }
    return base;
  });

  const devUserId = useDevUserId();
  const resolvedUserId = userId ?? devUserId ?? 1;
  const hydrationSeqRef = useRef(0);
  const isHydratingRef = useRef(false);
  const [hydrated, setHydrated] = React.useState<boolean>(() => Boolean(skipAutoHydrate));

  const hydrate = useCallback(async () => {
    hydrationSeqRef.current += 1;
    const runId = hydrationSeqRef.current;

    isHydratingRef.current = true;
    setHydrated(false);

    try {
      const statusDto = await fetchFinancialProfileSectionStatuses(resolvedUserId);
      console.log('[OnboardingContext] hydrate - fetched statuses from backend:', {
        userId: resolvedUserId,
        count: statusDto.length,
        statuses: statusDto,
        sectionKeys: statusDto.map(s => s.sectionKey),
        reviewStatus: statusDto.find(s => s.sectionKey === 'review')
      });
      if (runId !== hydrationSeqRef.current) return;

      const statuses: StatusMap = createInitialStatuses();
      statusDto.forEach((status) => {
        console.log(`[OnboardingContext] Processing status: ${status.sectionKey} = ${status.status}`);
        statuses[status.sectionKey] = status.status;
      });
      console.log('[OnboardingContext] hydrate - final statuses map:', statuses);

      const nextIndex = stepsArr.findIndex((step) => statuses[step.id] === 'needs_info');
      const targetIndex = nextIndex >= 0 ? nextIndex : stepsArr.length - 1;

      dispatch({ type: 'HYDRATE', currentIndex: targetIndex, statuses });
    } catch (error) {
      if (runId !== hydrationSeqRef.current) return;
      if (import.meta.env?.DEV) {
        console.warn('Failed to hydrate onboarding state', error);
      }
      dispatch({ type: 'RESET' });
    } finally {
      if (runId === hydrationSeqRef.current) {
        isHydratingRef.current = false;
        setHydrated(true);
      }
    }
  }, [resolvedUserId]);

  useEffect(() => {
    if (skipAutoHydrate) {
      return;
    }
    void hydrate();
  }, [hydrate, skipAutoHydrate, resolvedUserId]);

  const goNext = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const goPrev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const goToStep = useCallback((stepId: OnboardingStepId) => {
    const index = stepsArr.findIndex((step) => step.id === stepId);
    if (index >= 0) {
      dispatch({ type: 'SET_INDEX', index });
    }
  }, []);

  const updateStatus = useCallback((id: OnboardingStepId, status: FinancialProfileSectionStatusValue) => {
    if (import.meta.env?.DEV) {
      // Temporary diagnostic logging; remove after verifying sidebar update behavior.
      console.log('[Onboarding] updateStatus', { id, status });
    }
    dispatch({ type: 'SET_STATUS', id, status });
  }, []);

  const markComplete = useCallback((id?: OnboardingStepId) => {
    const target = id ?? stepsArr[state.currentIndex].id;
    updateStatus(target, 'completed');
  }, [state.currentIndex, updateStatus]);

  const reset = useCallback(async () => {
    dispatch({ type: 'RESET' });
    if (!skipAutoHydrate) {
      await hydrate();
    } else {
      setHydrated(true);
    }
  }, [hydrate, skipAutoHydrate]);

  const refresh = useCallback(() => hydrate(), [hydrate]);

  const currentStepDef = stepsArr[state.currentIndex];
  const progressPercent = useMemo(() => (state.completed.size / stepsArr.length) * 100, [state.completed.size]);

  const value: OnboardingContextValue = {
    userId: resolvedUserId,
    steps: stepsArr,
    current: {
      id: currentStepDef.id,
      index: state.currentIndex,
      isFirst: state.currentIndex === 0,
      isLast: state.currentIndex === stepsArr.length - 1,
    },
    completed: state.completed,
    statuses: state.statuses,
    goNext,
    goPrev,
    goToStep,
    markComplete,
    updateStatus,
    reset,
    refresh,
    progressPercent,
    hydrated,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

