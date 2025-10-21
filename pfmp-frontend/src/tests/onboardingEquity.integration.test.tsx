import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderOnboardingPageForTest, waitForAutosaveComplete, forceFlushAutosaveAct } from './utils/onboardingTestHelpers';

async function navigateToEquity(user: ReturnType<typeof userEvent.setup>) {
  // Sidebar label uses full title "Equity & Private Holdings"
  const equityNav = screen.getByRole('button', { name: /Equity & Private Holdings/i });
  await user.click(equityNav);
  await waitFor(() => screen.getByText(/Equity & private investments are on deck/i));
}

describe('Equity onboarding section', () => {
  it('autosaves equity interest preference and shows saved indicator', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    await navigateToEquity(user);

    // Toggle tracking interest off then on to create dirty state
    const interestToggle = screen.getByLabelText(/Yes, let me know when this launches|No, I’m not interested right now/i);
    await user.click(interestToggle);
    await user.click(interestToggle);

    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();

    // Expect status chip (equity) to transition to Completed after autosave
  const savedChip = screen.getByText(/Saved|All changes synced/i);
    expect(savedChip).toBeTruthy();
  }, 20000);

  it('autosaves equity opt-out with reason', async () => {
    const user = userEvent.setup();
    renderOnboardingPageForTest();

    await navigateToEquity(user);

    const skipToggle = screen.getByLabelText(/I don’t need this yet/i);
    await user.click(skipToggle);

    const reasonField = screen.getByLabelText(/Add context \(optional\)/i);
    await user.type(reasonField, 'No grants yet');

    await waitForAutosaveComplete();
    await forceFlushAutosaveAct();

  const savedChip = screen.getByText(/Saved|All changes synced/i);
    expect(savedChip).toBeTruthy();
  }, 20000);
});
