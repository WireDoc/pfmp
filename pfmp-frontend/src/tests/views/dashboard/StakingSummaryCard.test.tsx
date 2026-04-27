import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StakingSummaryCard from '../../../views/dashboard/StakingSummaryCard';

vi.mock('../../../services/cryptoApi', () => ({
  getCryptoStakingSummary: vi.fn(),
}));

import { getCryptoStakingSummary } from '../../../services/cryptoApi';

describe('StakingSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty-state copy when no staked balances', async () => {
    vi.mocked(getCryptoStakingSummary).mockResolvedValue({
      totalStakedValueUsd: 0,
      weightedApyPercent: null,
      ytdRewardsUsd: 0,
      stakedAssetCount: 0,
      byAsset: [],
    });
    render(<StakingSummaryCard userId={1} />);
    await waitFor(() => expect(screen.getByText(/No staked balances/i)).toBeInTheDocument());
  });

  it('renders totals, weighted APY and per-asset rows when populated', async () => {
    vi.mocked(getCryptoStakingSummary).mockResolvedValue({
      totalStakedValueUsd: 10000,
      weightedApyPercent: 4.25,
      ytdRewardsUsd: 200,
      stakedAssetCount: 1,
      byAsset: [{ symbol: 'ETH', quantity: 5, marketValueUsd: 10000, apyPercent: 4.25 }],
    });
    render(<StakingSummaryCard userId={1} />);
    await waitFor(() => expect(screen.getAllByText(/4\.25%/).length).toBeGreaterThan(0));
    expect(screen.getByText(/\$200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/ETH/)).toBeInTheDocument();
    expect(screen.getByText(/Weighted APY/i)).toBeInTheDocument();
  });

  it('refetches when refreshKey changes', async () => {
    vi.mocked(getCryptoStakingSummary).mockResolvedValue({
      totalStakedValueUsd: 0,
      weightedApyPercent: null,
      ytdRewardsUsd: 0,
      stakedAssetCount: 0,
      byAsset: [],
    });
    const { rerender } = render(<StakingSummaryCard userId={1} refreshKey={0} />);
    await waitFor(() => expect(getCryptoStakingSummary).toHaveBeenCalledTimes(1));
    rerender(<StakingSummaryCard userId={1} refreshKey={1} />);
    await waitFor(() => expect(getCryptoStakingSummary).toHaveBeenCalledTimes(2));
  });
});
