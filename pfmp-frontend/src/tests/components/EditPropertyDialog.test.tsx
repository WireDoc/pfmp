import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditPropertyDialog from '../../components/properties/EditPropertyDialog';
import * as propertiesApi from '../../api/properties';
import type { PropertyDetailDto } from '../../api/properties';

vi.mock('../../api/properties', async () => {
  const actual = await vi.importActual('../../api/properties');
  return {
    ...actual,
    updateProperty: vi.fn(),
    validateAddress: vi.fn(),
  };
});

const mockProperty: PropertyDetailDto = {
  propertyId: 'prop-1',
  propertyName: 'My House',
  propertyType: 'primary',
  occupancy: 'owner',
  estimatedValue: 500000,
  mortgageBalance: 200000,
  equity: 300000,
  monthlyMortgagePayment: 1500,
  monthlyRentalIncome: null,
  monthlyExpenses: 300,
  monthlyCashFlow: -1800,
  hasHeloc: false,
  interestRate: null,
  mortgageTerm: null,
  lienholder: null,
  monthlyPropertyTax: null,
  monthlyInsurance: null,
  purpose: null,
  address: '123 Main St, Springfield, VA 22150',
  source: 'Manual',
  isPlaidLinked: false,
  lastSyncedAt: null,
  updatedAt: '2025-01-01T00:00:00Z',
  street: '123 Main St',
  city: 'Springfield',
  state: 'VA',
  postalCode: '22150',
  linkedMortgageLiabilityId: null,
  syncStatus: null,
  createdAt: '2024-06-01T00:00:00Z',
  linkedMortgage: null,
  valueHistory: [],
  valuationSource: null,
  valuationConfidence: null,
  valuationLow: null,
  valuationHigh: null,
  lastValuationAt: null,
  autoValuationEnabled: true,
  addressValidated: false,
};

describe('EditPropertyDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    property: mockProperty,
    onUpdated: mockOnUpdated,
  };

  beforeEach(() => {
    vi.mocked(propertiesApi.updateProperty).mockResolvedValue({
      ...mockProperty,
      propertyName: 'Updated House',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with pre-filled values', () => {
    render(<EditPropertyDialog {...defaultProps} />);

    expect(screen.getByText('Edit Property')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My House')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200000')).toBeInTheDocument();
  });

  it('saves updated property', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<EditPropertyDialog {...defaultProps} />);

    const nameInput = screen.getByDisplayValue('My House');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated House');

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(propertiesApi.updateProperty).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ propertyName: 'Updated House' })
      );
    });
    expect(mockOnUpdated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows Plaid info alert for linked properties', () => {
    const plaidProperty = { ...mockProperty, isPlaidLinked: true };
    render(<EditPropertyDialog {...defaultProps} property={plaidProperty} />);

    expect(screen.getByText(/linked via Plaid mortgage/i)).toBeInTheDocument();
  });

  it('disables mortgage balance for Plaid-linked properties', () => {
    const plaidProperty = { ...mockProperty, isPlaidLinked: true };
    render(<EditPropertyDialog {...defaultProps} property={plaidProperty} />);

    const mortgageInput = screen.getByDisplayValue('200000');
    expect(mortgageInput).toBeDisabled();
  });

  it('does not render when open is false', () => {
    render(<EditPropertyDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Edit Property')).not.toBeInTheDocument();
  });
});
