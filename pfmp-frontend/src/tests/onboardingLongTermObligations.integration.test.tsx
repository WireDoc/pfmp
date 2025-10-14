import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LongTermObligationsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import {
  advanceToLongTermObligationsSection,
  expectSectionStatus,
  renderOnboardingPageForTest,
} from './utils/onboardingTestHelpers';

describe('Long-Term Obligations onboarding section', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits obligations and advances to income', async () => {
    const obligationsSpy = vi.spyOn(financialProfileApi, 'upsertLongTermObligationsProfile');
    const requests: LongTermObligationsProfilePayload[] = [];
    obligationsSpy.mockImplementation(async (userId: number, payload: LongTermObligationsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

  await advanceToLongTermObligationsSection(user);

    const initialCallCount = requests.length;

    fireEvent.change(screen.getByLabelText('Obligation name'), { target: { value: 'Home renovation' } });
  await user.click(screen.getByLabelText('Category'));
  await user.click(screen.getByRole('option', { name: 'Housing / relocation' }));
    fireEvent.change(screen.getByLabelText('Target date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Estimated cost ($)'), { target: { value: '32000' } });
    fireEvent.change(screen.getByLabelText('Funds allocated ($)'), { target: { value: '8000' } });
  await user.click(screen.getByLabelText('Funding status'));
  await user.click(screen.getByRole('option', { name: 'Saving in progress' }));
    await user.click(screen.getByLabelText('Critical milestone'));
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Targeting kitchen + HVAC updates.' } });

    await user.click(screen.getByTestId('long-term-obligations-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.optOut).toBeUndefined();
    expect(latest.obligations).toHaveLength(1);
    expect(latest.obligations[0]).toMatchObject({
      obligationName: 'Home renovation',
      obligationType: 'housing',
      estimatedCost: 32000,
      fundsAllocated: 8000,
      fundingStatus: 'saving',
      isCritical: true,
      notes: 'Targeting kitchen + HVAC updates.',
    });
    expect(latest.obligations[0]?.targetDate ?? '').toContain('2026-09-01');

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Income Streams' })).toBeInTheDocument());

    await expectSectionStatus('Long-Term Obligations', 'Completed');
  }, 30000);

  it('allows opting out with a reason', async () => {
    const obligationsSpy = vi.spyOn(financialProfileApi, 'upsertLongTermObligationsProfile');
    const requests: LongTermObligationsProfilePayload[] = [];
    obligationsSpy.mockImplementation(async (userId: number, payload: LongTermObligationsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

  await advanceToLongTermObligationsSection(user);

    const initialCallCount = requests.length;

  await user.click(screen.getByLabelText('I don’t have long-term obligations right now'));
  const optOutReason = await screen.findByLabelText('Why are you opting out?');
  fireEvent.change(optOutReason, { target: { value: 'All major milestones are already funded.' } });

    await user.click(screen.getByTestId('long-term-obligations-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.obligations).toEqual([]);
    expect(latest.optOut).toMatchObject({
      isOptedOut: true,
      reason: 'All major milestones are already funded.',
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Income Streams' })).toBeInTheDocument());

    await expectSectionStatus('Long-Term Obligations', 'Opted Out');
  }, 35000);
});
