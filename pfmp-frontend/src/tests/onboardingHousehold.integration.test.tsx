import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import OnboardingPage from '../views/OnboardingPage';
import type { HouseholdProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';

describe('Household onboarding section', () => {
  let upsertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    upsertSpy = vi.spyOn(financialProfileApi, 'upsertHouseholdProfile');
  });

  afterEach(() => {
    upsertSpy.mockRestore();
  });

  it('submits household data and advances to next section', async () => {
    const requests: HouseholdProfilePayload[] = [];
    upsertSpy.mockImplementation(async (userId, payload) => {
      expect(userId).toBe(1);
      requests.push(payload as HouseholdProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    fireEvent.change(screen.getByLabelText('Preferred name'), { target: { value: 'Alex' } });
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Married'));
    fireEvent.change(screen.getByLabelText('Dependents'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText("Notes we'd share with your planner"), {
      target: { value: 'We just moved to D.C.' },
    });

    await user.click(screen.getByTestId('household-submit'));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      preferredName: 'Alex',
      maritalStatus: 'married',
      dependentCount: 2,
      serviceNotes: "We just moved to D.C.",
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Risk & Goals' })).toBeInTheDocument());

    const householdRow = screen.getByText('Household Profile').closest('li');
    expect(householdRow).not.toBeNull();
    await waitFor(() => expect(within(householdRow as HTMLElement).getByText('Completed')).toBeInTheDocument());
  }, 15000);

  it('allows opting out with a reason', async () => {
    const requests: HouseholdProfilePayload[] = [];
    upsertSpy.mockImplementation(async (userId, payload) => {
      expect(userId).toBe(1);
      requests.push(payload as HouseholdProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    screen.getByLabelText('Preferred name');
    await user.click(screen.getByLabelText('I want to skip this section for now'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Discuss with partner' } });

    await user.click(screen.getByTestId('household-submit'));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      optOut: {
        isOptedOut: true,
        reason: 'Discuss with partner',
      },
    });

    const householdRow = screen.getByText('Household Profile').closest('li');
    expect(householdRow).not.toBeNull();
    await waitFor(() => expect(within(householdRow as HTMLElement).getByText('Opted Out')).toBeInTheDocument());
  }, 15000);
});
