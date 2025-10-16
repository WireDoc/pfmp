import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RiskGoalsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { renderOnboardingPageForTest } from './utils/onboardingTestHelpers';

type HouseholdSpy = MockInstance<typeof financialProfileApi.upsertHouseholdProfile>;
type RiskGoalsSpy = MockInstance<typeof financialProfileApi.upsertRiskGoalsProfile>;

const advanceToRiskGoals = async (
  user: ReturnType<typeof userEvent.setup>,
  householdSpy: HouseholdSpy,
) => {
  await user.click(screen.getByLabelText('I want to skip this section for now'));
  fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Will revisit later' } });
  await waitFor(() => expect(householdSpy).toHaveBeenCalledTimes(1), { timeout: 4000 });
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

  it('submits risk goals data and advances to the TSP section', async () => {
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

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })).toBeInTheDocument());

    const riskRow = screen.getByText('Risk & Goals').closest('li');
    expect(riskRow).not.toBeNull();
    await waitFor(() => expect(within(riskRow as HTMLElement).getByText('Completed')).toBeInTheDocument());
  }, 15000);

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

    const riskRow = screen.getByText('Risk & Goals').closest('li');
    expect(riskRow).not.toBeNull();
    await waitFor(() => expect(within(riskRow as HTMLElement).getByText('Opted Out')).toBeInTheDocument());
  }, 15000);
});
