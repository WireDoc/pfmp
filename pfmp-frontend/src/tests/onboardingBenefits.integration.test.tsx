import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as financialProfileApi from '../services/financialProfileApi';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderOnboardingPageForTest, forceFlushAutosaveAct, waitForAutosaveComplete, waitForSectionStatusTransition, robustNavigateToHeading } from './utils/onboardingTestHelpers';

/**
 * Integration tests for Benefits & Programs autosave behavior. Mirrors other section autosave tests.
 */

describe('Benefits onboarding section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock upsertBenefitsProfile to resolve instantly
    vi.spyOn(financialProfileApi, 'upsertBenefitsProfile').mockResolvedValue();
    // Mock fetchBenefitsProfile to return empty initial state
    vi.spyOn(financialProfileApi, 'fetchBenefitsProfile').mockResolvedValue({ benefits: [] });
  });

  it('autosaves benefits entry and advances to long-term obligations', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    // Advance through prior sections minimally to reach Insurance then Benefits.
    // We reuse existing helpers indirectly by robust navigation to Benefits heading.
    // Navigate sequentially using sidebar until Benefits & Programs visible.
    await robustNavigateToHeading('Insurance Coverage', /Insurance Coverage/i, { timeoutMs: 15000 });
    // Jump to benefits (simulate prior completion of insurance)
    const benefitsBtn = await screen.findByRole('button', { name: /Benefits & Programs/i });
    await user.click(benefitsBtn);
    await robustNavigateToHeading('Benefits & Programs', /Benefits & Programs/i, { timeoutMs: 15000 });

    // Fill one benefit field to trigger autosave
    const providerField = screen.getByLabelText('Provider');
    await user.type(providerField, 'Blue Cross');

    // Force flush to bypass debounce
    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('benefits', 'completed');

    // Advance to next section (Long-Term Obligations)
    // Use sidebar navigation for reliability
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    await user.click(nextBtn);
    await robustNavigateToHeading('Long-Term Obligations', /Long-Term Obligations/i, { timeoutMs: 16000 });

    // Assertion: heading for next section visible
    expect(screen.getByRole('heading', { level: 2, name: 'Long-Term Obligations' })).toBeTruthy();
  }, 25000);

  it('autosaves benefits opt-out with reason', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    // Navigate to Benefits
    await robustNavigateToHeading('Insurance Coverage', /Insurance Coverage/i, { timeoutMs: 15000 });
    const benefitsBtn = await screen.findByRole('button', { name: /Benefits & Programs/i });
    await user.click(benefitsBtn);
    await robustNavigateToHeading('Benefits & Programs', /Benefits & Programs/i, { timeoutMs: 15000 });

    // Opt out toggle
    const optOutToggle = screen.getByLabelText('I’ll review benefits later');
    await user.click(optOutToggle);
    const reasonField = screen.getByLabelText('Why are you opting out?');
    await user.type(reasonField, 'Handled via agency portal');

    await forceFlushAutosaveAct();
    await waitForAutosaveComplete();
    await waitForSectionStatusTransition('benefits', 'opted_out');

    // Ensure status chip updated in sidebar
    await waitFor(() => {
      const sidebarBtn = screen.getByRole('button', { name: /Benefits & Programs/i });
      expect(sidebarBtn.textContent).toMatch(/Opted Out|Opted out/i);
    });
  }, 25000);
});
