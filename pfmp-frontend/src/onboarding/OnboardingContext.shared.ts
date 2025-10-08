import { createContext } from 'react'
import type { OnboardingStepDef, OnboardingStepId } from './steps'

export interface OnboardingContextValue {
  steps: OnboardingStepDef[]
  current: { id: OnboardingStepId; index: number; isLast: boolean; isFirst: boolean }
  completed: Set<OnboardingStepId>
  goNext: () => void
  goPrev: () => void
  markComplete: (id?: OnboardingStepId) => void
  reset: () => Promise<void>
  refresh: () => Promise<void>
  progressPercent: number
  hydrated: boolean
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null)
