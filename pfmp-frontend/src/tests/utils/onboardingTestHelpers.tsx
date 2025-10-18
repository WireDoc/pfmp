import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OnboardingProvider } from '../../onboarding/OnboardingContext';
import OnboardingPage from '../../views/OnboardingPage';

type OnboardingProviderBaseProps = Omit<ComponentProps<typeof OnboardingProvider>, 'children'>;

export interface RenderOnboardingPageOptions extends Partial<OnboardingProviderBaseProps> {
  /** Override the initial locations pushed into the router history. */
  initialEntries?: string[];
}

const defaultProviderProps: Pick<OnboardingProviderBaseProps, 'skipAutoHydrate' | 'userId'> = {
  skipAutoHydrate: true,
  userId: 1,
};

/**
 * Renders the onboarding workflow inside a MemoryRouter and provider so `useNavigate`
 * calls function the same way they do in the app.
 */
export function renderOnboardingPageForTest(options?: RenderOnboardingPageOptions): RenderResult {
  const { initialEntries = ['/onboarding'], ...providerOverrides } = options ?? {};
  const providerProps: OnboardingProviderBaseProps = {
    ...defaultProviderProps,
    ...providerOverrides,
  };

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div data-testid="onboarding-test-dashboard" />} />
        <Route
          path="/onboarding"
          element={
            <OnboardingProvider {...providerProps}>
              <OnboardingPage />
            </OnboardingProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

export interface AdvanceOptions {
  household?: 'complete' | 'optOut';
  riskGoals?: 'complete' | 'optOut';
  tsp?: 'complete' | 'optOut';
  cash?: 'complete' | 'optOut';
  investments?: 'complete' | 'optOut';
  realEstate?: 'complete' | 'optOut';
  liabilities?: 'complete' | 'optOut';
  expenses?: 'complete' | 'optOut';
  tax?: 'complete' | 'optOut';
  longTermObligations?: 'complete' | 'optOut';
  insurance?: 'complete' | 'optOut';
  benefits?: 'complete' | 'optOut';
}

const defaultOptions: Required<AdvanceOptions> = {
  household: 'optOut',
  riskGoals: 'complete',
  tsp: 'optOut',
  cash: 'optOut',
  investments: 'optOut',
  realEstate: 'optOut',
  liabilities: 'optOut',
  expenses: 'optOut',
  tax: 'optOut',
  longTermObligations: 'optOut',
  insurance: 'optOut',
  benefits: 'optOut',
};

function assertHeading(name: string) {
  return screen.findByRole('heading', { level: 2, name });
}

async function fillReason(label: string, value: string) {
  const input = await screen.findByLabelText(label);
  fireEvent.change(input, { target: { value } });
}

async function completeHousehold(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I want to skip this section for now'));
    await fillReason('Why are you opting out?', 'Will revisit later');
  } else {
    fireEvent.change(screen.getByLabelText('Preferred name'), { target: { value: 'Helper User' } });
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Single'));
  }

  await user.click(screen.getByTestId('household-submit'));
  await assertHeading('Risk & Goals');
}

async function completeRiskGoals(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I want to skip this section for now'));
    await fillReason('Why are you opting out?', 'Need to consult advisor');
  } else {
    await user.click(screen.getByLabelText('Risk tolerance'));
    await user.click(screen.getByText('3 · Balanced'));
    fireEvent.change(screen.getByLabelText('Target retirement date'), { target: { value: '2030-01-01' } });
    fireEvent.change(screen.getByLabelText('Passive income goal (monthly)'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('Liquidity buffer (months)'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Emergency fund target ($)'), { target: { value: '20000' } });
  }

  await user.click(screen.getByTestId('risk-goals-submit'));
  await assertHeading('TSP Snapshot');
}

async function completeTsp(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I don’t invest in the Thrift Savings Plan'));
    await fillReason('Why are you opting out?', 'No TSP access');
  } else {
    fireEvent.change(screen.getByLabelText('Contribution rate (%)'), { target: { value: '10' } });
    // Ensure total contribution = 100% for validation by setting one fund to 100%.
    // With the compact UI, there may be no fund rows until the user adds one.
    let contribFields = screen.queryAllByLabelText('Contribution (%)');
    if (contribFields.length === 0) {
      // Add a default fund row via the dropdown
      await user.click(screen.getByLabelText('Add fund'));
      // Prefer a base fund for stability
      await user.click(screen.getByText('G Fund'));
      contribFields = await screen.findAllByLabelText('Contribution (%)');
    }
    if (contribFields.length > 0) {
      fireEvent.change(contribFields[0], { target: { value: '100' } });
    }
  }

  await user.click(screen.getByTestId('tsp-submit'));
  await assertHeading('Cash Accounts');
}

async function completeCash(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I don’t have additional cash accounts'));
    await fillReason('Why are you opting out?', 'Handled elsewhere');
  } else {
    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Primary checking' } });
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'Ally Bank' } });
    fireEvent.change(screen.getByLabelText('Account type'), { target: { value: 'checking' } });
    fireEvent.change(screen.getByLabelText('Balance ($)'), { target: { value: '15000' } });
  }

  await user.click(screen.getByTestId('cash-submit'));
  await assertHeading('Investments');
}

