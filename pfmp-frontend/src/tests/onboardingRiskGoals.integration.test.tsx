import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RiskGoalsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { renderOnboardingPageForTest } from './utils/onboardingTestHelpers';
import { clickNextSection, waitForAutosaveComplete } from './utils/onboardingTestHelpers';

type HouseholdSpy = MockInstance<typeof financialProfileApi.upsertHouseholdProfile>;
type RiskGoalsSpy = MockInstance<typeof financialProfileApi.upsertRiskGoalsProfile>;

// Advance from Household (opted out) to Risk & Goals with explicit navigation.
const advanceToRiskGoals = async (
  user: ReturnType<typeof userEvent.setup>,
  householdSpy: HouseholdSpy,
) => {
  await user.click(screen.getByLabelText('I want to skip this section for now'));
  fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Will revisit later' } });
  await waitFor(() => expect(householdSpy).toHaveBeenCalledTimes(1), { timeout: 4000 });
  // Ensure autosave cycle settles before navigating so sidebar status updates deterministically.
  await waitForAutosaveComplete(8000);
  await clickNextSection(user);
  await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Risk & Goals' })).toBeInTheDocument());
};

describe('Risk & Goals onboarding section', () => {
  let householdSpy: HouseholdSpy;
  let riskGoalsSpy: RiskGoalsSpy;

  beforeEach(() => {
    householdSpy = vi.spyOn(financialProfileApi, 'upsertHouseholdProfile');
    householdSpy.mockResolvedValue(undefined);
    riskGoalsSpy = vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile');
  });

  afterEach(() => {
    householdSpy.mockRestore();
    riskGoalsSpy.mockRestore();
  });

  it.skip('submits risk goals data and advances to the TSP section', async () => {
    const requests: RiskGoalsProfilePayload[] = [];
    riskGoalsSpy.mockImplementation(async (userId: number, payload: RiskGoalsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToRiskGoals(user, householdSpy);

    await user.click(screen.getByLabelText('Risk tolerance'));
    await user.click(screen.getByText('3 · Balanced'));
    fireEvent.change(screen.getByLabelText('Target retirement date'), { target: { value: '2035-01-01' } });
    fireEvent.change(screen.getByLabelText('Passive income goal (monthly)'), { target: { value: '4500' } });
    fireEvent.change(screen.getByLabelText('Liquidity buffer (months)'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Emergency fund target ($)'), { target: { value: '25000' } });

    await waitFor(() => expect(requests).toHaveLength(1), { timeout: 4000 });
    const payload = requests[0];
    expect(payload).toMatchObject({
      riskTolerance: 3,
      passiveIncomeGoal: 4500,
      liquidityBufferMonths: 9,
      emergencyFundTarget: 25000,
    });
    expect(payload.targetRetirementDate).toBe(new Date('2035-01-01').toISOString());
    // Wait for autosave flush to promote status before moving forward manually.
    await waitForAutosaveComplete(8000);
    await clickNextSection(user);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })).toBeInTheDocument());

    const riskRow = screen.getAllByText('Risk & Goals')
      .map((node) => node.closest('li'))
      .find((li): li is HTMLLIElement => Boolean(li));
    expect(riskRow).not.toBeNull();
    await waitFor(() => expect(within(riskRow as HTMLElement).getByText('Completed')).toBeInTheDocument(), { timeout: 10000 });
  }, 20000);

  it.skip('persists liquidity buffer months and retains value on re-navigation', async () => {
    const requests: RiskGoalsProfilePayload[] = [];
    riskGoalsSpy.mockImplementation(async (userId: number, payload: RiskGoalsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });
    // Spy on fetch to simulate returning the last persisted payload when section is revisited.
    const fetchSpy = vi.spyOn(financialProfileApi, 'fetchRiskGoalsProfile');
    let lastPersisted: RiskGoalsProfilePayload | undefined;
    riskGoalsSpy.mockImplementation(async (userId: number, payload: RiskGoalsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
      lastPersisted = payload; // capture sanitized payload
    });
    fetchSpy.mockImplementation(async (userId: number) => {
      expect(userId).toBe(1);
      // First mount (before any save) returns an empty profile
      if (!lastPersisted) {
        return {} as RiskGoalsProfilePayload;
      }
      // Subsequent hydration returns the last persisted payload
      return lastPersisted;
    });

  const user = userEvent.setup({ delay: 0 });
  // Allow provider to hydrate after save so re-navigation loads persisted values
  renderOnboardingPageForTest({});
    await advanceToRiskGoals(user, householdSpy);

    // Populate form fields including liquidity buffer months
    await user.click(screen.getByLabelText('Risk tolerance'));
    await user.click(screen.getByText('3 · Balanced'));
    fireEvent.change(screen.getByLabelText('Target retirement date'), { target: { value: '2033-06-01' } });
    fireEvent.change(screen.getByLabelText('Passive income goal (monthly)'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('Liquidity buffer (months)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Emergency fund target ($)'), { target: { value: '18000' } });

    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(1), { timeout: 5000 });
    const lastPayload = requests[requests.length - 1];
    expect(lastPayload).toMatchObject({
      riskTolerance: 3,
      passiveIncomeGoal: 3000,
      liquidityBufferMonths: 8,
      emergencyFundTarget: 18000,
    });
    expect(lastPayload.targetRetirementDate).toBe(new Date('2033-06-01').toISOString());

    // Ensure sidebar status chip transitions to Completed
    const riskRow = screen.getAllByText('Risk & Goals')
      .map((node) => node.closest('li'))
      .find((li): li is HTMLLIElement => Boolean(li));
    expect(riskRow).not.toBeNull();
    await waitFor(() => expect(within(riskRow as HTMLElement).getByText(/Completed/i)).toBeInTheDocument(), { timeout: 10000 });

    // Navigate forward then back and verify liquidity buffer retained.
  // Advance to TSP snapshot via explicit Next navigation now that auto-advance is removed.
  await waitForAutosaveComplete(8000);
  await clickNextSection(user);
  await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })).toBeInTheDocument(), { timeout: 8000 });
    const riskBtn = screen.getByRole('button', { name: /Risk & Goals/i });
    await user.click(riskBtn);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Risk & Goals' })).toBeInTheDocument(), { timeout: 8000 });
    // Wait for field to reflect saved value (hydration may be async)
    await waitFor(() => {
      const liquidityField = screen.getByLabelText('Liquidity buffer (months)') as HTMLInputElement;
      expect(liquidityField.value).toBe('8');
    }, { timeout: 6000 });
  }, 25000);

  it('allows opting out of the risk goals section', async () => {
    const requests: RiskGoalsProfilePayload[] = [];
    riskGoalsSpy.mockImplementation(async (userId: number, payload: RiskGoalsProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToRiskGoals(user, householdSpy);

    await user.click(screen.getByLabelText('I want to skip this section for now'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Need to consult advisor' } });

    await waitFor(() => expect(requests).toHaveLength(1), { timeout: 4000 });
    expect(requests[0]).toMatchObject({
      optOut: {
        isOptedOut: true,
        reason: 'Need to consult advisor',
      },
    });

    const riskRow = screen.getAllByText('Risk & Goals')
      .map((node) => node.closest('li'))
      .find((li): li is HTMLLIElement => Boolean(li));
    expect(riskRow).not.toBeNull();
    await waitFor(() => expect(within(riskRow as HTMLElement).getByText('Opted Out')).toBeInTheDocument());
  }, 15000);
});
