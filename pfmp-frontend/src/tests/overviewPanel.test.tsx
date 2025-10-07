import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OverviewPanel } from '../views/dashboard/OverviewPanel';
import type { DashboardData } from '../services/dashboard';

// Simple controlled test: feed the panel props directly (no hook involved)

describe('OverviewPanel', () => {
  it('renders loading state', () => {
    render(<OverviewPanel data={null} loading={true} />);
    expect(screen.getByText(/Loading overview/i)).toBeInTheDocument();
  });

  it('renders data values when provided', () => {
    const data: DashboardData = {
      netWorth: {
        totalAssets: { amount: 100000, currency: 'USD' },
        totalLiabilities: { amount: 25000, currency: 'USD' },
        netWorth: { amount: 75000, currency: 'USD' },
        change1dPct: 0.5,
        change30dPct: 2.25,
        lastUpdated: new Date().toISOString(),
      },
      accounts: [],
      insights: [],
      alerts: [],
      advice: [],
      tasks: [],
    };
    render(<OverviewPanel data={data} loading={false} />);
    expect(screen.getByText(/75,000/)).toBeInTheDocument();
    expect(screen.getByText(/Assets/i)).toBeInTheDocument();
    expect(screen.getByText(/Liabilities/i)).toBeInTheDocument();
  });
});
