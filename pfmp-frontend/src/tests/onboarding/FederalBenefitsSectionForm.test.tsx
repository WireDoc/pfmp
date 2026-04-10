import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FederalBenefitsSectionForm from '../../onboarding/sections/FederalBenefitsSectionForm';
import * as federalBenefitsApi from '../../services/federalBenefitsApi';
import type { FederalBenefitsProfile } from '../../services/federalBenefitsApi';

// Mock the API module
vi.mock('../../services/federalBenefitsApi');

// Mock the auto-save hook to avoid timer issues
vi.mock('../../onboarding/hooks/useAutoSaveForm', () => ({
  useAutoSaveForm: () => ({
    status: 'idle',
    isDirty: false,
    lastSavedAt: null,
    error: null,
    flush: vi.fn(),
  }),
}));

// Mock hydration hook
vi.mock('../../onboarding/hooks/useSectionHydration', () => ({
  useSectionHydration: () => {},
}));

const mockProfile: FederalBenefitsProfile = {
  federalBenefitsProfileId: 1,
  userId: 20,
  high3AverageSalary: 120000,
  projectedAnnuity: 48000,
  projectedMonthlyPension: 4000,
  creditableYearsOfService: 25,
  creditableMonthsOfService: 6,
  minimumRetirementAge: null,
  isEligibleForSpecialRetirementSupplement: true,
  estimatedSupplementMonthly: 800,
  supplementEligibilityAge: 57,
  supplementEndAge: 62,
  hasFegliBasic: true,
  fegliBasicCoverage: 150000,
  hasFegliOptionA: true,
  hasFegliOptionB: true,
  fegliOptionBMultiple: 3,
  hasFegliOptionC: false,
  fegliOptionCMultiple: null,
  fegliTotalMonthlyPremium: 42.50,
  fehbPlanName: 'Blue Cross Standard',
  fehbCoverageLevel: 'Self Plus One',
  fehbMonthlyPremium: 350,
  fehbEmployerContribution: 280,
  hasFedvipDental: true,
  fedvipDentalMonthlyPremium: 32,
  hasFedvipVision: false,
  fedvipVisionMonthlyPremium: null,
  hasFltcip: false,
  fltcipMonthlyPremium: null,
  hasFsa: true,
  fsaAnnualElection: 2850,
  hasHsa: false,
  hsaBalance: null,
  hsaAnnualContribution: null,
  lastSf50UploadDate: null,
  lastSf50FileName: null,
  lastLesUploadDate: null,
  lastLesFileName: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('FederalBenefitsSectionForm', () => {
  const onStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(federalBenefitsApi.fetchFederalBenefits).mockResolvedValue(null);
    vi.mocked(federalBenefitsApi.saveFederalBenefits).mockResolvedValue(mockProfile);
  });

  function renderForm() {
    return render(
      <FederalBenefitsSectionForm
        userId={20}
        onStatusChange={onStatusChange}
        currentStatus="needs_info"
      />,
    );
  }

  it('renders the section heading', () => {
    renderForm();
    expect(screen.getByText('Federal Benefits Profile')).toBeInTheDocument();
  });

  it('renders pension fields', () => {
    renderForm();
    expect(screen.getByLabelText('High-3 Average Salary')).toBeInTheDocument();
    expect(screen.getByLabelText('Projected Annual Annuity')).toBeInTheDocument();
    expect(screen.getByLabelText('Projected Monthly Pension')).toBeInTheDocument();
    expect(screen.getByLabelText('Creditable Years')).toBeInTheDocument();
    expect(screen.getByLabelText('Creditable Months')).toBeInTheDocument();
  });

  it('renders FEGLI toggle', () => {
    renderForm();
    expect(screen.getByLabelText('Basic FEGLI')).toBeInTheDocument();
  });

  it('shows FEGLI options when Basic is toggled on', async () => {
    renderForm();
    const toggle = screen.getByLabelText('Basic FEGLI');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Basic Coverage Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Monthly Premium')).toBeInTheDocument();
    expect(screen.getByLabelText('Option A')).toBeInTheDocument();
    expect(screen.getByLabelText('Option B')).toBeInTheDocument();
    expect(screen.getByLabelText('Option C')).toBeInTheDocument();
  });

  it('renders FEHB fields', () => {
    renderForm();
    expect(screen.getByLabelText('Plan Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Coverage Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly Premium')).toBeInTheDocument();
    expect(screen.getByLabelText('Employer Pays')).toBeInTheDocument();
  });

  it('renders FEDVIP and FLTCIP toggles', () => {
    renderForm();
    expect(screen.getByLabelText('FEDVIP Dental')).toBeInTheDocument();
    expect(screen.getByLabelText('FEDVIP Vision')).toBeInTheDocument();
    expect(screen.getByLabelText('FLTCIP (Long-Term Care)')).toBeInTheDocument();
  });

  it('renders FSA and HSA toggles', () => {
    renderForm();
    expect(screen.getByLabelText('Flexible Spending Account (FSA)')).toBeInTheDocument();
    expect(screen.getByLabelText('Health Savings Account (HSA)')).toBeInTheDocument();
  });

  it('shows FSA election field when toggled on', () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Flexible Spending Account (FSA)'));
    expect(screen.getByLabelText('Annual Election')).toBeInTheDocument();
  });

  it('shows HSA balance fields when toggled on', () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Health Savings Account (HSA)'));
    expect(screen.getByLabelText('Balance')).toBeInTheDocument();
    expect(screen.getByLabelText('Annual Contribution')).toBeInTheDocument();
  });

  it('renders PDF upload buttons', () => {
    renderForm();
    expect(screen.getByText('Upload SF-50')).toBeInTheDocument();
    expect(screen.getByText('Upload LES')).toBeInTheDocument();
    expect(screen.getByText(/Quick Import from Documents/)).toBeInTheDocument();
  });

  it('shows FERS Supplement fields when toggled on', () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('FERS Supplement Eligible'));
    expect(screen.getByLabelText('Est. Monthly Supplement')).toBeInTheDocument();
  });

  it('shows FEDVIP dental premium when dental toggled on', () => {
    renderForm();
    const dentalToggle = screen.getByLabelText('FEDVIP Dental');
    fireEvent.click(dentalToggle);
    // Should show monthly premium field under dental
    const premiumFields = screen.getAllByLabelText('Monthly Premium');
    // At minimum: FEHB Monthly Premium + Dental = 2 (FEHB is always shown)
    expect(premiumFields.length).toBeGreaterThanOrEqual(2);
  });

  it('allows typing in High-3 salary field', () => {
    renderForm();
    const input = screen.getByLabelText('High-3 Average Salary') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '125000' } });
    expect(input.value).toBe('125000');
  });
});
