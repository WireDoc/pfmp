import type { ComponentType, ReactNode } from 'react';
import HouseholdSectionForm from './sections/HouseholdSectionForm';
import RiskGoalsSectionForm from './sections/RiskGoalsSectionForm';
import TspSectionForm from './sections/TspSectionForm';
import CashAccountsSectionForm from './sections/CashAccountsSectionForm';
import InvestmentAccountsSectionForm from './sections/InvestmentAccountsSectionForm';
import PropertiesSectionForm from './sections/PropertiesSectionForm';
import LiabilitiesSectionForm from './sections/LiabilitiesSectionForm';
import ExpensesSectionForm from './sections/ExpensesSectionForm';
import TaxPostureSectionForm from './sections/TaxPostureSectionForm';
import InsuranceSectionForm from './sections/InsuranceSectionForm';
import BenefitsSectionForm from './sections/BenefitsSectionForm';
import LongTermObligationsSectionForm from './sections/LongTermObligationsSectionForm';
import IncomeSectionForm from './sections/IncomeSectionForm';
import EquityPlaceholderPanel from './sections/EquityPlaceholderPanel';
import ReviewSectionPanel from './sections/ReviewSectionPanel';
import type { ReviewSectionPanelProps } from './sections/ReviewSectionPanel';
import type { FinancialProfileSectionStatusValue } from '../services/financialProfileApi';
import { getStep, sortedSteps, type OnboardingStepDef, type OnboardingStepId } from './steps';

export interface StepRendererContext {
  userId: number;
  currentStatus: FinancialProfileSectionStatusValue;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  statuses: Record<OnboardingStepId, FinancialProfileSectionStatusValue>;
  steps: OnboardingStepRegistryEntry[];
  canFinalize: boolean;
  reviewStatus: FinancialProfileSectionStatusValue;
  onFinalize: () => void;
}

type StepRenderer = (context: StepRendererContext) => ReactNode;

interface SectionComponentProps {
  userId: number;
  currentStatus: FinancialProfileSectionStatusValue;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
}

type SectionComponent = ComponentType<SectionComponentProps>;

interface StepMeta {
  component?: SectionComponent;
  render?: StepRenderer;
  kind?: 'form' | 'review' | 'placeholder';
  apiRoute?: string;
  supportsOptOut?: boolean;
  autoSave?: boolean;
  analyticsId?: string;
  highlight?: string;
  placeholderCopy?: string;
}

export interface OnboardingStepRegistryEntry extends OnboardingStepDef {
  id: OnboardingStepId;
  kind: 'form' | 'review' | 'placeholder';
  render: StepRenderer;
  apiRoute?: string;
  supportsOptOut: boolean;
  autoSave: boolean;
  analyticsId: string;
}

const makeFormRenderer = (Component: SectionComponent): StepRenderer => (ctx) => (
  <Component userId={ctx.userId} currentStatus={ctx.currentStatus} onStatusChange={ctx.onStatusChange} />
);

const makePlaceholderRenderer = (copy: string): StepRenderer => () => (
  <div
    style={{
      padding: '24px 20px',
      borderRadius: 12,
      border: '1px dashed #b0bec5',
      background: '#fafcff',
      color: '#607d8b',
      fontSize: 15,
      lineHeight: 1.6,
    }}
  >
    {copy}
  </div>
);

const reviewRenderer = (ctx: StepRendererContext) => {
  const panelProps: ReviewSectionPanelProps = {
    steps: ctx.steps.filter((step) => step.id !== 'review'),
    statuses: ctx.statuses,
    canFinalize: ctx.canFinalize,
    reviewStatus: ctx.reviewStatus,
    onFinalize: ctx.onFinalize,
  };
  return <ReviewSectionPanel {...panelProps} />;
};

