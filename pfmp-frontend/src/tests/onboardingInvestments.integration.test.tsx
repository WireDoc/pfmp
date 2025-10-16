import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InvestmentAccountsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToInvestmentsSection, expectSectionStatus, renderOnboardingPageForTest } from './utils/onboardingTestHelpers';

describe('Investments onboarding section', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTspProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertCashAccountsProfile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits investment accounts and advances to real estate', async () => {
    const investmentSpy = vi.spyOn(financialProfileApi, 'upsertInvestmentAccountsProfile');
    const requests: InvestmentAccountsProfilePayload[] = [];
    investmentSpy.mockImplementation(async (userId: number, payload: InvestmentAccountsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToInvestmentsSection(user, { tsp: 'complete', cash: 'optOut' });

    const initialCallCount = requests.length;

    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Schwab brokerage' } });
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'Charles Schwab' } });
    fireEvent.change(screen.getByLabelText('Asset class focus'), { target: { value: 'Index funds' } });
    fireEvent.change(screen.getByLabelText('Current balance ($)'), { target: { value: '45000' } });
    fireEvent.change(screen.getByLabelText('Cost basis ($)'), { target: { value: '32000' } });
    fireEvent.change(screen.getByLabelText('Contribution rate (%)'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Last contribution'), { target: { value: '2024-12-15' } });
    await user.click(screen.getByLabelText('Tax-advantaged'));

    await user.click(screen.getByTestId('investments-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.optOut).toBeUndefined();
    expect(latest.accounts).toHaveLength(1);
    expect(latest.accounts[0]).toMatchObject({
      accountName: 'Schwab brokerage',
      accountCategory: 'brokerage',
      institution: 'Charles Schwab',
      assetClass: 'Index funds',
      currentValue: 45000,
      costBasis: 32000,
      contributionRatePercent: 6,
      isTaxAdvantaged: true,
    });
    expect(latest.accounts[0]?.lastContributionDate ?? '').toContain('2024-12-15');

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Real Estate' })).toBeInTheDocument());

    await expectSectionStatus('Investments', 'Completed');
  }, 25000);

  it('allows opting out of investments with a reason', async () => {
    const investmentSpy = vi.spyOn(financialProfileApi, 'upsertInvestmentAccountsProfile');
    const requests: InvestmentAccountsProfilePayload[] = [];
    investmentSpy.mockImplementation(async (userId: number, payload: InvestmentAccountsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToInvestmentsSection(user, { cash: 'optOut' });

    const initialCallCount = requests.length;

    await user.click(screen.getByLabelText('I don’t have non-TSP investment accounts'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'All assets consolidated in TSP' } });

    await user.click(screen.getByTestId('investments-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.accounts).toEqual([]);
    expect(latest.optOut).toMatchObject({
      isOptedOut: true,
      reason: 'All assets consolidated in TSP',
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Real Estate' })).toBeInTheDocument());

    await expectSectionStatus('Investments', 'Opted Out');
  }, 20000);
});
