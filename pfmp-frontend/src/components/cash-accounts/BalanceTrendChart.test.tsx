import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BalanceTrendChart } from './BalanceTrendChart';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  defs: 'defs',
  linearGradient: 'linearGradient',
  stop: 'stop'
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockBalanceHistory = [
  { date: '2025-01-01', balance: 1000.00 },
  { date: '2025-01-08', balance: 1200.50 },
  { date: '2025-01-15', balance: 1500.75 },
  { date: '2025-01-22', balance: 1450.00 },
  { date: '2025-01-29', balance: 1600.25 }
];

describe('BalanceTrendChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockBalanceHistory
    });
  });

  it('renders chart with balance data', async () => {
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    expect(screen.getByTestId('area')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('fetches balance history on mount with default 30 days', async () => {
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/accounts/123/balance-history?days=30'
      );
    });
  });

  it('changes period when selecting different timeframe', async () => {
    const user = userEvent.setup();
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    // Clear previous fetch calls
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockBalanceHistory
    });

    // Click 7 days button
    const sevenDaysButton = screen.getByRole('button', { name: '7 Days' });
    await user.click(sevenDaysButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/accounts/123/balance-history?days=7'
      );
    });
  });

  it('displays summary statistics', async () => {
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText('Starting Balance')).toBeInTheDocument();
    });

    expect(screen.getByText('Current Balance')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  it('calculates positive change correctly', async () => {
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      // Starting: $1000.00, Ending: $1600.25
      // Change: +$600.25 (+60.03%)
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();
      expect(screen.getByText('$1,600.25')).toBeInTheDocument();
    });

    // Should show positive change indicator
    const changeText = screen.getByText(/\+/);
    expect(changeText).toBeInTheDocument();
  });

  it('calculates negative change correctly', async () => {
    const decliningBalance = [
      { date: '2025-01-01', balance: 2000.00 },
      { date: '2025-01-08', balance: 1800.50 },
      { date: '2025-01-15', balance: 1500.75 }
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => decliningBalance
    });

    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText('$2,000.00')).toBeInTheDocument();
      expect(screen.getByText('$1,500.75')).toBeInTheDocument();
    });

    // Should show negative change indicator
    const changeText = screen.getByText(/-/);
    expect(changeText).toBeInTheDocument();
  });

  it('displays all period options', async () => {
    render(<BalanceTrendChart accountId={123} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '7 Days' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '30 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 Year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Time' })).toBeInTheDocument();
  });

  it('fetches all history when "All" is selected', async () => {
    const user = userEvent.setup();
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    vi.clearAllMocks();

    // Click "All" button
    const allButton = screen.getByRole('button', { name: 'All Time' });
    await user.click(allButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounts/123/balance-history')
      );
    });
  });

  it('handles empty balance history', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => []
    });

    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText(/no balance history/i)).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (fetch as any).mockRejectedValue(new Error('Network error'));

    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching balance history:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('shows loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<BalanceTrendChart accountId={123} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fetches 1 year data correctly', async () => {
    const user = userEvent.setup();
    render(<BalanceTrendChart accountId={123} />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    vi.clearAllMocks();

    const oneYearButton = screen.getByRole('button', { name: '1 Year' });
    await user.click(oneYearButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/accounts/123/balance-history?days=365'
      );
    });
  });
});
