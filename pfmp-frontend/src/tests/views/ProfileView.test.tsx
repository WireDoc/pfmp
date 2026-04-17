import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock devUserState — must provide both hook and bare function (used by apiDashboardService)
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

// Mock userService
const mockUserGetById = vi.fn();
const mockUserUpdate = vi.fn();
vi.mock('../../services/api', () => ({
  userService: {
    getById: (...args: unknown[]) => mockUserGetById(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
  },
}));

// Mock financialProfileApi
const mockFetchHousehold = vi.fn();
const mockUpsertHousehold = vi.fn();
const mockFetchRiskGoals = vi.fn();
const mockUpsertRiskGoals = vi.fn();
const mockFetchIncome = vi.fn();
const mockUpsertIncome = vi.fn();
const mockFetchTax = vi.fn();
const mockUpsertTax = vi.fn();
const mockFetchExpenses = vi.fn();
const mockUpsertExpenses = vi.fn();
const mockFetchInsurance = vi.fn();
const mockUpsertInsurance = vi.fn();
const mockFetchObligations = vi.fn();
const mockUpsertObligations = vi.fn();
const mockFetchBenefits = vi.fn();
const mockUpsertBenefits = vi.fn();

vi.mock('../../services/financialProfileApi', () => ({
  fetchHouseholdProfile: (...args: unknown[]) => mockFetchHousehold(...args),
  upsertHouseholdProfile: (...args: unknown[]) => mockUpsertHousehold(...args),
  fetchRiskGoalsProfile: (...args: unknown[]) => mockFetchRiskGoals(...args),
  upsertRiskGoalsProfile: (...args: unknown[]) => mockUpsertRiskGoals(...args),
  fetchIncomeStreamsProfile: (...args: unknown[]) => mockFetchIncome(...args),
  upsertIncomeStreamsProfile: (...args: unknown[]) => mockUpsertIncome(...args),
  fetchTaxProfile: (...args: unknown[]) => mockFetchTax(...args),
  upsertTaxProfile: (...args: unknown[]) => mockUpsertTax(...args),
  fetchExpensesProfile: (...args: unknown[]) => mockFetchExpenses(...args),
  upsertExpensesProfile: (...args: unknown[]) => mockUpsertExpenses(...args),
  fetchInsurancePoliciesProfile: (...args: unknown[]) => mockFetchInsurance(...args),
  upsertInsurancePoliciesProfile: (...args: unknown[]) => mockUpsertInsurance(...args),
  fetchLongTermObligationsProfile: (...args: unknown[]) => mockFetchObligations(...args),
  upsertLongTermObligationsProfile: (...args: unknown[]) => mockUpsertObligations(...args),
  fetchBenefitsProfile: (...args: unknown[]) => mockFetchBenefits(...args),
  upsertBenefitsProfile: (...args: unknown[]) => mockUpsertBenefits(...args),
}));

const mockFetchFederalBenefits = vi.fn();
const mockSaveFederalBenefits = vi.fn();
const mockApplyLes = vi.fn();

vi.mock('../../services/federalBenefitsApi', () => ({
  fetchFederalBenefits: (...args: unknown[]) => mockFetchFederalBenefits(...args),
  saveFederalBenefits: (...args: unknown[]) => mockSaveFederalBenefits(...args),
  applyLes: (...args: unknown[]) => mockApplyLes(...args),
}));

import { ProfileView } from '../../views/dashboard/ProfileView';

const mockUser = {
  data: {
    userId: 20,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    dateOfBirth: '1982-05-01',
    governmentAgency: 'VA',
    payGrade: 'GS-13',
    retirementSystem: 'FERS',
    serviceComputationDate: '2010-01-15',
    vaDisabilityPercentage: 30,
    vaDisabilityMonthlyAmount: 500,
    includeVaDisabilityInProjections: false,
    householdNotes: 'Test notes',
  },
};

const mockHousehold = { maritalStatus: 'Single', dependentCount: 0, employmentType: 'Federal' };
const mockRiskGoals = { riskTolerance: 6, targetRetirementDate: '2040-01-01', passiveIncomeGoal: 5000 };
const mockIncome = { streams: [{ name: 'Salary', incomeType: 'salary', monthlyAmount: 8000, isGuaranteed: true, isActive: true }] };
const mockTax = { filingStatus: 'single', stateOfResidence: 'VA', marginalRatePercent: 22, effectiveRatePercent: 15 };
const mockExpenses = { expenses: [{ category: 'Housing', monthlyAmount: 1500, isEstimated: false, notes: '' }] };
const mockInsurance = { policies: [] };
const mockObligations = { obligations: [] };
const mockBenefits = { benefits: [] };

function renderProfileView(initialRoute = '/dashboard/profile') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ProfileView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserGetById.mockResolvedValue(mockUser);
  mockFetchHousehold.mockResolvedValue(mockHousehold);
  mockFetchRiskGoals.mockResolvedValue(mockRiskGoals);
  mockFetchIncome.mockResolvedValue(mockIncome);
  mockFetchTax.mockResolvedValue(mockTax);
  mockFetchExpenses.mockResolvedValue(mockExpenses);
  mockFetchInsurance.mockResolvedValue(mockInsurance);
  mockFetchObligations.mockResolvedValue(mockObligations);
  mockFetchBenefits.mockResolvedValue(mockBenefits);
  mockFetchFederalBenefits.mockResolvedValue(null);
  mockSaveFederalBenefits.mockResolvedValue({});
  mockUpsertHousehold.mockResolvedValue({});
  mockUpsertRiskGoals.mockResolvedValue({});
  mockUserUpdate.mockResolvedValue({});
});

