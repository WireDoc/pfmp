import { describe, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderOnboardingPageForTest,
  expectSectionStatus,
  waitForAutosaveComplete,
  goNextAndWait,
  waitForSectionStatusTransition,
} from './utils/onboardingTestHelpers';

async function fillHouseholdBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Preferred name'), 'Sidebar Tester');
  await user.click(screen.getByLabelText('Marital status'));
  await user.click(screen.getByText('Single'));
}

describe('Onboarding sidebar status updates', () => {
  it('marks the completed section in the sidebar immediately after advancing', async () => {
    const user = userEvent.setup({ delay: 0 });

    renderOnboardingPageForTest();

    await fillHouseholdBasics(user);

    await waitForAutosaveComplete();

    await goNextAndWait(user, 'Risk & Goals');

    await waitForSectionStatusTransition('household', 'completed');

    await expectSectionStatus('Household Profile', 'Completed');
  });
});
