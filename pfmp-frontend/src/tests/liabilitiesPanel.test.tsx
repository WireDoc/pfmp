import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiabilitiesPanel from '../views/dashboard/LiabilitiesPanel';
import type { LiabilitySnapshot } from '../services/dashboard/types';

describe('LiabilitiesPanel', () => {
  it('renders loading state', () => {
    render(<LiabilitiesPanel liabilities={[]} loading={true} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders empty state when no liabilities provided', () => {
    render(<LiabilitiesPanel liabilities={[]} loading={false} />);
    expect(screen.getByText(/No liabilities to display/i)).toBeInTheDocument();
  });

  it('displays liability with interest rate and minimum payment', () => {
    const liabilities: LiabilitySnapshot[] = [
      {
        id: 1,
        name: 'Student Loan',
        type: 'Student Loan',
        currentBalance: { amount: 25000, currency: 'USD' },
        minimumPayment: { amount: 300, currency: 'USD' },
        interestRate: 4.5,
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    render(<LiabilitiesPanel liabilities={liabilities} loading={false} />);
    
    // "Student Loan" appears as both name and type
    expect(screen.getAllByText('Student Loan').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/4.50% APR/i)).toBeInTheDocument();
    expect(screen.getByText(/Min Payment: \$300\/mo/i)).toBeInTheDocument();
  });

  it('calculates total debt correctly for multiple liabilities', () => {
    const liabilities: LiabilitySnapshot[] = [
      {
        id: 1,
        name: 'Credit Card',
        type: 'Credit Card',
        currentBalance: { amount: 5000, currency: 'USD' },
        minimumPayment: { amount: 150, currency: 'USD' },
        interestRate: 18.5,
        lastUpdated: '2025-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Car Loan',
        type: 'Auto Loan',
        currentBalance: { amount: 15000, currency: 'USD' },
        minimumPayment: { amount: 400, currency: 'USD' },
        interestRate: 5.9,
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    render(<LiabilitiesPanel liabilities={liabilities} loading={false} />);
    
    // Total debt: 5k + 15k = 20k (appears in multiple places)
    expect(screen.getByText('Total Debt')).toBeInTheDocument();
    expect(screen.getAllByText(/20,000/).length).toBeGreaterThan(0);
    // Total minimum payment: 150 + 400 = 550
    expect(screen.getByText(/550\/mo/)).toBeInTheDocument();
  });

  it('handles liability without interest rate', () => {
    const liabilities: LiabilitySnapshot[] = [
      {
        id: 1,
        name: 'Medical Bill',
        type: 'Medical',
        currentBalance: { amount: 2000, currency: 'USD' },
        minimumPayment: { amount: 100, currency: 'USD' },
        interestRate: null,
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    render(<LiabilitiesPanel liabilities={liabilities} loading={false} />);
    
    expect(screen.getByText('Medical Bill')).toBeInTheDocument();
    // Amount appears in multiple places
    expect(screen.getAllByText(/2,000/).length).toBeGreaterThan(0);
    // Should not show APR text
    expect(screen.queryByText(/APR/i)).not.toBeInTheDocument();
  });

  it('handles liability without minimum payment', () => {
    const liabilities: LiabilitySnapshot[] = [
      {
        id: 1,
        name: 'Mortgage - 123 Main St',
        type: 'Mortgage',
        currentBalance: { amount: 238000, currency: 'USD' },
        minimumPayment: { amount: 0, currency: 'USD' },
        interestRate: null,
        lastUpdated: '2025-01-01T00:00:00Z',
      },
    ];
    render(<LiabilitiesPanel liabilities={liabilities} loading={false} />);
    
    expect(screen.getByText(/Mortgage - 123 Main St/)).toBeInTheDocument();
    // Amount appears in multiple places
    expect(screen.getAllByText(/238,000/).length).toBeGreaterThan(0);
    // Should not show min payment when it's 0
    expect(screen.queryByText(/Min Payment/i)).not.toBeInTheDocument();
  });
});
