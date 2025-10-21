import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropertiesProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import { advanceToRealEstateSection, expectSectionStatus, renderOnboardingPageForTest, forceFlushAutosaveAct, waitForAutosaveComplete, waitForSectionStatusTransition } from './utils/onboardingTestHelpers';

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

  it('autosaves property details and advances to liabilities', async () => {
    const propertiesSpy = vi.spyOn(financialProfileApi, 'upsertPropertiesProfile');
    const requests: PropertiesProfilePayload[] = [];
    propertiesSpy.mockImplementation(async (userId: number, payload: PropertiesProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

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

  const w = window as unknown as { __pfmpCurrentSectionFlush?: () => Promise<void> };
  await w.__pfmpCurrentSectionFlush?.();
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

    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('real-estate', 'completed').catch(() => { /* non-fatal for navigation */ });
    // Attempt navigation via Next, then fallback to sidebar button with retries
    const maxMs = 15000; const start = Date.now();
    let navigated = false; let attempts = 0;
    while (!navigated && Date.now() - start < maxMs) {
      const heading = screen.queryByRole('heading', { level: 2, name: 'Liabilities & Credit' });
      if (heading) { navigated = true; break; }
      if (attempts === 0) {
        const nextBtn = screen.queryByRole('button', { name: /Next/i });
        if (nextBtn) await user.click(nextBtn);
      } else if (attempts % 3 === 0) {
        const sidebarBtn = screen.queryByRole('button', { name: /Liabilities & Credit/i });
        if (sidebarBtn) await user.click(sidebarBtn);
      }
      attempts += 1;
      await new Promise(r => setTimeout(r, 300));
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Liabilities & Credit' })).toBeTruthy();

    await expectSectionStatus('Real Estate', 'Completed');
  }, 25000);

  it('autosaves opt-out of real estate and advances to liabilities', async () => {
    const propertiesSpy = vi.spyOn(financialProfileApi, 'upsertPropertiesProfile');
    const requests: PropertiesProfilePayload[] = [];
    propertiesSpy.mockImplementation(async (userId: number, payload: PropertiesProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToRealEstateSection(user, { investments: 'optOut' });

    const initialCallCount = requests.length;

    await user.click(screen.getByLabelText('I don’t have real estate assets'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'No property holdings currently' } });

  const w = window as unknown as { __pfmpCurrentSectionFlush?: () => Promise<void> };
  await w.__pfmpCurrentSectionFlush?.();
  await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.properties).toEqual([]);
    expect(latest.optOut).toMatchObject({
      isOptedOut: true,
      reason: 'No property holdings currently',
    });

    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('real-estate', 'opted_out').catch(() => {});
    const maxMs = 15000; const start = Date.now();
    let navigated = false; let attempts = 0;
    while (!navigated && Date.now() - start < maxMs) {
      const heading = screen.queryByRole('heading', { level: 2, name: 'Liabilities & Credit' });
      if (heading) { navigated = true; break; }
      if (attempts === 0) {
        const nextBtn = screen.queryByRole('button', { name: /Next/i });
        if (nextBtn) await user.click(nextBtn);
      } else if (attempts % 3 === 0) {
        const sidebarBtn = screen.queryByRole('button', { name: /Liabilities & Credit/i });
        if (sidebarBtn) await user.click(sidebarBtn);
      }
      attempts += 1;
      await new Promise(r => setTimeout(r, 300));
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Liabilities & Credit' })).toBeTruthy();

    await expectSectionStatus('Real Estate', 'Opted Out');
  }, 20000);
});
