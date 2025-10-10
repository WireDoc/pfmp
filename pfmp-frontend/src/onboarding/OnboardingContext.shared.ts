import { createContext } from 'react';
import type { FinancialProfileSectionStatusValue } from '../services/financialProfileApi';
import type { OnboardingStepDef, OnboardingStepId } from './steps';

export interface OnboardingContextValue {
  userId: number;
  steps: OnboardingStepDef[];
  current: { id: OnboardingStepId; index: number; isLast: boolean; isFirst: boolean };
  completed: Set<OnboardingStepId>;
  statuses: Record<OnboardingStepId, FinancialProfileSectionStatusValue>;
  goNext: () => void;
  goPrev: () => void;
  markComplete: (id?: OnboardingStepId) => void;
  updateStatus: (id: OnboardingStepId, status: FinancialProfileSectionStatusValue) => void;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
  progressPercent: number;
  hydrated: boolean;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);
