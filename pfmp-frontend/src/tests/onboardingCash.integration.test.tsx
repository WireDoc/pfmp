import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CashAccountsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToCashSection, expectSectionStatus, renderOnboardingPageForTest, waitForAutosaveComplete, forceFlushAutosaveAct, goNextAndWait } from './utils/onboardingTestHelpers';

describe('Cash Accounts onboarding section', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTspProfile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits cash accounts data and advances to investments', async () => {
    const cashSpy = vi.spyOn(financialProfileApi, 'upsertCashAccountsProfile');
    const requests: CashAccountsProfilePayload[] = [];
    cashSpy.mockImplementation(async (userId: number, payload: CashAccountsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push({ ...payload, accounts: [...(payload.accounts ?? [])] });
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToCashSection(user);

    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Everyday checking' } });
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'Navy Federal' } });
    fireEvent.change(screen.getByLabelText('Account type'), { target: { value: 'checking' } });
    fireEvent.change(screen.getByLabelText('Balance ($)'), { target: { value: '18500' } });
    fireEvent.change(screen.getByLabelText('Interest rate (APR %)'), { target: { value: '0.15' } });
    fireEvent.change(screen.getByLabelText('Rate last checked'), { target: { value: '2025-01-15' } });
    await user.click(screen.getByLabelText('Emergency fund'));

    await user.click(screen.getByRole('button', { name: 'Add another account' }));

    const accountCards = screen.getAllByText(/Account \d/);
    expect(accountCards).toHaveLength(2);

    const secondCard = accountCards[1].closest('div');
    expect(secondCard).not.toBeNull();

    const withinSecond = within(secondCard as HTMLElement);
    fireEvent.change(withinSecond.getByLabelText('Nickname'), { target: { value: 'High-yield savings' } });
    fireEvent.change(withinSecond.getByLabelText('Institution'), { target: { value: 'Ally Bank' } });
    fireEvent.change(withinSecond.getByLabelText('Account type'), { target: { value: 'savings' } });
    fireEvent.change(withinSecond.getByLabelText('Balance ($)'), { target: { value: '32000' } });
    fireEvent.change(withinSecond.getByLabelText('Interest rate (APR %)'), { target: { value: '4.25' } });

    // Force flush in case debounce hasn't fired yet
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    expect(requests.length).toBeGreaterThan(0);
    const payload = requests[requests.length - 1];
    expect(payload.optOut).toBeUndefined();
    expect(payload.accounts).toHaveLength(2);
    expect(payload.accounts[0]).toMatchObject({
      nickname: 'Everyday checking',
      institution: 'Navy Federal',
      accountType: 'checking',
      balance: 18500,
      interestRateApr: 0.15,
      isEmergencyFund: true,
    });
    expect(payload.accounts[0]?.rateLastChecked).toBeDefined();
    expect(payload.accounts[1]).toMatchObject({
      nickname: 'High-yield savings',
      institution: 'Ally Bank',
      accountType: 'savings',
      balance: 32000,
      interestRateApr: 4.25,
      isEmergencyFund: false,
    });

    await goNextAndWait(user, 'Investments');

    expectSectionStatus('Cash Accounts', 'Completed');
  }, 25000);

  it('allows opting out of the cash section', async () => {
    const cashSpy = vi.spyOn(financialProfileApi, 'upsertCashAccountsProfile');
    const requests: CashAccountsProfilePayload[] = [];
    cashSpy.mockImplementation(async (userId: number, payload: CashAccountsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push({ ...payload, accounts: [...(payload.accounts ?? [])] });
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToCashSection(user);

    await user.click(screen.getByLabelText('I don’t have additional cash accounts'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Using joint account only' } });

    // Force flush for opt-out path
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
  expect(requests.length).toBeGreaterThan(0);
  const latestOptOut = requests[requests.length - 1];
  expect(latestOptOut).toMatchObject({
      accounts: [],
      optOut: {
        isOptedOut: true,
        reason: 'Using joint account only',
      },
    });
    await goNextAndWait(user, 'Investments');

    expectSectionStatus('Cash Accounts', 'Opted Out');
  }, 20000);
});
