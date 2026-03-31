import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdateValueDialog from '../../components/properties/UpdateValueDialog';
import * as propertiesApi from '../../api/properties';

vi.mock('../../api/properties', async () => {
  const actual = await vi.importActual('../../api/properties');
  return {
    ...actual,
    updateProperty: vi.fn(),
  };
});

describe('UpdateValueDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    propertyId: 'prop-1',
    currentValue: 500000,
    onUpdated: mockOnUpdated,
  };

  beforeEach(() => {
    vi.mocked(propertiesApi.updateProperty).mockResolvedValue({
      propertyId: 'prop-1',
      propertyName: 'Test',
      propertyType: 'primary',
      occupancy: 'owner',
      estimatedValue: 550000,
      mortgageBalance: null,
      equity: 550000,
      monthlyMortgagePayment: null,
      monthlyRentalIncome: null,
      monthlyExpenses: null,
      monthlyCashFlow: 0,
      hasHeloc: false,
      address: null,
      source: 'Manual',
      isPlaidLinked: false,
      lastSyncedAt: null,
      updatedAt: new Date().toISOString(),
      valuationSource: null,
      valuationConfidence: null,
      valuationLow: null,
      valuationHigh: null,
      lastValuationAt: null,
      autoValuationEnabled: true,
      addressValidated: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the dialog with current value', () => {
    render(<UpdateValueDialog {...defaultProps} />);

    expect(screen.getByText('Update Property Value')).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Value/i)).toBeInTheDocument();
  });

  it('updates value and calls callbacks', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<UpdateValueDialog {...defaultProps} />);

    const input = screen.getByLabelText(/Estimated Value/i);
    await user.clear(input);
    await user.type(input, '550000');

    await user.click(screen.getByRole('button', { name: /Update Value/i }));

    await waitFor(() => {
      expect(propertiesApi.updateProperty).toHaveBeenCalledWith('prop-1', {
        estimatedValue: 550000,
      });
    });
    expect(mockOnUpdated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error for invalid value', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<UpdateValueDialog {...defaultProps} />);

    const input = screen.getByLabelText(/Estimated Value/i);
    await user.clear(input);

    await user.click(screen.getByRole('button', { name: /Update Value/i }));

    expect(screen.getByText(/Enter a valid value/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<UpdateValueDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
