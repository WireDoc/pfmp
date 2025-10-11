import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import OnboardingPage from '../views/OnboardingPage';
import type { PropertiesProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToRealEstateSection, expectSectionStatus } from './utils/onboardingTestHelpers';

describe('Real Estate onboarding section', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTspProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertCashAccountsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertInvestmentAccountsProfile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits property details and advances to insurance', async () => {
    const propertiesSpy = vi.spyOn(financialProfileApi, 'upsertPropertiesProfile');
    const requests: PropertiesProfilePayload[] = [];
    propertiesSpy.mockImplementation(async (userId: number, payload: PropertiesProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    await advanceToRealEstateSection(user, { cash: 'optOut', investments: 'complete' });

    const initialCallCount = requests.length;

    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Seaside rental' } });

    await user.click(screen.getByLabelText('Property type'));
    await user.click(screen.getByRole('option', { name: 'Rental property' }));

    await user.click(screen.getByLabelText('Occupancy'));
    await user.click(screen.getByRole('option', { name: 'Tenant occupied' }));

    fireEvent.change(screen.getByLabelText('Estimated value ($)'), { target: { value: '525000' } });
    fireEvent.change(screen.getByLabelText('Mortgage balance ($)'), { target: { value: '310000' } });
    fireEvent.change(screen.getByLabelText('Monthly mortgage payment ($)'), { target: { value: '2100' } });
    fireEvent.change(screen.getByLabelText('Monthly rental income ($)'), { target: { value: '3200' } });
    fireEvent.change(screen.getByLabelText('Monthly expenses ($)'), { target: { value: '600' } });
    await user.click(screen.getByLabelText('HELOC attached'));

    await user.click(screen.getByTestId('properties-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.optOut).toBeUndefined();
    expect(latest.properties).toHaveLength(1);
    expect(latest.properties[0]).toMatchObject({
      propertyName: 'Seaside rental',
      propertyType: 'rental',
      occupancy: 'rental',
      estimatedValue: 525000,
      mortgageBalance: 310000,
      monthlyMortgagePayment: 2100,
      monthlyRentalIncome: 3200,
      monthlyExpenses: 600,
      hasHeloc: true,
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Insurance Coverage' })).toBeInTheDocument());

    await expectSectionStatus('Real Estate', 'Completed');
  }, 25000);

  it('allows opting out of real estate with a reason', async () => {
    const propertiesSpy = vi.spyOn(financialProfileApi, 'upsertPropertiesProfile');
    const requests: PropertiesProfilePayload[] = [];
    propertiesSpy.mockImplementation(async (userId: number, payload: PropertiesProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    render(
      <OnboardingProvider skipAutoHydrate userId={1}>
        <OnboardingPage />
      </OnboardingProvider>,
    );

    await advanceToRealEstateSection(user, { investments: 'optOut' });

    const initialCallCount = requests.length;

    await user.click(screen.getByLabelText('I don’t have real estate assets'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'No property holdings currently' } });

    await user.click(screen.getByTestId('properties-submit'));

    await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.properties).toEqual([]);
    expect(latest.optOut).toMatchObject({
      isOptedOut: true,
      reason: 'No property holdings currently',
    });

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Insurance Coverage' })).toBeInTheDocument());

    await expectSectionStatus('Real Estate', 'Opted Out');
  }, 20000);
});
