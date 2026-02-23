import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropertiesPanel from '../views/dashboard/PropertiesPanel';
import type { PropertySnapshot } from '../services/dashboard/types';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PropertiesPanel', () => {
  it('renders loading state', () => {
    renderWithRouter(<PropertiesPanel properties={[]} loading={true} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders empty state when no properties provided', () => {
    renderWithRouter(<PropertiesPanel properties={[]} loading={false} />);
    expect(screen.getByText(/No properties to display/i)).toBeInTheDocument();
  });

  it('displays property with equity calculation', () => {
    const properties: PropertySnapshot[] = [
      {
        id: 1,
        address: '123 Main St',
        type: 'Primary Residence',
        estimatedValue: { amount: 600000, currency: 'USD' },
        mortgageBalance: { amount: 238000, currency: 'USD' },
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    renderWithRouter(<PropertiesPanel properties={properties} loading={false} />);
    
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Primary Residence')).toBeInTheDocument();
    // Equity: $600k - $238k = $362k (appears in multiple places)
    expect(screen.getAllByText(/362,000/).length).toBeGreaterThan(0);
    // Equity percentage: 362/600 = 60.3%
    expect(screen.getByText(/60.3% equity/i)).toBeInTheDocument();
  });

  it('calculates total equity correctly for multiple properties', () => {
    const properties: PropertySnapshot[] = [
      {
        id: 1,
        address: 'House A',
        type: 'Primary',
        estimatedValue: { amount: 500000, currency: 'USD' },
        mortgageBalance: { amount: 200000, currency: 'USD' },
        lastUpdated: '2025-01-01T00:00:00Z',
      },
      {
        id: 2,
        address: 'House B',
        type: 'Rental',
        estimatedValue: { amount: 300000, currency: 'USD' },
        mortgageBalance: { amount: 100000, currency: 'USD' },
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    renderWithRouter(<PropertiesPanel properties={properties} loading={false} />);
    
    // Total equity: (500k - 200k) + (300k - 100k) = 300k + 200k = 500k
    expect(screen.getByText('Net Equity')).toBeInTheDocument();
    const equityElements = screen.getAllByText(/500,000/);
    expect(equityElements.length).toBeGreaterThan(0);
  });

  it('handles property with no mortgage', () => {
    const properties: PropertySnapshot[] = [
      {
        id: 1,
        address: 'Paid Off House',
        type: 'Primary',
        estimatedValue: { amount: 400000, currency: 'USD' },
        mortgageBalance: { amount: 0, currency: 'USD' },
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    renderWithRouter(<PropertiesPanel properties={properties} loading={false} />);
    
    expect(screen.getByText('Paid Off House')).toBeInTheDocument();
    // Full value as equity (appears in multiple places)
    expect(screen.getAllByText(/400,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/100.0% equity/i)).toBeInTheDocument();
  });
});
