import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HouseholdProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { renderOnboardingPageForTest, waitForAutosaveComplete, waitForSectionStatusTransition, forceFlushAutosaveAct, robustNavigateToHeading } from './utils/onboardingTestHelpers';

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

    // Submit form explicitly to trigger completion intent (flush wrapper sets intent ref)
    const preferredNameField = screen.getByLabelText('Preferred name');
    const formEl = preferredNameField.closest('form');
    if (!formEl) throw new Error('Household form element not found');
    fireEvent.submit(formEl);
    await waitForAutosaveComplete();
  await waitFor(() => expect(requests.length).toBeGreaterThan(0), { timeout: 4000 });
    const finalRequest = requests[requests.length - 1];
    expect(finalRequest).toMatchObject({
      preferredName: 'Alex',
      maritalStatus: 'married',
      dependentCount: 2,
      serviceNotes: "We just moved to D.C.",
    });

    // Navigate to next section. Use more tolerant label match (Next or Next section).
    // Wait for status promotion before navigating; this validates completion determination.
    await waitForSectionStatusTransition('household', 'completed', 8000);
  const nextBtn = screen.getByRole('button', { name: /Next( section)?/i });
  await user.click(nextBtn);
  // Use robust navigation helper to tolerate timing / sidebar fallback.
  await robustNavigateToHeading('Risk & Goals', /Risk & Goals/i, { timeoutMs: 10000 });
  }, 20000);

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

  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await waitFor(() => expect(requests.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(requests[0]).toMatchObject({
      optOut: {
        isOptedOut: true,
        reason: 'Discuss with partner',
      },
    });

  await waitForSectionStatusTransition('household', 'opted_out');
  }, 15000);
});
