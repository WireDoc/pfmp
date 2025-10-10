import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import OnboardingPage from '../views/OnboardingPage';
import type { RiskGoalsProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';

const advanceToRiskGoals = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByLabelText('I want to skip this section for now'));
  fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Will revisit later' } });
  await user.click(screen.getByTestId('household-submit'));
  await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Risk & Goals' })).toBeInTheDocument());
};

describe('Risk & Goals onboarding section', () => {
  let householdSpy: ReturnType<typeof vi.spyOn>;
  let riskGoalsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    householdSpy = vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    riskGoalsSpy = vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile');
  });

  afterEach(() => {
    householdSpy.mockRestore();
    riskGoalsSpy.mockRestore();
  });

  it('submits risk goals data and advances to the TSP section', async () => {
    const requests: RiskGoalsProfilePayload[] = [];
    riskGoalsSpy.mockImplementation(async (userId, payload) => {
      expect(userId).toBe(1);
      requests.push(payload as RiskGoalsProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    await advanceToRiskGoals(user);

    await user.click(screen.getByLabelText('Risk tolerance'));
    await user.click(screen.getByText('3 · Balanced'));
    fireEvent.change(screen.getByLabelText('Target retirement date'), { target: { value: '2035-01-01' } });
    fireEvent.change(screen.getByLabelText('Passive income goal (monthly)'), { target: { value: '4500' } });
    fireEvent.change(screen.getByLabelText('Liquidity buffer (months)'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Emergency fund target ($)'), { target: { value: '25000' } });

    await user.click(screen.getByTestId('risk-goals-submit'));

    await waitFor(() => expect(requests).toHaveLength(1));
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
    riskGoalsSpy.mockImplementation(async (userId, payload) => {
      expect(userId).toBe(1);
      requests.push(payload as RiskGoalsProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    await advanceToRiskGoals(user);

    await user.click(screen.getByLabelText('I want to skip this section for now'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Need to consult advisor' } });

    await user.click(screen.getByTestId('risk-goals-submit'));

    await waitFor(() => expect(requests).toHaveLength(1));
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
