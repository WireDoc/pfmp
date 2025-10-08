import { useContext } from 'react'
import { OnboardingContext } from './OnboardingContext.shared'
import type { OnboardingContextValue } from './OnboardingContext.shared'

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
