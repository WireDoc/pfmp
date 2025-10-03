import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { sortedSteps, type OnboardingStepId } from './steps';

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
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const stepsArr = sortedSteps();

const initialState: OnboardingState = {
  currentIndex: 0,
  completed: new Set<OnboardingStepId>(),
};

type Action =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'MARK_COMPLETE'; id: OnboardingStepId }
  | { type: 'RESET' };

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
      return initialState;
    default:
      return state;
  }
}

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const goNext = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const goPrev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const markComplete = useCallback((id?: OnboardingStepId) => {
    const target = id ?? stepsArr[state.currentIndex].id;
    dispatch({ type: 'MARK_COMPLETE', id: target });
  }, [state.currentIndex]);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const currentStepDef = stepsArr[state.currentIndex];
  const progressPercent = useMemo(() => {
    return (state.completed.size / stepsArr.length) * 100;
  }, [state.completed.size]);

  const value: OnboardingContextValue = {
    steps: stepsArr,
    current: { id: currentStepDef.id, index: state.currentIndex, isFirst: state.currentIndex === 0, isLast: state.currentIndex === stepsArr.length - 1 },
    completed: state.completed,
    goNext,
    goPrev,
    markComplete,
    reset,
    progressPercent,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