describe('ProfileView', () => {
  it('renders the page heading', async () => {
    renderProfileView();
    expect(await screen.findByText('Financial Profile')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    // Delay the API so skeleton is visible
    mockUserGetById.mockReturnValue(new Promise(() => {}));
    renderProfileView();
    // MUI Skeleton elements should be present
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders all 9 tabs', async () => {
    renderProfileView();
    await screen.findByText('Financial Profile');
    const tabs = ['Household', 'Risk & Goals', 'Income', 'Tax', 'Expenses', 'Insurance', 'Obligations', 'Benefits', 'Federal Benefits'];
    for (const tab of tabs) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
  });

  it('loads household data on mount', async () => {
    renderProfileView();
    await waitFor(() => {
      expect(mockUserGetById).toHaveBeenCalledWith(20);
      expect(mockFetchHousehold).toHaveBeenCalledWith(20);
    });
  });

  it('displays household fields after loading', async () => {
    renderProfileView();
    await waitFor(() => {
      expect(mockFetchHousehold).toHaveBeenCalled();
    });
    // The preferred name field should have user's name
    const nameField = await screen.findByLabelText('Preferred Name');
    expect(nameField).toBeInTheDocument();
  });

  it('can switch to Risk & Goals tab', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    const riskTab = screen.getByRole('tab', { name: 'Risk & Goals' });
    await user.click(riskTab);

    await waitFor(() => {
      expect(screen.getByLabelText('Risk Tolerance (1-10)')).toBeInTheDocument();
    });
  });

  it('saves household data when clicking save', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    // Wait for load to complete
    await waitFor(() => expect(mockFetchHousehold).toHaveBeenCalled());

    // Find and click the first Save button (Household tab)
    const saveButtons = await screen.findAllByRole('button', { name: /save/i });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockUpsertHousehold).toHaveBeenCalled();
    });
  });

  it('shows success snackbar after saving', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await waitFor(() => expect(mockFetchHousehold).toHaveBeenCalled());

    const saveButtons = await screen.findAllByRole('button', { name: /save/i });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it('can switch to Income tab and see income streams', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    const incomeTab = screen.getByRole('tab', { name: 'Income' });
    await user.click(incomeTab);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
    });
  });

  it('can switch to Tax tab', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    const taxTab = screen.getByRole('tab', { name: 'Tax' });
    await user.click(taxTab);

    await waitFor(() => {
      expect(screen.getByLabelText('Marginal Rate %')).toBeInTheDocument();
    });
  });

  it('can switch to Expenses tab and see expense entries', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    const expTab = screen.getByRole('tab', { name: 'Expenses' });
    await user.click(expTab);

    await waitFor(() => {
      expect(screen.getByText(/Total:.*\$1,500\/mo/)).toBeInTheDocument();
    });
  });

  it('opens the correct tab when ?tab= query param is provided', async () => {
    renderProfileView('/dashboard/profile?tab=income');
    await screen.findByText('Financial Profile');

    // Income tab should be active and content visible
    await waitFor(() => {
      expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
    });
  });

  it('can switch to Federal Benefits tab and see form', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    const fedTab = screen.getByRole('tab', { name: 'Federal Benefits' });
    await user.click(fedTab);

    await waitFor(() => {
      expect(screen.getByText('Federal Benefits Profile')).toBeInTheDocument();
    });
    expect(screen.getByText('Federal Employment')).toBeInTheDocument();
    expect(screen.getByText('FERS Pension')).toBeInTheDocument();
    expect(screen.getByText('FEGLI (Life Insurance)')).toBeInTheDocument();
    expect(screen.getByText('FEHB (Health Insurance)')).toBeInTheDocument();
  });

  it('loads federal benefits data and populates fields', async () => {
    mockFetchFederalBenefits.mockResolvedValue({
      federalBenefitsProfileId: 1,
      userId: 20,
      high3AverageSalary: 120000,
      hasFegliBasic: true,
      fegliBasicCoverage: 125000,
      hasFegliOptionA: false,
      hasFegliOptionB: false,
      hasFegliOptionC: false,
      fehbEnrollmentCode: '104',
      fehbPlanName: 'BCBS Standard',
      fehbCoverageLevel: 'Self and Family',
      fehbMonthlyPremium: 450,
      hasFedvipDental: false,
      hasFedvipVision: false,
      hasFltcip: false,
      hasFsa: false,
      hasHsa: false,
      annualLeaveBalance: null,
      sickLeaveBalance: null,
      federalTaxWithholdingBiweekly: null,
      stateTaxWithholdingBiweekly: null,
      oasdiDeductionBiweekly: null,
      medicareDeductionBiweekly: null,
    });
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');

    await user.click(screen.getByRole('tab', { name: 'Federal Benefits' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('120000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('BCBS Standard')).toBeInTheDocument();
    });
  });

  it('saves federal benefits when clicking save', async () => {
    const user = userEvent.setup();
    renderProfileView();
    await screen.findByText('Financial Profile');
    await user.click(screen.getByRole('tab', { name: 'Federal Benefits' }));

    await waitFor(() => expect(screen.getByText('Federal Benefits Profile')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /save federal benefits/i }));

    await waitFor(() => {
      expect(mockSaveFederalBenefits).toHaveBeenCalledWith(20, expect.any(Object));
    });
  });

  it('opens Federal Benefits tab via query param', async () => {
    renderProfileView('/dashboard/profile?tab=federal-benefits');
    await screen.findByText('Financial Profile');

    await waitFor(() => {
      expect(screen.getByText('Federal Benefits Profile')).toBeInTheDocument();
    });
  });

  it('defaults to Household tab when no tab param', async () => {
    renderProfileView('/dashboard/profile');
    await screen.findByText('Financial Profile');

    // Household fields should be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Name')).toBeInTheDocument();
    });
    // Risk & Goals fields should NOT be visible (hidden tab)
    expect(screen.queryByLabelText('Risk Tolerance (1-10)')).not.toBeInTheDocument();
  });

  it('ignores invalid tab param and defaults to first tab', async () => {
    renderProfileView('/dashboard/profile?tab=invalid');
    await screen.findByText('Financial Profile');

    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Name')).toBeInTheDocument();
    });
  });

  it('shows error toast when profile data fails to load', async () => {
    mockUserGetById.mockRejectedValue(new Error('Network error'));
    renderProfileView();

    await waitFor(() => {
      expect(screen.getByText('Failed to load profile data')).toBeInTheDocument();
    });
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    mockUpsertHousehold.mockRejectedValue(new Error('Save failed'));
    renderProfileView();
    await waitFor(() => expect(mockFetchHousehold).toHaveBeenCalled());

    const saveButtons = await screen.findAllByRole('button', { name: /save/i });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Failed to save/i)).toBeInTheDocument();
    });
  });
});
