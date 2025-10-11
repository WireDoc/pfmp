import type { FinancialProfileSectionKey } from '../services/financialProfileApi';

// Wave 5 Onboarding Step Definitions aligning with backend financial profile sections plus local review phase.

export type OnboardingStepId = FinancialProfileSectionKey | 'review';

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
    id: 'liabilities',
    title: 'Liabilities & Credit',
    description: 'Mortgages, loans, and revolving debts so we can surface payoff priorities.',
    order: 7,
  },
  {
    id: 'expenses',
    title: 'Monthly Expenses',
    description: 'Map out core living expenses and estimates to understand cash burn.',
    order: 8,
  },
  {
    id: 'tax',
    title: 'Tax Posture',
    description: 'Filing status, withholding, and expectations to tune cashflow recommendations.',
    order: 9,
  },
  {
    id: 'insurance',
    title: 'Insurance Coverage',
    description: 'Life, disability, and specialty coverage to surface protection gaps.',
    order: 10,
  },
  {
    id: 'benefits',
    title: 'Benefits & Programs',
    description: 'Capture employer and federal benefits so we can highlight unused perks.',
    order: 11,
  },
  {
    id: 'long-term-obligations',
    title: 'Long-Term Obligations',
    description: 'Major future purchases and milestones so we can track funding progress.',
    order: 12,
  },
  {
    id: 'income',
    title: 'Income Streams',
    description: 'Salary, VA disability, pensions, and side hustles to chart monthly cashflow.',
    order: 13,
  },
  {
    id: 'equity',
    title: 'Equity & Private Holdings',
    description: 'RSUs, stock options, and private equity support (coming soon) so we can prep guidance.',
    order: 14,
  },
  {
    id: 'review',
    title: 'Review & Finalize',
    description: 'Double-check each section, acknowledge opt-outs, and unlock your dashboard.',
    order: 15,
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
