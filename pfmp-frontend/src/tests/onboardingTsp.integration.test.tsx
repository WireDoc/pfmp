import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TspProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToCashSection, expectSectionStatus, renderOnboardingPageForTest, clickNextSection, waitForAutosaveComplete } from './utils/onboardingTestHelpers';

describe('TSP onboarding section', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits TSP allocation details and advances to cash accounts', async () => {
    const tspSpy = vi.spyOn(financialProfileApi, 'upsertTspProfile');
    const requests: TspProfilePayload[] = [];
    tspSpy.mockImplementation(async (userId: number, payload: TspProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload as TspProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

  await advanceToCashSection(user, { tsp: 'complete' });
    const initialCallCount = requests.length;

    // The helper lands us on Cash Accounts; navigate back one step to focus on TSP assertions.
    await user.click(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => Boolean(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })));

    fireEvent.change(screen.getByLabelText('Contribution rate (%)'), { target: { value: '12' } });
    // Set per-fund contributions via generic Contribution (%) fields. Order starts with base funds.
    const contribs = screen.getAllByLabelText('Contribution (%)');
    // G,F,C,S,I = 20,10,40,20,10
    const desired = [20, 10, 40, 20, 10];
    desired.forEach((val, idx) => {
      if (contribs[idx]) fireEvent.change(contribs[idx], { target: { value: String(val) } });
    });

  // Autosave should persist after field edits; wait for at least one new request
  await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.contributionRatePercent).toBe(12);
    // Employer match is computed server-side; should be undefined or absent
    // Validate lifecyclePositions have our base funds with contributionPercent set
    const byCode = new Map((latest.lifecyclePositions ?? []).map((p) => [p.fundCode, p] as const));
    expect(byCode.get('G')?.contributionPercent).toBe(20);
    expect(byCode.get('F')?.contributionPercent).toBe(10);
    expect(byCode.get('C')?.contributionPercent).toBe(40);
    expect(byCode.get('S')?.contributionPercent).toBe(20);
    expect(byCode.get('I')?.contributionPercent).toBe(10);

  // Explicitly wait for autosave settle then navigate forward using Next (if currently on TSP).
  await waitForAutosaveComplete(8000);
  // If not already on Cash Accounts, attempt explicit Next navigation.
  if (!screen.queryByRole('heading', { level: 2, name: 'Cash Accounts' })) {
    await clickNextSection(user);
  }
  await waitFor(() => Boolean(screen.getByRole('heading', { level: 2, name: 'Cash Accounts' })));

    expectSectionStatus('TSP Snapshot', 'Completed');
  }, 20000);

  it('allows opting out of TSP with a reason', async () => {
    const tspSpy = vi.spyOn(financialProfileApi, 'upsertTspProfile');
    const requests: TspProfilePayload[] = [];
    tspSpy.mockImplementation(async (userId: number, payload: TspProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload as TspProfilePayload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

  await advanceToCashSection(user, { tsp: 'complete' });
    const initialCallCount = requests.length;

    await user.click(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => Boolean(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })));

  await user.click(screen.getByLabelText('I don’t invest in the Thrift Savings Plan'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'No access to TSP yet' } });

  // Autosave should persist the opt-out without manual submit
  await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest).toMatchObject({
      optOut: {
        isOptedOut: true,
        reason: 'No access to TSP yet',
      },
    });

  // Wait for autosave settle then confirm sidebar status.
  await waitForAutosaveComplete(8000);
  expectSectionStatus('TSP Snapshot', 'Opted Out');
  }, 20000);
});
