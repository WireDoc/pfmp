import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as financialProfileApi from '../services/financialProfileApi';
import {
  renderOnboardingPageForTest,
  waitForAutosaveComplete,
  forceFlushAutosaveAct,
  expectSectionStatus,
} from './utils/onboardingTestHelpers';

describe('Onboarding sidebar status real-time updates', () => {
  beforeEach(() => {
    vi.spyOn(financialProfileApi, 'upsertHouseholdProfile').mockResolvedValue();
    vi.spyOn(financialProfileApi, 'fetchHouseholdProfile').mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates sidebar status chip from Needs Info to Completed after filling household and clicking Next', async () => {
    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    // Find the sidebar
    const sidebar = document.querySelector('aside');
    expect(sidebar).not.toBeNull();

    // Verify Household Profile starts as "Needs Info"
    const householdButton = within(sidebar!).getByRole('button', { name: /Household Profile/i });
    expect(within(householdButton).getByText(/Needs Info/i)).toBeInTheDocument();

    // Fill out the household form
    await user.type(screen.getByLabelText('Preferred name'), 'Test User');
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Single'));

    // Wait for autosave
    await waitForAutosaveComplete();

    // Click Next section button
    const nextButton = screen.getByRole('button', { name: /Next section/i });
    await user.click(nextButton);

    // Wait for Risk & Goals heading to appear
    await screen.findByRole('heading', { level: 2, name: /Risk & Goals/i });

    // Now verify the sidebar shows Household Profile as "Completed"
    const updatedHouseholdButton = within(sidebar!).getByRole('button', { name: /Household Profile/i });
    
    // This should find "Completed" - confirming the fix works
    expect(within(updatedHouseholdButton).getByText(/Completed/i)).toBeInTheDocument();
  }, 10000);

  it('updates sidebar status chip when manually clicking Save button', async () => {
    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    const sidebar = document.querySelector('aside');
    expect(sidebar).not.toBeNull();

    // Verify initial status
    const householdButton = within(sidebar!).getByRole('button', { name: /Household Profile/i });
    expect(within(householdButton).getByText(/Needs Info/i)).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByLabelText('Preferred name'), 'Manual Save Test');
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Married'));

    // Wait for autosave indicator
    await waitForAutosaveComplete();

    // Force flush to ensure save completes
    await forceFlushAutosaveAct();

    // Wait a bit for status propagation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if status updated to Completed in sidebar (without navigating away)
    const stillOnHouseholdButton = within(sidebar!).getByRole('button', { name: /Household Profile/i });
    
    // The status should now show "Completed" even though we haven't navigated
    // This will likely FAIL because the status doesn't update until navigation
    expect(within(stillOnHouseholdButton).getByText(/Completed/i)).toBeInTheDocument();
  }, 10000);

  it('verifies autosave triggers status update without explicit Save button', async () => {
    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    // Verify initial state
    await expectSectionStatus('Household Profile', 'Needs Info');

    // Fill form fields to trigger autosave
    await user.type(screen.getByLabelText('Preferred name'), 'AutosaveTest');
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Single'));

    // Wait for autosave to complete
    await waitForAutosaveComplete();

    // Wait for status to update to Completed (this is the key assertion)
    await waitFor(() => {
      expectSectionStatus('Household Profile', 'Completed');
    }, { timeout: 3000 });
    
    // Success: sidebar updated to Completed via autosave alone, no button click needed
  }, 10000);
});
