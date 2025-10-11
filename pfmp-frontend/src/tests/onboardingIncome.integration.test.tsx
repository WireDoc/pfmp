import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import OnboardingPage from '../views/OnboardingPage';
import type { IncomeStreamsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToIncomeSection, expectSectionStatus } from './utils/onboardingTestHelpers';

describe('Income onboarding section', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTspProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertCashAccountsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertInvestmentAccountsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertPropertiesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertLiabilitiesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertExpensesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTaxProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertInsurancePoliciesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertBenefitsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertLongTermObligationsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertEquityInterest').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits income streams and shows dashboard CTA', async () => {
    const incomeSpy = vi.spyOn(financialProfileApi, 'upsertIncomeStreamsProfile');
    const requests: IncomeStreamsProfilePayload[] = [];
    incomeSpy.mockImplementation(async (userId: number, payload: IncomeStreamsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <OnboardingProvider skipAutoHydrate userId={1}>
          <OnboardingPage />
        </OnboardingProvider>
      </MemoryRouter>,
    );

    await advanceToIncomeSection(user, { realEstate: 'optOut', insurance: 'complete' });

    const initialCallCount = requests.length;

    fireEvent.change(screen.getByLabelText('Income source'), { target: { value: 'GS-14 Salary' } });
    await user.click(screen.getByLabelText('Income type'));
    await user.click(screen.getByRole('option', { name: 'Salary / wages' }));
    fireEvent.change(screen.getByLabelText('Monthly amount ($)'), { target: { value: '9800' } });
    fireEvent.change(screen.getByLabelText('Annual amount ($)'), { target: { value: '117600' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2018-04-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '' } });
    await user.click(screen.getByLabelText('Guaranteed income'));
    await user.click(screen.getByLabelText('Active'));

    await user.click(screen.getByTestId('income-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.optOut).toBeUndefined();
    expect(latest.streams).toHaveLength(1);
    expect(latest.streams[0]).toMatchObject({
      name: 'GS-14 Salary',
      incomeType: 'salary',
      monthlyAmount: 9800,
      annualAmount: 117600,
      isGuaranteed: true,
      isActive: false,
    });
    expect(latest.streams[0]?.startDate ?? '').toContain('2018-04-01');

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Equity & Private Holdings' })).toBeInTheDocument());

    await user.click(screen.getByLabelText('I don’t need this yet'));
    fireEvent.change(screen.getByLabelText('Add context (optional)'), { target: { value: 'Income covered in payroll; no equity yet.' } });
    await user.click(screen.getByTestId('equity-submit'));

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Review & Finalize' })).toBeInTheDocument());
    const finalizeButton = screen.getByTestId('review-finalize');
    expect(finalizeButton).toBeEnabled();

    await expectSectionStatus('Income Streams', 'Completed');
    await expectSectionStatus('Equity & Private Holdings', 'Opted Out');
    await expectSectionStatus('Review & Finalize', 'Needs Info');
  }, 45000);

  it('allows opting out of income with a reason', async () => {
    const incomeSpy = vi.spyOn(financialProfileApi, 'upsertIncomeStreamsProfile');
    const requests: IncomeStreamsProfilePayload[] = [];
    incomeSpy.mockImplementation(async (userId: number, payload: IncomeStreamsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <OnboardingProvider skipAutoHydrate userId={1}>
          <OnboardingPage />
        </OnboardingProvider>
      </MemoryRouter>,
    );

    await advanceToIncomeSection(user, { realEstate: 'optOut', insurance: 'optOut' });

    const initialCallCount = requests.length;

    await user.click(screen.getByLabelText('I’ll share income details later'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Income handled in payroll system' } });

    await user.click(screen.getByTestId('income-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.streams).toEqual([]);
    expect(latest.optOut).toMatchObject({
      isOptedOut: true,
      reason: 'Income handled in payroll system',
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Equity & Private Holdings' })).toBeInTheDocument());

    await user.click(screen.getByLabelText('I don’t need this yet'));
    fireEvent.change(screen.getByLabelText('Add context (optional)'), { target: { value: 'Income only for now' } });
    await user.click(screen.getByTestId('equity-submit'));

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Review & Finalize' })).toBeInTheDocument());
    const finalizeButton = screen.getByTestId('review-finalize');
    expect(finalizeButton).toBeEnabled();

    await expectSectionStatus('Income Streams', 'Opted Out');
    await expectSectionStatus('Equity & Private Holdings', 'Opted Out');
    await expectSectionStatus('Review & Finalize', 'Needs Info');
  }, 45000);
});
