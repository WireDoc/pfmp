import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPropertyDialog from '../../components/properties/AddPropertyDialog';
import * as propertiesApi from '../../api/properties';

vi.mock('../../api/properties', async () => {
  const actual = await vi.importActual('../../api/properties');
  return {
    ...actual,
    createProperty: vi.fn(),
    validateAddress: vi.fn(),
  };
});

describe('AddPropertyDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    userId: 1,
    onCreated: mockOnCreated,
  };

  beforeEach(() => {
    vi.mocked(propertiesApi.createProperty).mockResolvedValue({
      propertyId: 'new-id',
      propertyName: 'Test Property',
      propertyType: 'primary',
      occupancy: 'owner',
      estimatedValue: 500000,
      mortgageBalance: null,
      equity: 500000,
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

  it('renders the dialog with form fields', () => {
    render(<AddPropertyDialog {...defaultProps} />);

    expect(screen.getByText('Add Property')).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Value/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<AddPropertyDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Create Property/i }));

    expect(screen.getByText(/Property name is required/i)).toBeInTheDocument();
  });

  it('creates a property with valid data', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<AddPropertyDialog {...defaultProps} />);

    await user.clear(screen.getByLabelText(/Property Name/i));
    await user.type(screen.getByLabelText(/Property Name/i), 'My Home');
    await user.clear(screen.getByLabelText(/Estimated Value/i));
    await user.type(screen.getByLabelText(/Estimated Value/i), '500000');

    await user.click(screen.getByRole('button', { name: /Create Property/i }));

    await waitFor(() => {
      expect(propertiesApi.createProperty).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          propertyName: 'My Home',
          estimatedValue: 500000,
        })
      );
    });
    expect(mockOnCreated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<AddPropertyDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows address validation button when address is filled', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<AddPropertyDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/Street Address/i), '123 Main St');
    await user.type(screen.getByLabelText(/City/i), 'Springfield');
    await user.type(screen.getByLabelText(/State/i), 'VA');
    await user.type(screen.getByLabelText(/ZIP/i), '22150');

    expect(screen.getByRole('button', { name: /Validate Address/i })).toBeInTheDocument();
  });

  it('validates address and shows success chip', async () => {
    vi.mocked(propertiesApi.validateAddress).mockResolvedValue({
      isValid: true,
      street: '123 MAIN ST',
      city: 'SPRINGFIELD',
      state: 'VA',
      zip: '22150',
      zip4: '1234',
      message: null,
    });

    const user = userEvent.setup({ delay: 0 });
    render(<AddPropertyDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/Street Address/i), '123 Main St');
    await user.type(screen.getByLabelText(/City/i), 'Springfield');
    await user.type(screen.getByLabelText(/State/i), 'VA');
    await user.type(screen.getByLabelText(/ZIP/i), '22150');

    await user.click(screen.getByRole('button', { name: /Validate Address/i }));

    await waitFor(() => {
      expect(screen.getByText(/Address validated/i)).toBeInTheDocument();
    });
  });

  it('does not render when open is false', () => {
    render(<AddPropertyDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Add Property')).not.toBeInTheDocument();
  });
});