async function completeInvestments(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I don’t have non-TSP investment accounts'));
    await fillReason('Why are you opting out?', 'No assets outside TSP');
  } else {
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Test brokerage' } });
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'Vanguard' } });
    fireEvent.change(screen.getByLabelText('Current balance ($)'), { target: { value: '25000' } });
  }

  await user.click(screen.getByTestId('investments-submit'));
  await assertHeading('Real Estate');
}

async function completeRealEstate(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I don’t have real estate assets'));
    await fillReason('Why are you opting out?', 'Currently renting');
  } else {
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Primary home' } });
    fireEvent.change(screen.getByLabelText('Estimated value ($)'), { target: { value: '450000' } });
    fireEvent.change(screen.getByLabelText('Mortgage balance ($)'), { target: { value: '280000' } });
  }

  await user.click(screen.getByTestId('properties-submit'));
  await assertHeading('Liabilities & Credit');
}

async function completeLiabilities(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I’m not tracking debts right now'));
    await fillReason('Why are you opting out?', 'No debts');
  } else {
    fireEvent.change(screen.getByLabelText('Lender / account name'), { target: { value: 'Sample Card' } });
    fireEvent.change(screen.getByLabelText('Current balance ($)'), { target: { value: '4200' } });
    fireEvent.change(screen.getByLabelText('Minimum payment ($)'), { target: { value: '120' } });
  }

  await user.click(screen.getByTestId('liabilities-submit'));
  await assertHeading('Monthly Expenses');
}

async function completeExpenses(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I’ll estimate my expenses later'));
    await fillReason('Why are you opting out?', 'Need to pull statements');
  } else {
    fireEvent.change(screen.getByLabelText('Monthly amount ($)'), { target: { value: '3200' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Includes utilities estimate' } });
  }

  await user.click(screen.getByTestId('expenses-submit'));
  await assertHeading('Tax Posture');
}

async function completeTax(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('A CPA handles this for me'));
    await fillReason('Add context so we can follow up later', 'Working with CPA firm');
  } else {
    fireEvent.change(screen.getByLabelText('Marginal rate (%)'), { target: { value: '24' } });
    fireEvent.change(screen.getByLabelText('Effective rate (%)'), { target: { value: '18' } });
    fireEvent.change(screen.getByLabelText('Withholding (%)'), { target: { value: '20' } });
  }

  await user.click(screen.getByTestId('tax-submit'));
  await assertHeading('Insurance Coverage');
}

async function completeInsurance(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I don’t have insurance details to add'));
    await fillReason('Why are you opting out?', 'Will provide later');
  } else {
    fireEvent.change(screen.getByLabelText('Policy name or number'), { target: { value: 'Term Life 2040' } });
    fireEvent.change(screen.getByLabelText('Coverage amount ($)'), { target: { value: '750000' } });
    fireEvent.change(screen.getByLabelText('Premium amount ($)'), { target: { value: '65' } });
    await user.click(screen.getByLabelText('Coverage meets my needs'));
  }

  await user.click(screen.getByTestId('insurance-submit'));
  await assertHeading('Benefits & Programs');
}

async function completeBenefits(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I’ll review benefits later'));
    await fillReason('Why are you opting out?', 'Need time to collect info');
  } else {
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'Employer' } });
    fireEvent.change(screen.getByLabelText('Monthly cost / premium ($)'), { target: { value: '200' } });
  }

  await user.click(screen.getByTestId('benefits-submit'));
  await assertHeading('Long-Term Obligations');
}

async function completeLongTermObligations(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I don’t have long-term obligations right now'));
    await fillReason('Why are you opting out?', 'No major milestones');
  } else {
    fireEvent.change(screen.getByLabelText('Obligation name'), { target: { value: 'Home renovation' } });
    fireEvent.change(screen.getByLabelText('Estimated cost ($)'), { target: { value: '25000' } });
    fireEvent.change(screen.getByLabelText('Funds allocated ($)'), { target: { value: '5000' } });
    await user.click(screen.getByLabelText('Critical milestone'));
  }

  await user.click(screen.getByTestId('long-term-obligations-submit'));
  await assertHeading('Income Streams');
}

