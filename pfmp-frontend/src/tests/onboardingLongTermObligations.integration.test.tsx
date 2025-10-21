import { describe, it, beforeEach, vi, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderOnboardingPageForTest, robustNavigateToHeading, forceFlushAutosaveAct, waitForAutosaveComplete, waitForSectionStatusTransition } from './utils/onboardingTestHelpers';
import * as financialProfileApi from '../services/financialProfileApi';

/** Autosave integration tests for Long-Term Obligations section (updated for autosave) */

describe('Long-Term Obligations onboarding section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(financialProfileApi, 'upsertLongTermObligationsProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'fetchLongTermObligationsProfile').mockResolvedValue({ obligations: [] });
  });

  it('autosaves obligation entry and advances to Income', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    await robustNavigateToHeading('Benefits & Programs', /Benefits & Programs/i, { timeoutMs: 15000 });
    const btn = await screen.findByRole('button', { name: /Long-Term Obligations/i });
    await user.click(btn);
    await robustNavigateToHeading('Long-Term Obligations', /Long-Term Obligations/i, { timeoutMs: 15000 });

    await user.type(screen.getByLabelText('Obligation name'), 'Home renovation');
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('long-term-obligations', 'completed');

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    await user.click(nextBtn);
    await robustNavigateToHeading('Income Streams', /Income Streams/i, { timeoutMs: 16000 });
    expect(screen.getByRole('heading', { level: 2, name: 'Income Streams' })).toBeTruthy();
  }, 20000);

  it('autosaves opt-out with reason', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    await robustNavigateToHeading('Benefits & Programs', /Benefits & Programs/i, { timeoutMs: 15000 });
    const btn = await screen.findByRole('button', { name: /Long-Term Obligations/i });
    await user.click(btn);
    await robustNavigateToHeading('Long-Term Obligations', /Long-Term Obligations/i, { timeoutMs: 15000 });

    await user.click(screen.getByLabelText('I don’t have long-term obligations right now'));
    await user.type(screen.getByLabelText('Why are you opting out?'), 'Handled later');
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('long-term-obligations', 'opted_out');
  }, 20000);
});
