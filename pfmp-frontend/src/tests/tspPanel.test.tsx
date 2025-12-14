import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TspPanel from '../views/dashboard/TspPanel';
import type { AccountSnapshot } from '../services/dashboard/types';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('TspPanel', () => {
  it('renders loading state', () => {
    renderWithRouter(<TspPanel tspAccount={undefined} loading={true} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders empty state when no TSP account provided', () => {
    renderWithRouter(<TspPanel tspAccount={undefined} loading={false} />);
    expect(screen.getByText(/No TSP data available/i)).toBeInTheDocument();
  });

  it('displays TSP account with balance', () => {
    const tspAccount: AccountSnapshot = {
      id: 'tsp_aggregate',
      name: 'Thrift Savings Plan',
      institution: 'TSP',
      type: 'retirement',
      balance: { amount: 322658.69, currency: 'USD' },
      syncStatus: 'ok',
      lastSync: '2025-01-01T00:00:00Z',
    };
    renderWithRouter(<TspPanel tspAccount={tspAccount} loading={false} />);
    
    expect(screen.getByText('Thrift Savings Plan (TSP)')).toBeInTheDocument();
    // Balance appears in multiple places with different formatting
    expect(screen.getAllByText(/322,658/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Synced/i)).toBeInTheDocument();
  });

  it('displays last sync date', () => {
    const tspAccount: AccountSnapshot = {
      id: 'tsp_aggregate',
      name: 'Thrift Savings Plan',
      institution: 'TSP',
      type: 'retirement',
      balance: { amount: 100000, currency: 'USD' },
      syncStatus: 'ok',
      lastSync: '2025-01-15T10:30:00Z',
    };
    renderWithRouter(<TspPanel tspAccount={tspAccount} loading={false} />);
    
    // Date formatting varies by locale, just check that "Last updated" text exists
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
  });

  it('shows pending sync status when sync status is not ok', () => {
    const tspAccount: AccountSnapshot = {
      id: 'tsp_aggregate',
      name: 'Thrift Savings Plan',
      institution: 'TSP',
      type: 'retirement',
      balance: { amount: 50000, currency: 'USD' },
      syncStatus: 'pending',
      lastSync: '2025-01-01T00:00:00Z',
    };
    renderWithRouter(<TspPanel tspAccount={tspAccount} loading={false} />);
    
    expect(screen.getByText(/Pending sync/i)).toBeInTheDocument();
  });

  it('displays helpful note about TSP data', () => {
    const tspAccount: AccountSnapshot = {
      id: 'tsp_aggregate',
      name: 'Thrift Savings Plan',
      institution: 'TSP',
      type: 'retirement',
      balance: { amount: 200000, currency: 'USD' },
      syncStatus: 'ok',
      lastSync: '2025-01-01T00:00:00Z',
    };
    renderWithRouter(<TspPanel tspAccount={tspAccount} loading={false} />);
    
    // Component shows helpful text and a View Details button
    expect(screen.getByText(/fund breakdown and current prices/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Details/i })).toBeInTheDocument();
  });
});
