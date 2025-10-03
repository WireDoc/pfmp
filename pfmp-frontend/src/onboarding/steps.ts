// Wave 2 Onboarding Step Definitions (Scaffold)
// Each step will later map to a component + validation + completion predicate.

export type OnboardingStepId = 'demographics' | 'risk' | 'tsp' | 'income';

export interface OnboardingStepDef {
  id: OnboardingStepId;
  title: string;
  description: string;
  order: number;
  // future: validation schema reference, feature flag gating, etc.
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: 'demographics', title: 'Demographics', description: 'Basic profile & service info', order: 1 },
  { id: 'risk', title: 'Risk Assessment', description: 'Capture risk tolerance for allocation logic', order: 2 },
  { id: 'tsp', title: 'TSP Allocation', description: 'Thrift Savings Plan current + target allocations', order: 3 },
  { id: 'income', title: 'Income & Benefits', description: 'Income sources, VA disability, pension inputs', order: 4 },
];

export function sortedSteps(): OnboardingStepDef[] {
  return [...ONBOARDING_STEPS].sort((a,b) => a.order - b.order);
}

export function getStep(id: OnboardingStepId): OnboardingStepDef {
  const step = ONBOARDING_STEPS.find(s => s.id === id);
  if (!step) throw new Error(`Unknown onboarding step: ${id}`);
  return step;
}