const stepMeta: Partial<Record<OnboardingStepId, StepMeta>> = {
  household: {
    component: HouseholdSectionForm,
    apiRoute: '/financial-profile/:userId/household',
    supportsOptOut: true,
    analyticsId: 'onboarding.household',
  },
  'risk-goals': {
    component: RiskGoalsSectionForm,
    apiRoute: '/financial-profile/:userId/risk-goals',
    supportsOptOut: true,
    analyticsId: 'onboarding.risk_goals',
  },
  tsp: {
    component: TspSectionForm,
    apiRoute: '/financial-profile/:userId/tsp',
    supportsOptOut: true,
    analyticsId: 'onboarding.tsp',
  },
  cash: {
    component: CashAccountsSectionForm,
    apiRoute: '/financial-profile/:userId/cash',
    supportsOptOut: true,
    analyticsId: 'onboarding.cash_accounts',
  },
  investments: {
    component: InvestmentAccountsSectionForm,
    apiRoute: '/financial-profile/:userId/investments',
    supportsOptOut: true,
    analyticsId: 'onboarding.investments',
  },
  'real-estate': {
    component: PropertiesSectionForm,
    apiRoute: '/financial-profile/:userId/real-estate',
    supportsOptOut: true,
    analyticsId: 'onboarding.real_estate',
  },
  liabilities: {
    component: LiabilitiesSectionForm,
    apiRoute: '/financial-profile/:userId/liabilities',
    supportsOptOut: true,
    analyticsId: 'onboarding.liabilities',
  },
  expenses: {
    component: ExpensesSectionForm,
    apiRoute: '/financial-profile/:userId/expenses',
    supportsOptOut: true,
    analyticsId: 'onboarding.expenses',
  },
  tax: {
    component: TaxPostureSectionForm,
    apiRoute: '/financial-profile/:userId/tax',
    supportsOptOut: true,
    analyticsId: 'onboarding.tax_posture',
  },
  insurance: {
    component: InsuranceSectionForm,
    apiRoute: '/financial-profile/:userId/insurance',
    supportsOptOut: true,
    analyticsId: 'onboarding.insurance',
  },
  benefits: {
    component: BenefitsSectionForm,
    apiRoute: '/financial-profile/:userId/benefits',
    supportsOptOut: true,
    analyticsId: 'onboarding.benefits',
  },
  'long-term-obligations': {
    component: LongTermObligationsSectionForm,
    apiRoute: '/financial-profile/:userId/long-term-obligations',
    supportsOptOut: true,
    analyticsId: 'onboarding.long_term_obligations',
  },
  income: {
    component: IncomeSectionForm,
    apiRoute: '/financial-profile/:userId/income',
    supportsOptOut: true,
    analyticsId: 'onboarding.income',
  },
  equity: {
    component: EquityPlaceholderPanel,
    kind: 'placeholder',
    apiRoute: '/financial-profile/:userId/equity',
    supportsOptOut: true,
    analyticsId: 'onboarding.equity',
  },
  review: {
    kind: 'review',
    render: reviewRenderer,
    supportsOptOut: false,
    analyticsId: 'onboarding.review',
  },
};

export function resolveStepConfig(stepId: OnboardingStepId): OnboardingStepRegistryEntry {
  const base = getStep(stepId);
  const meta = stepMeta[stepId] ?? {};
  const kind: 'form' | 'review' | 'placeholder' = meta.kind ?? (meta.component ? 'form' : 'placeholder');
  const render: StepRenderer = meta.render ?? (meta.component ? makeFormRenderer(meta.component) : makePlaceholderRenderer(meta.placeholderCopy ?? 'We’re building this section’s guided form next. In the meantime, please continue with the sections above.'));

  return {
    ...base,
    id: stepId,
    kind,
    render,
    apiRoute: meta.apiRoute,
    supportsOptOut: meta.supportsOptOut ?? (kind !== 'review'),
    autoSave: meta.autoSave ?? false,
    analyticsId: meta.analyticsId ?? `onboarding.${stepId}`,
    highlight: meta.highlight ?? base.highlight,
  };
}

export function getOrderedStepConfigs(): OnboardingStepRegistryEntry[] {
  return sortedSteps().map((step) => resolveStepConfig(step.id));
}
