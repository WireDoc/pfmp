import { describe, it, beforeEach, vi, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderOnboardingPageForTest, robustNavigateToHeading, forceFlushAutosaveAct, waitForAutosaveComplete, waitForSectionStatusTransition } from './utils/onboardingTestHelpers';
import * as financialProfileApi from '../services/financialProfileApi';

/** Autosave integration tests for Income Streams section (updated) */

describe('Income onboarding section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(financialProfileApi, 'upsertIncomeStreamsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'fetchIncomeStreamsProfile').mockResolvedValue({ streams: [] });
  });

  it('autosaves income stream entry', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    await robustNavigateToHeading('Long-Term Obligations', /Long-Term Obligations/i, { timeoutMs: 15000 });
    const incomeBtn = await screen.findByRole('button', { name: /Income Streams/i });
    await user.click(incomeBtn);
    await robustNavigateToHeading('Income Streams', /Income Streams/i, { timeoutMs: 15000 });

    await user.type(screen.getByLabelText('Income source'), 'GS-14 salary');
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('income', 'completed');
  });

  it('autosaves income opt-out with reason', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    await robustNavigateToHeading('Long-Term Obligations', /Long-Term Obligations/i, { timeoutMs: 15000 });
    const incomeBtn = await screen.findByRole('button', { name: /Income Streams/i });
    await user.click(incomeBtn);
    await robustNavigateToHeading('Income Streams', /Income Streams/i, { timeoutMs: 15000 });

    await user.click(screen.getByLabelText('I’ll share income details later'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'Not ready to disclose');
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('income', 'opted_out');
  });
});
