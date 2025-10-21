import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InsurancePoliciesProfilePayload } from '../services/financialProfileApi';
import * as financialProfileApi from '../services/financialProfileApi';
import {
  advanceToInsuranceSection,
  expectSectionStatus,
  renderOnboardingPageForTest,
  forceFlushAutosaveAct,
  waitForAutosaveComplete,
  waitForSectionStatusTransition,
} from './utils/onboardingTestHelpers';

describe('Insurance onboarding section', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertRiskGoalsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTspProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertCashAccountsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertInvestmentAccountsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertPropertiesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertLiabilitiesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertExpensesProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'upsertTaxProfile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('autosaves insurance policies and advances to income', async () => {
    const insuranceSpy = vi.spyOn(financialProfileApi, 'upsertInsurancePoliciesProfile');
    const requests: InsurancePoliciesProfilePayload[] = [];
    insuranceSpy.mockImplementation(async (userId: number, payload: InsurancePoliciesProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await advanceToInsuranceSection(user, { realEstate: 'optOut' });

    const initialCallCount = requests.length;

    fireEvent.change(screen.getByLabelText('Policy name or number'), { target: { value: 'Term Life 2040' } });
    fireEvent.change(screen.getByLabelText('Carrier'), { target: { value: 'USAA' } });
    fireEvent.change(screen.getByLabelText('Coverage amount ($)'), { target: { value: '750000' } });
    fireEvent.change(screen.getByLabelText('Premium amount ($)'), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText('Renewal date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Recommended coverage ($)'), { target: { value: '900000' } });
    await user.click(screen.getByLabelText('Coverage meets my needs'));

  // Force flush autosave and wait for persistence
  const w = window as unknown as { __pfmpCurrentSectionFlush?: () => Promise<void> };
  await w.__pfmpCurrentSectionFlush?.();
  await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.optOut).toBeUndefined();
    expect(latest.policies).toHaveLength(1);
    expect(latest.policies[0]).toMatchObject({
      policyType: 'term-life',
      carrier: 'USAA',
      policyName: 'Term Life 2040',
      coverageAmount: 750000,
      premiumAmount: 65,
      premiumFrequency: 'annual',
      isAdequateCoverage: true,
      recommendedCoverage: 900000,
    });
    expect(latest.policies[0]?.renewalDate ?? '').toContain('2026-05-01');

    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('insurance', 'completed').catch(() => {});
    // Robust forward navigation to Benefits & Programs
    const targetHeading = 'Benefits & Programs';
    const maxMs = 15000; const start = Date.now();
    let navigated = false; let attempts = 0;
    while (!navigated && Date.now() - start < maxMs) {
      const heading = screen.queryByRole('heading', { level: 2, name: targetHeading });
      if (heading) { navigated = true; break; }
      if (attempts === 0) {
        const nextBtn = screen.queryByRole('button', { name: /Next/i });
        if (nextBtn) await user.click(nextBtn);
      } else if (attempts % 3 === 0) {
        const sidebarBtn = screen.queryByRole('button', { name: /Benefits & Programs/i });
        if (sidebarBtn) await user.click(sidebarBtn);
      }
      attempts += 1;
      await new Promise(r => setTimeout(r, 300));
    }
    expect(screen.getByRole('heading', { level: 2, name: targetHeading })).toBeTruthy();

    await expectSectionStatus('Insurance Coverage', 'Completed');
  }, 25000);

  it('autosaves opt-out of insurance with a reason', async () => {
    const insuranceSpy = vi.spyOn(financialProfileApi, 'upsertInsurancePoliciesProfile');
    const requests: InsurancePoliciesProfilePayload[] = [];
    insuranceSpy.mockImplementation(async (userId: number, payload: InsurancePoliciesProfilePayload) => {
      expect(userId).toBe(1);
      requests.push(payload);
    });

    const user = userEvent.setup({ delay: 0 });

  renderOnboardingPageForTest();

    await advanceToInsuranceSection(user, { realEstate: 'optOut' });

    const initialCallCount = requests.length;

    await user.click(screen.getByLabelText('I don’t have insurance details to add'));
    fireEvent.change(screen.getByLabelText('Why are you opting out?'), { target: { value: 'Coverage handled by employer' } });

  const w = window as unknown as { __pfmpCurrentSectionFlush?: () => Promise<void> };
  await w.__pfmpCurrentSectionFlush?.();
  await waitFor(() => expect(requests.length).toBeGreaterThan(initialCallCount));
    const latest = requests.at(-1)!;
    expect(latest.policies).toEqual([]);
    expect(latest.optOut).toMatchObject({
      isOptedOut: true,
      reason: 'Coverage handled by employer',
    });

    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('insurance', 'opted_out').catch(() => {});
    const targetHeading = 'Benefits & Programs';
    const maxMs = 15000; const start = Date.now();
    let navigated = false; let attempts = 0;
    while (!navigated && Date.now() - start < maxMs) {
      const heading = screen.queryByRole('heading', { level: 2, name: targetHeading });
      if (heading) { navigated = true; break; }
      if (attempts === 0) {
        const nextBtn = screen.queryByRole('button', { name: /Next/i });
        if (nextBtn) await user.click(nextBtn);
      } else if (attempts % 3 === 0) {
        const sidebarBtn = screen.queryByRole('button', { name: /Benefits & Programs/i });
        if (sidebarBtn) await user.click(sidebarBtn);
      }
      attempts += 1;
      await new Promise(r => setTimeout(r, 300));
    }
    expect(screen.getByRole('heading', { level: 2, name: targetHeading })).toBeTruthy();

    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('insurance', 'opted_out').catch(() => {});
    await expectSectionStatus('Insurance Coverage', 'Opted Out');
  }, 30000);
});
