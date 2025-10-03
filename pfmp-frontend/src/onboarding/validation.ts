// Wave 2 Validation Scaffold (placeholders)
// Future Wave 3 will integrate real schemas (likely zod or custom lightweight validators)
// Each step exposes: shape (fields), validate(data) returning { valid, issues[] }

import type { OnboardingStepId } from './steps';

export interface ValidationIssue { field: string; message: string; }
export interface StepValidationResult { valid: boolean; issues: ValidationIssue[]; }

export interface StepValidator {
  id: OnboardingStepId;
  validate: (data: unknown) => StepValidationResult;
  // potential future: getInitial(dataSource), persist(partial)
}

// Simple noop validators for now
function makeNoopValidator(id: OnboardingStepId): StepValidator {
  return {
    id,
    validate: () => ({ valid: true, issues: [] })
  };
}

export const STEP_VALIDATORS: Record<OnboardingStepId, StepValidator> = {
  demographics: makeNoopValidator('demographics'),
  risk: makeNoopValidator('risk'),
  tsp: makeNoopValidator('tsp'),
  income: makeNoopValidator('income'),
};

export function validateStep(id: OnboardingStepId, data: unknown): StepValidationResult {
  return STEP_VALIDATORS[id].validate(data);
}
