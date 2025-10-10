import type { FinancialProfileSectionKey } from '../services/financialProfileApi';

// Wave 5 Onboarding Step Definitions aligning with backend financial profile sections.

export type OnboardingStepId = FinancialProfileSectionKey;

export interface OnboardingStepDef {
  id: OnboardingStepId;
  title: string;
  description: string;
  order: number;
  highlight?: string;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    id: 'household',
    title: 'Household Profile',
    description: 'Names, family details, and notes so your planner greets you like a private banker.',
    order: 1,
  },
  {
    id: 'risk-goals',
    title: 'Risk & Goals',
    description: 'Retirement timeline, income targets, and emergency fund needs to anchor advice.',
    order: 2,
  },
  {
    id: 'tsp',
    title: 'TSP Snapshot',
    description: 'Capture your Thrift Savings Plan balances, contribution rate, and allocation mix.',
    order: 3,
  },
  {
    id: 'cash',
    title: 'Cash Accounts',
    description: 'List checking and savings accounts so we can optimize yield and liquidity.',
    order: 4,
  },
  {
    id: 'investments',
    title: 'Investments',
    description: 'Brokerage, IRA, and other investment accounts for net worth and allocation insights.',
    order: 5,
  },
  {
    id: 'real-estate',
    title: 'Real Estate',
    description: 'Primary residence and rentals to track equity, cash flow, and leverage.',
    order: 6,
  },
  {
    id: 'insurance',
    title: 'Insurance Coverage',
    description: 'Life, disability, and specialty coverage to surface protection gaps.',
    order: 7,
  },
  {
    id: 'income',
    title: 'Income Streams',
    description: 'Salary, pensions, and rental income to chart monthly cashflow.',
    order: 8,
  },
];

export function sortedSteps(): OnboardingStepDef[] {
  return [...ONBOARDING_STEPS].sort((a, b) => a.order - b.order);
}

export function getStep(id: OnboardingStepId): OnboardingStepDef {
  const step = ONBOARDING_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown onboarding step: ${id}`);
  return step;
}
