import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import OnboardingPage from '../views/OnboardingPage';
import type { TspProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToCashSection, expectSectionStatus } from './utils/onboardingTestHelpers';

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

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    await advanceToCashSection(user, { tsp: 'complete' });
    const initialCallCount = requests.length;

    // The helper lands us on Cash Accounts; navigate back one step to focus on TSP assertions.
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Contribution rate (%)'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Employer match (%)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Current balance ($)'), { target: { value: '120000' } });
    fireEvent.change(screen.getByLabelText('Target balance ($)'), { target: { value: '500000' } });
    fireEvent.change(screen.getByLabelText('G Fund (%)'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('F Fund (%)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('C Fund (%)'), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('S Fund (%)'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('I Fund (%)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Lifecycle fund (%)'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Lifecycle fund balance ($)'), { target: { value: '15000' } });

    await user.click(screen.getByTestId('tsp-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest).toMatchObject({
      contributionRatePercent: 12,
      employerMatchPercent: 5,
      currentBalance: 120000,
      targetBalance: 500000,
      gFundPercent: 20,
      fFundPercent: 10,
      cFundPercent: 40,
      sFundPercent: 20,
      iFundPercent: 10,
      lifecyclePercent: 0,
      lifecycleBalance: 15000,
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Cash Accounts' })).toBeInTheDocument());

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

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    await advanceToCashSection(user, { tsp: 'complete' });
    const initialCallCount = requests.length;

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' })).toBeInTheDocument());

    await user.click(screen.getByLabelText('I don’t invest in the Thrift Savings Plan'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'No access to TSP yet' } });

    await user.click(screen.getByTestId('tsp-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest).toMatchObject({
      optOut: {
        isOptedOut: true,
        reason: 'No access to TSP yet',
      },
    });

    expectSectionStatus('TSP Snapshot', 'Opted Out');
  }, 20000);
});
