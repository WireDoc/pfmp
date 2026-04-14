import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock devUserState
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

// Mock auth context
vi.mock('../../contexts/auth/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

// Mock financialProfileApi
const mockFetchTspDetail = vi.fn();
const mockUpsertTspProfile = vi.fn();
vi.mock('../../services/financialProfileApi', () => ({
  fetchTspDetail: (...args: unknown[]) => mockFetchTspDetail(...args),
  upsertTspProfile: (...args: unknown[]) => mockUpsertTspProfile(...args),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { TspDetailView } from '../../views/dashboard/TspDetailView';

const baseTspDetail = {
  positions: [
    { fundCode: 'C', currentPrice: 85.1234, units: 1500, currentMarketValue: 127685.10, currentMixPercent: 50 },
    { fundCode: 'S', currentPrice: 72.5678, units: 800, currentMarketValue: 58054.24, currentMixPercent: 30 },
  ],
  allFundPrices: {
    priceDate: '2025-04-14T00:00:00Z',
    gFundPrice: 18.5,
    fFundPrice: 20.1,
    cFundPrice: 85.12,
    sFundPrice: 72.56,
    iFundPrice: 40.3,
    lIncomeFundPrice: null,
    l2030FundPrice: null, l2035FundPrice: null, l2040FundPrice: null,
    l2045FundPrice: null, l2050FundPrice: null, l2055FundPrice: null,
    l2060FundPrice: null, l2065FundPrice: null, l2070FundPrice: null,
    l2075FundPrice: null, dataSource: null,
  },
  totalMarketValue: 185739.34,
  pricesAsOfUtc: '2025-04-14T16:00:00Z',
};

function renderTspDetail() {
  return render(
    <MemoryRouter>
      <TspDetailView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TspDetailView', () => {
  it('shows loading spinner initially', () => {
    mockFetchTspDetail.mockReturnValue(new Promise(() => {}));
    renderTspDetail();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
  });

  it('renders summary cards without Roth/Trad when profile has no split data', async () => {
    mockFetchTspDetail.mockResolvedValue({
      ...baseTspDetail,
      profile: {
        contributionRatePercent: 15,
        employerMatchPercent: 5,
        totalBalance: 185739.34,
        targetBalance: null,
        rothBalance: null,
        traditionalBalance: null,
        rothContributionRatePercent: null,
        updatedAt: null,
      },
    });
    renderTspDetail();

    await waitFor(() => {
      expect(screen.getAllByText('$185,739.34').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();

    // Roth/Traditional cards should NOT be present
    expect(screen.queryByText('Roth Balance')).not.toBeInTheDocument();
    expect(screen.queryByText('Traditional Balance')).not.toBeInTheDocument();
    expect(screen.queryByText('Tax-free withdrawals')).not.toBeInTheDocument();
  });

  it('renders Roth and Traditional summary cards when split data is present', async () => {
    mockFetchTspDetail.mockResolvedValue({
      ...baseTspDetail,
      profile: {
        contributionRatePercent: 15,
        employerMatchPercent: 5,
        totalBalance: 185739.34,
        targetBalance: null,
        rothBalance: 75000,
        traditionalBalance: 110739.34,
        rothContributionRatePercent: 60,
        updatedAt: null,
      },
    });
    renderTspDetail();

    await waitFor(() => {
      expect(screen.getByText('Roth Balance')).toBeInTheDocument();
    });
    expect(screen.getByText('$75,000.00')).toBeInTheDocument();
    expect(screen.getByText('Tax-free withdrawals')).toBeInTheDocument();

    expect(screen.getByText('Traditional Balance')).toBeInTheDocument();
    expect(screen.getByText('$110,739.34')).toBeInTheDocument();
    expect(screen.getByText('Taxable at withdrawal')).toBeInTheDocument();

    expect(screen.getByText('Roth Contribution %')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('of employee contribution to Roth')).toBeInTheDocument();
  });

  it('renders Roth/Trad cards without contribution percent when not provided', async () => {
    mockFetchTspDetail.mockResolvedValue({
      ...baseTspDetail,
      profile: {
        contributionRatePercent: 10,
        employerMatchPercent: 5,
        totalBalance: 100000,
        targetBalance: null,
        rothBalance: 40000,
        traditionalBalance: 60000,
        rothContributionRatePercent: null,
        updatedAt: null,
      },
    });
    renderTspDetail();

    await waitFor(() => {
      expect(screen.getByText('Roth Balance')).toBeInTheDocument();
    });
    expect(screen.getByText('Traditional Balance')).toBeInTheDocument();
    // Contribution % card should not appear
    expect(screen.queryByText('Roth Contribution %')).not.toBeInTheDocument();
  });

  it('renders position table with fund data', async () => {
    mockFetchTspDetail.mockResolvedValue({
      ...baseTspDetail,
      profile: null,
    });
    renderTspDetail();

    await waitFor(() => {
      expect(screen.getByText('Your Positions')).toBeInTheDocument();
    });
    // Fund codes should be visible
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('S').length).toBeGreaterThan(0);
  });

  it('shows error alert when fetch fails', async () => {
    mockFetchTspDetail.mockRejectedValue(new Error('Network error'));
    renderTspDetail();

    await waitFor(() => {
      expect(screen.getByText('Failed to load TSP data. Please try again.')).toBeInTheDocument();
    });
  });
});
