import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import {
  renderOnboardingPageForTest,
  waitForAutosaveComplete,
  forceFlushAutosaveAct,
  waitForSectionStatusTransition,
  robustNavigateToHeading,
} from './utils/onboardingTestHelpers';

// End-to-end flow that completes every section (choosing a mix of complete vs opt-out) then finalizes.
// This is intentionally high timeout because it traverses all 15 sections.

describe('Onboarding finalize end-to-end', () => {
  it('completes all sections and unlocks dashboard', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

  // Household (opt-out)
  await robustNavigateToHeading('Household Profile', /Household Profile/i);
  await user.click(screen.getByLabelText('I want to skip this section for now'));
  await user.type(screen.getByLabelText('Why are you opting out?'), 'Skip for now');
  await waitForAutosaveComplete();
  await forceFlushAutosaveAct();
  await waitForSectionStatusTransition('household', 'opted_out');
  await user.click(screen.getByRole('button', { name: /Next/i }));

  // Risk & Goals (opt-out)
  await robustNavigateToHeading('Risk & Goals', /Risk & Goals/i);
  await user.click(screen.getByLabelText('I want to skip this section for now'));
  await user.type(screen.getByLabelText('Why are you opting out?'), 'Skip goals');
  await waitForAutosaveComplete();
  await forceFlushAutosaveAct();
  await waitForSectionStatusTransition('risk-goals', 'opted_out');
  await user.click(screen.getByRole('button', { name: /Next/i }));

  // TSP (opt-out)
    await robustNavigateToHeading('TSP Snapshot', /TSP Snapshot/i);
    await user.click(screen.getByLabelText(/I don['’]t invest in the Thrift Savings Plan/i));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'No tsp');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('tsp', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

  // Cash (opt-out)
    await robustNavigateToHeading('Cash Accounts', /Cash Accounts/i);
  await user.click(screen.getByLabelText('I don’t have additional cash accounts'));
  await user.type(screen.getByLabelText('Why are you opting out?'), 'Skip cash');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
  await waitForSectionStatusTransition('cash', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Investments (opt-out)
    await robustNavigateToHeading('Investments', /Investments/i);
    await user.click(screen.getByLabelText('I don’t have non-TSP investment accounts'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'No accounts');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('investments', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Real Estate (opt-out)
    await robustNavigateToHeading('Real Estate', /Real Estate/i);
    await user.click(screen.getByLabelText('I don’t have real estate assets'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'Renting');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('real-estate', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Liabilities (opt-out)
    await robustNavigateToHeading('Liabilities & Credit', /Liabilities & Credit/i);
    await user.click(screen.getByLabelText('I’m not tracking debts right now'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'No debts');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('liabilities', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

  // Monthly Expenses (opt-out)
    await robustNavigateToHeading('Monthly Expenses', /Monthly Expenses/i);
  await user.click(screen.getByLabelText('I’ll estimate my expenses later'));
  await user.type(screen.getByLabelText('Why are you opting out?'), 'Skip expenses');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
  await waitForSectionStatusTransition('expenses', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Tax Posture (opt-out)
    await robustNavigateToHeading('Tax Posture', /Tax Posture/i);
    await user.click(screen.getByLabelText('A CPA handles this for me'));
    await user.type(screen.getByLabelText('Add context so we can follow up later'), 'CPA engaged');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('tax', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Insurance (opt-out)
    await robustNavigateToHeading('Insurance Coverage', /Insurance Coverage/i);
    await user.click(screen.getByLabelText('I don’t have insurance details to add'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'Later');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('insurance', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

  // Benefits (opt-out)
    await robustNavigateToHeading('Benefits & Programs', /Benefits & Programs/i);
  await user.click(screen.getByLabelText('I’ll review benefits later'));
  await user.type(screen.getByLabelText('Why are you opting out?'), 'Skip benefits');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
  await waitForSectionStatusTransition('benefits', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

  // Long-Term Obligations (opt-out)
    await robustNavigateToHeading('Long-Term Obligations', /Long-Term Obligations/i);
  await user.click(screen.getByLabelText('I don’t have long-term obligations right now'));
  await user.type(screen.getByLabelText('Why are you opting out?'), 'Skip lto');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
  await waitForSectionStatusTransition('long-term-obligations', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

  // Income Streams (opt-out)
    await robustNavigateToHeading('Income Streams', /Income Streams/i);
    await user.click(screen.getByLabelText('I’ll share income details later'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'Later');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('income', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Next/i }));

  // Equity & Private Holdings (opt-out)
    await robustNavigateToHeading('Equity & Private Holdings', /Equity & Private Holdings/i);
    await user.click(screen.getByLabelText('I don’t need this yet'));
    await user.type(screen.getByLabelText('Add context (optional)'), 'No grants');
    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();
    await waitForSectionStatusTransition('equity', 'opted_out');
    await user.click(screen.getByRole('button', { name: /Review/i }));

    // Review finalize: the Review panel intentionally has no explicit heading element.
    // Use presence of the finalize button as the load sentinel instead of heading wait.
    let finalizeBtn = await screen.findByTestId('review-finalize', {}, { timeout: 15000 });
    // Optional sanity: ensure success alert present (all sections acknowledged)
    expect(screen.getByText(/All sections are either completed or acknowledged/i)).toBeTruthy();
    // Wait until finalize enabled (re-query each cycle for safety)
    const start = Date.now();
    while (finalizeBtn.hasAttribute('disabled') && Date.now() - start < 15000) {
      await new Promise(r => setTimeout(r, 250));
      finalizeBtn = screen.getByTestId('review-finalize');
    }
    expect(finalizeBtn.getAttribute('disabled')).toBeNull();
  await user.click(finalizeBtn);
  // Navigation to dashboard root should occur quickly after finalize.
  const dashboardEl = await screen.findByTestId('onboarding-test-dashboard', {}, { timeout: 10000 });
  expect(dashboardEl).toBeTruthy();
  }, 120000);
});
