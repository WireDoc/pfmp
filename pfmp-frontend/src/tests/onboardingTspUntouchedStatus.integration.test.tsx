import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as financialProfileApi from '../services/financialProfileApi';
import { renderOnboardingPageForTest, expectSectionStatus } from './utils/onboardingTestHelpers';
import type { FinancialProfileSectionStatus } from '../services/financialProfileApi';

/**
 * Regression test: TSP section should not appear Completed when no user input has been provided.
 * We simulate a backend hydration response that (incorrectly) marks TSP completed with empty payload
 * to ensure front-end reconciliation downgrades it to Needs Info.
 */

describe('TSP untouched status reconciliation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downgrades erroneous completed status to Needs Info for untouched TSP payload', async () => {
    const user = userEvent.setup();

    // Mock section statuses hydration: mark tsp completed erroneously
    vi.spyOn(financialProfileApi, 'fetchFinancialProfileSectionStatuses').mockResolvedValueOnce([
      { sectionKey: 'household', status: 'needs_info' },
      { sectionKey: 'risk-goals', status: 'needs_info' },
      { sectionKey: 'tsp', status: 'completed' },
    ] as FinancialProfileSectionStatus[]);

    // Mock tsp profile fetch returning effectively empty data (no contribution rate or positions)
    vi.spyOn(financialProfileApi, 'fetchTspProfile').mockResolvedValueOnce({
      contributionRatePercent: 0,
      employerMatchPercent: 0,
      currentBalance: 0,
      targetBalance: 0,
      gFundPercent: 0,
      fFundPercent: 0,
      cFundPercent: 0,
      sFundPercent: 0,
      iFundPercent: 0,
      lifecyclePercent: null,
      lifecycleBalance: null,
      lifecyclePositions: [],
      optOut: undefined,
    });

    renderOnboardingPageForTest({ skipAutoHydrate: false });

    // Navigate to TSP via sidebar
    const tspBtn = await screen.findByRole('button', { name: /TSP Snapshot/i });
    await user.click(tspBtn);

    // Wait for heading to ensure component mounted
    await waitFor(() => screen.getByRole('heading', { level: 2, name: 'TSP Snapshot' }));

    // Allow reconciliation effect to run (next tick)
    await waitFor(() => {
      // Expect status chip to show Needs Info after downgrade
      const chips = screen.getAllByText(/TSP Snapshot/i).map((node) => node.closest('li')).filter(Boolean);
      const row = chips[0];
      if (!row) return false;
      return /Needs Info/i.test(row.textContent || '');
    }, { timeout: 4000 });

    await expectSectionStatus('TSP Snapshot', 'Needs Info');
  }, 15000);
});
