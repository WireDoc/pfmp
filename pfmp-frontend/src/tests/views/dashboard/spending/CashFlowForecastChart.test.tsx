import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CashFlowForecastChart from '../../../../views/dashboard/spending/CashFlowForecastChart';

// Stub Recharts so we don't try to draw an SVG; we only care about surrounding UI logic.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="rc">{children}</div>,
  };
});

vi.mock('../../../../services/spendingApi', () => ({
  getCashFlowForecast: vi.fn(),
}));

import { getCashFlowForecast } from '../../../../services/spendingApi';

const mockGet = getCashFlowForecast as ReturnType<typeof vi.fn>;

function makeForecast(horizonDays: number) {
  const days = Array.from({ length: horizonDays }, (_, i) => {
    const date = new Date(Date.UTC(2026, 5, 8 + i)).toISOString();
    const projected = 10000 - i * 50;
    return {
      date,
      lowerBalance: projected - i * 10,
      projectedBalance: projected,
      upperBalance: projected + i * 10,
      expectedNetFlow: -50,
      events: [],
    };
  });
  return {
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    horizonDays,
    startingBalance: 10000,
    historicalDailyStdDev: 25,
    days,
    recurringContributions: [
      {
        streamId: 1, merchantName: 'GS-13 Direct Deposit', direction: 'Inflow',
        frequency: 'Biweekly', source: 'PlaidRecurring',
        monthlyAverage: 7239.03, horizonContribution: 21717.09,
      },
      {
        streamId: 2, merchantName: 'Rent', direction: 'Outflow',
        frequency: 'Monthly', source: 'Heuristic',
        monthlyAverage: 1500, horizonContribution: 4500,
      },
    ],
    avgDailyDiscretionary: 50,
    asOfUtc: '2026-06-07T12:00:00Z',
  };
}

describe('CashFlowForecastChart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders starting balance, final projected balance, and net change', async () => {
    mockGet.mockResolvedValue(makeForecast(90));
    render(<CashFlowForecastChart userId={20} />);
    await waitFor(() => expect(screen.getByText('Cash-Flow Forecast')).toBeInTheDocument());
    expect(screen.getByText('$10,000.00')).toBeInTheDocument(); // starting
    // 89 days × -$50 net = projected $5,550 at day 89 (i=89: 10000 - 89*50 = 5550)
    expect(screen.getByText('$5,550.00')).toBeInTheDocument();
    // Net change = 5550 - 10000 = -4450
    expect(screen.getByText('-$4,450.00')).toBeInTheDocument();
  });

  it('changes horizon when dropdown selection changes', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makeForecast(90));
    render(<CashFlowForecastChart userId={20} />);
    await waitFor(() => expect(screen.getByText('Cash-Flow Forecast')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledWith(20, 90);
    // Open the horizon dropdown and pick 30
    await user.click(screen.getByLabelText(/Horizon/i));
    await user.click(await screen.findByRole('option', { name: /^30 days$/ }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(20, 30));
  });

  it('opens the Why-this-forecast drawer and shows recurring contributions', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makeForecast(90));
    render(<CashFlowForecastChart userId={20} />);
    await waitFor(() => expect(screen.getByText('Cash-Flow Forecast')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Why this forecast/i }));
    expect(await screen.findByRole('heading', { name: /Why this forecast/i })).toBeInTheDocument();
    expect(screen.getByText('GS-13 Direct Deposit')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('+$7,239.03')).toBeInTheDocument();
    expect(screen.getByText('-$1,500.00')).toBeInTheDocument();
  });

  it('shows empty-state in drawer when no recurring streams', async () => {
    const user = userEvent.setup();
    const data = makeForecast(60);
    data.recurringContributions = [];
    mockGet.mockResolvedValue(data);
    render(<CashFlowForecastChart userId={20} />);
    await waitFor(() => expect(screen.getByText('Cash-Flow Forecast')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Why this forecast/i }));
    expect(await screen.findByText(/No active recurring streams/i)).toBeInTheDocument();
  });
});