export async function advanceToCashSection(
  user: ReturnType<typeof userEvent.setup>,
  options: AdvanceOptions = {},
) {
  const merged = { ...defaultOptions, ...options };
  await completeHousehold(user, merged.household);
  await completeRiskGoals(user, merged.riskGoals);
  await completeTsp(user, merged.tsp);
}

/**
 * Utility to add a sequence of TSP funds by their visible labels via the compact UI dropdown.
 * Example: await addFundsByLabels(user, ['G Fund','F Fund','C Fund'])
 */
export async function addFundsByLabels(
  user: ReturnType<typeof userEvent.setup>,
  labels: string[],
) {
  const table = screen.queryByRole('table', { name: 'Selected TSP funds' });
  for (const label of labels) {
    // If the fund row is already present, skip adding
    if (table && within(table).queryByText(label)) continue;
    await user.click(screen.getByLabelText('Add fund'));
    const option = screen.queryByText(label);
    if (option) {
      await user.click(option);
    } else {
      // Option already selected earlier; close the menu by pressing Escape
      await user.keyboard('{Escape}');
    }
  }
}

export async function advanceToInvestmentsSection(
  user: ReturnType<typeof userEvent.setup>,
  options: AdvanceOptions = {},
) {
  const merged = { ...defaultOptions, ...options };
  await completeHousehold(user, merged.household);
  await completeRiskGoals(user, merged.riskGoals);
  await completeTsp(user, merged.tsp);
  await completeCash(user, merged.cash);
}

export async function advanceToRealEstateSection(
  user: ReturnType<typeof userEvent.setup>,
  options: AdvanceOptions = {},
) {
  const merged = { ...defaultOptions, ...options };
  await completeHousehold(user, merged.household);
  await completeRiskGoals(user, merged.riskGoals);
  await completeTsp(user, merged.tsp);
  await completeCash(user, merged.cash);
  await completeInvestments(user, merged.investments);
}

export async function advanceToInsuranceSection(
  user: ReturnType<typeof userEvent.setup>,
  options: AdvanceOptions = {},
) {
  const merged = { ...defaultOptions, ...options };
  await completeHousehold(user, merged.household);
  await completeRiskGoals(user, merged.riskGoals);
  await completeTsp(user, merged.tsp);
  await completeCash(user, merged.cash);
  await completeInvestments(user, merged.investments);
  await completeRealEstate(user, merged.realEstate);
  await completeLiabilities(user, merged.liabilities);
  await completeExpenses(user, merged.expenses);
  await completeTax(user, merged.tax);
}

export async function advanceToLongTermObligationsSection(
  user: ReturnType<typeof userEvent.setup>,
  options: AdvanceOptions = {},
) {
  const merged = { ...defaultOptions, ...options };
  await completeHousehold(user, merged.household);
  await completeRiskGoals(user, merged.riskGoals);
  await completeTsp(user, merged.tsp);
  await completeCash(user, merged.cash);
  await completeInvestments(user, merged.investments);
  await completeRealEstate(user, merged.realEstate);
  await completeLiabilities(user, merged.liabilities);
  await completeExpenses(user, merged.expenses);
  await completeTax(user, merged.tax);
  await completeInsurance(user, merged.insurance);
  await completeBenefits(user, merged.benefits);
}

export async function advanceToIncomeSection(
  user: ReturnType<typeof userEvent.setup>,
  options: AdvanceOptions = {},
) {
  const merged = { ...defaultOptions, ...options };
  await completeHousehold(user, merged.household);
  await completeRiskGoals(user, merged.riskGoals);
  await completeTsp(user, merged.tsp);
  await completeCash(user, merged.cash);
  await completeInvestments(user, merged.investments);
  await completeRealEstate(user, merged.realEstate);
  await completeLiabilities(user, merged.liabilities);
  await completeExpenses(user, merged.expenses);
  await completeTax(user, merged.tax);
  await completeInsurance(user, merged.insurance);
  await completeBenefits(user, merged.benefits);
  await completeLongTermObligations(user, merged.longTermObligations);
}

export async function expectSectionStatus(
  sectionTitle: string,
  status: 'Completed' | 'Opted Out' | 'Needs Info',
) {
  const matchingLabels = screen.getAllByText(sectionTitle);
  const row = matchingLabels
    .map((node) => node.closest('li'))
    .find((candidate): candidate is HTMLLIElement => Boolean(candidate));
  if (!row) throw new Error(`Section row not found for ${sectionTitle}`);
  const statusNode = await within(row as HTMLElement).findByText(status);
  return statusNode;
}
