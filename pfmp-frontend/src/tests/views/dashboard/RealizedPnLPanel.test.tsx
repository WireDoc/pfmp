import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RealizedPnLPanel from '../../../views/dashboard/RealizedPnLPanel';

vi.mock('../../../services/cryptoApi', () => ({
  getCryptoRealizedPnL: vi.fn(),
}));

import { getCryptoRealizedPnL } from '../../../services/cryptoApi';

describe('RealizedPnLPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty-state when no realized P/L', async () => {
    vi.mocked(getCryptoRealizedPnL).mockResolvedValue({
      year: 2026,
      totalProceedsUsd: 0,
      totalCostBasisUsd: 0,
      totalShortTermGainUsd: 0,
      totalLongTermGainUsd: 0,
      totalRealizedGainUsd: 0,
      bySymbol: [],
    });
    render(<RealizedPnLPanel userId={1} year={2026} />);
    await waitFor(() => expect(screen.getByText(/No realized gains or losses/i)).toBeInTheDocument());
  });

  it('renders totals and per-symbol rows when populated', async () => {
    vi.mocked(getCryptoRealizedPnL).mockResolvedValue({
      year: 2026,
      totalProceedsUsd: 30000,
      totalCostBasisUsd: 25000,
      totalShortTermGainUsd: 5000,
      totalLongTermGainUsd: 0,
      totalRealizedGainUsd: 5000,
      bySymbol: [{ symbol: 'BTC', proceedsUsd: 30000, costBasisUsd: 25000, shortTermGainUsd: 5000, longTermGainUsd: 0, totalGainUsd: 5000 }],
    });
    render(<RealizedPnLPanel userId={1} year={2026} />);
    await waitFor(() => expect(screen.getAllByText(/\$5,000\.00/).length).toBeGreaterThan(0));
    expect(screen.getByText(/BTC/)).toBeInTheDocument();
    expect(screen.getByText(/Short-term/i)).toBeInTheDocument();
    expect(screen.getByText(/Long-term/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost basis incomplete/i)).toBeInTheDocument();
  });

  it('refetches when year changes', async () => {
    vi.mocked(getCryptoRealizedPnL).mockResolvedValue({
      year: null,
      totalProceedsUsd: 0,
      totalCostBasisUsd: 0,
      totalShortTermGainUsd: 0,
      totalLongTermGainUsd: 0,
      totalRealizedGainUsd: 0,
      bySymbol: [],
    });
    const { rerender } = render(<RealizedPnLPanel userId={1} year={2026} />);
    await waitFor(() => expect(getCryptoRealizedPnL).toHaveBeenCalledWith(1, 2026));
    rerender(<RealizedPnLPanel userId={1} year={2025} />);
    await waitFor(() => expect(getCryptoRealizedPnL).toHaveBeenCalledWith(1, 2025));
  });
});
