import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HouseholdProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { renderOnboardingPageForTest } from './utils/onboardingTestHelpers';

describe('Household onboarding section', () => {
  let upsertSpy: MockInstance<typeof financialProfileApi.upsertHouseholdProfile>;

  beforeEach(() => {
    upsertSpy = vi.spyOn(financialProfileApi, 'upsertHouseholdProfile');
  });

  afterEach(() => {
    upsertSpy.mockRestore();
  });

  it('submits household data and advances to next section', async () => {
    const requests: HouseholdProfilePayload[] = [];
    upsertSpy.mockImplementation(async (userId: number, payload: HouseholdProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload as HouseholdProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    fireEvent.change(screen.getByLabelText('Preferred name'), { target: { value: 'Alex' } });
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Married'));
    fireEvent.change(screen.getByLabelText('Dependents'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText("Notes we'd share with your planner"), {
      target: { value: 'We just moved to D.C.' },
    });

    await waitFor(() => expect(requests.length).toBeGreaterThan(0), { timeout: 4000 });
    const autosaveCalls = requests.length;

    await user.click(screen.getByRole('button', { name: /save now/i }));

    await waitFor(() => expect(requests.length).toBeGreaterThan(autosaveCalls), { timeout: 4000 });
    const finalRequest = requests[requests.length - 1];
    expect(finalRequest).toMatchObject({
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
  upsertSpy.mockImplementation(async (userId: number, payload: HouseholdProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload as HouseholdProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    screen.getByLabelText('Preferred name');
    await user.click(screen.getByLabelText('I want to skip this section for now'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Discuss with partner' } });

    await waitFor(() => expect(requests).toHaveLength(1), { timeout: 4000 });
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
