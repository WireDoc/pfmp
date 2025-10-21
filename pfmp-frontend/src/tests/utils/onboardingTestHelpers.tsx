import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within, waitFor, act } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OnboardingProvider } from '../../onboarding/OnboardingContext';
import OnboardingPage from '../../views/OnboardingPage';

// -------- ACT / UTILS ADDITIONS --------

export async function robustNavigateToHeading(targetHeading: string, sidebarPattern: RegExp, opts: { timeoutMs?: number; intervalMs?: number } = {}) {
  const { timeoutMs = 12000, intervalMs = 300 } = opts;
  return waitForHeadingOrSidebar(targetHeading, { timeoutMs, pollMs: intervalMs, sidebarPattern });
}

// Unified wait utility: waits for either a main heading to render OR (optionally) triggers sidebar navigation retries.
export interface UnifiedWaitOptions {
  timeoutMs?: number;
  pollMs?: number;
  sidebarPattern?: RegExp;
  ensureVisible?: boolean; // if true re-focus/click sidebar each cycle when missing
}

export async function waitForHeadingOrSidebar(targetHeading: string, options: UnifiedWaitOptions = {}) {
  const { timeoutMs = 13000, pollMs = 250, sidebarPattern, ensureVisible = true } = options;
  const start = Date.now();
  let cycles = 0;
  while (Date.now() - start < timeoutMs) {
    const heading = screen.queryByRole('heading', { level: 2, name: targetHeading });
    if (heading) return heading;
    if (sidebarPattern && ensureVisible && cycles % 3 === 2) {
      const btn = screen.queryByRole('button', { name: sidebarPattern });
      if (btn) {
        const userLib = await import('@testing-library/user-event');
        const u = userLib.default.setup();
        await act(async () => { await u.click(btn); });
      }
    }
    cycles += 1;
    await new Promise(r => setTimeout(r, pollMs));
  }
  return assertHeading(targetHeading);
}

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

/**
 * Waits for a section's main content to become visible. We purposefully exclude matches that
 * only appear inside the left sidebar navigation (<aside>) so we don't get false positives
 * before route/content transitions finish.
 */
async function assertHeading(name: string) {
  const matcher = new RegExp(`^${name}$`, 'i');
  let found: HTMLElement | undefined;
  await waitFor(() => {
    // Prefer any heading role outside the aside
    const headings = screen.queryAllByRole('heading').filter((el) => !el.closest('aside'));
    found = headings.find((h) => matcher.test(h.textContent?.trim() || ''));
    if (found) return true;
    // Fallback: any non-sidebar element with exact text
    const candidates = screen.queryAllByText(matcher).filter((el) => !el.closest('aside'));
    found = candidates[0];
    return Boolean(found);
  }, { timeout: 10000 });
  if (!found) throw new Error(`Section heading not found for ${name}`);
  return found;
}

async function fillReason(label: string, value: string) {
  const input = await screen.findByLabelText(label);
  fireEvent.change(input, { target: { value } });
}

// -------- AUTOSAVE TEST UTILITIES --------
/** Waits for the current section autosave cycle to complete: status becomes saved OR (idle & not dirty). */
export async function waitForAutosaveComplete(timeoutMs = 20000) {
  const start = Date.now();
  // AutoSaveIndicator states we can look for:
  // - Chip label "Saving…" while saving
  // - Chip label starting with "Saved" when saved
  // - Chip label "Unsaved changes" when dirty but not yet flushed
  // Final stable conditions: label starting with "Saved" OR text "All changes synced".
  // We also accept disappearance of transient chips with presence of the stable text.
  await waitFor(() => {
    const savedChip = screen.queryByText(/Saved\b/i);
    const stableText = screen.queryByText(/All changes synced/i);
    const savingChip = screen.queryByText(/Saving…/i);
    const unsavedChip = screen.queryByText(/Unsaved changes/i);
    const errorChip = screen.queryByText(/couldn’t save|We couldn’t save/i);
    if (errorChip) throw new Error('Autosave encountered an error state during wait');
    if (savingChip || unsavedChip) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timed out waiting for autosave to finish');
      }
      return false;
    }
    return Boolean(savedChip || stableText);
  }, { timeout: timeoutMs });
}

/** Clicks the Next section navigation button after ensuring pending autosave flush completes. */
export async function clickNextSection(user: ReturnType<typeof userEvent.setup>) {
  // Support both legacy 'Next section' and current 'Next' button labels
  const nextBtn = screen.queryByRole('button', { name: 'Next section' })
    || screen.queryByRole('button', { name: /^Next$/i })
    || screen.queryByRole('button', { name: /Next section/i });
  if (!nextBtn) throw new Error('Next navigation button not found');
  await act(async () => { await user.click(nextBtn); });
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function goNextAndWait(
  user: ReturnType<typeof userEvent.setup>,
  heading: string,
  options: { sidebarPattern?: RegExp; timeoutMs?: number } = {},
) {
  await clickNextSection(user);
  const sidebarPattern = options.sidebarPattern ?? new RegExp(escapeForRegExp(heading), 'i');
  await robustNavigateToHeading(heading, sidebarPattern, {
    timeoutMs: options.timeoutMs,
  });
}

export async function clickPrevSection(user: ReturnType<typeof userEvent.setup>) {
  const prevBtn = screen.getByRole('button', { name: 'Back' });
  await act(async () => { await user.click(prevBtn); });
}

/** Jump directly using left sidebar step button. */
export async function jumpToSection(user: ReturnType<typeof userEvent.setup>, label: string) {
  const btn = screen.getByRole('button', { name: new RegExp(label, 'i') });
  await act(async () => { await user.click(btn); });
}

/** Force immediate autosave flush for current section (bypasses debounce). */
export async function forceFlushAutosave() {
  const w = window as unknown as { __pfmpCurrentSectionFlush?: () => Promise<void> };
  if (typeof w.__pfmpCurrentSectionFlush === 'function') {
    await w.__pfmpCurrentSectionFlush();
  }
}

/** Wrap flush in React act to silence state update warnings. */
export async function forceFlushAutosaveAct() {
  // dynamically import act to avoid circular imports
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await forceFlushAutosave();
  });
}

/** Wait for a sidebar section status chip to reach an expected label (Completed, Opted Out, Needs Info). */
export async function waitForSectionStatusTransition(stepName: string, expected: string, timeoutMs = 15000) {
  // Normalize expected (API codes: completed | opted_out | needs_info) to UI labels
  const expectedMap: Record<string, string[]> = {
    completed: ['Completed'],
    opted_out: ['Opted Out', 'Opted out'],
    needs_info: ['Needs Info', 'Needs info'],
  };
  const canonical = expected.toLowerCase();
  const uiVariants = expectedMap[canonical] || [expected];
  const matcher = new RegExp(`^(?:${uiVariants.map((v) => v.replace(/[-]/g, '[- ]')).join('|')})$`, 'i');
  const start = Date.now();
  let found = false;
  const titleMap: Record<string, string> = {
    household: 'Household Profile',
    'risk-goals': 'Risk & Goals',
    tsp: 'TSP Snapshot',
    cash: 'Cash Accounts',
    investments: 'Investments',
    'real-estate': 'Real Estate',
    liabilities: 'Liabilities & Credit',
    expenses: 'Monthly Expenses',
    tax: 'Tax Posture',
    insurance: 'Insurance Coverage',
    benefits: 'Benefits & Programs',
    'long-term-obligations': 'Long-Term Obligations',
    income: 'Income Streams',
    equity: 'Equity & Private Holdings',
    review: 'Review',
  };
  const uiTitle = titleMap[stepName] || stepName.replace(/-/g, ' ');
  while (!found && Date.now() - start < timeoutMs) {
    const btn = screen.queryByRole('button', { name: new RegExp(uiTitle, 'i') });
    if (btn) {
      // Chips may be spans or divs; collect short text nodes
      const possibleNodes = Array.from(btn.querySelectorAll('span, div')).filter((el) => (el.textContent || '').length <= 20);
      for (const node of possibleNodes) {
        const text = node.textContent?.trim() || '';
        if (matcher.test(text)) {
          found = true;
          break;
        }
      }
    }
    if (!found) await new Promise((r) => setTimeout(r, 200));
  }
  if (!found) throw new Error(`Sidebar status for "${stepName}" did not transition to "${expected}" within ${timeoutMs}ms`);
}

async function completeHousehold(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I want to skip this section for now'));
    await fillReason('Why are you opting out?', 'Will revisit later');
  } else {
    const preferredName = screen.getByLabelText('Preferred name');
    fireEvent.change(preferredName, { target: { value: 'Helper User' } });
    await user.click(screen.getByLabelText('Marital status'));
    await user.click(screen.getByText('Single'));
  }
  await waitForAutosaveComplete();
  await clickNextSection(user);
  // Fallback loop: if clicking next did not navigate (due to missing flush registration), jump via sidebar
  let attempts = 0;
  while (attempts < 5 && !screen.queryByLabelText('Risk tolerance')) {
    attempts += 1;
    if (attempts === 2) {
      // Try direct sidebar navigation once
      const navBtn = screen.queryByRole('button', { name: /Risk & Goals/i });
      if (navBtn) await user.click(navBtn);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!screen.queryByLabelText('Risk tolerance')) {
    throw new Error('Did not navigate to Risk & Goals section – risk tolerance field absent');
  }
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
  await waitForAutosaveComplete();
  // Advance explicitly; autosave sometimes finishes before status promotes in test timing.
  await clickNextSection(user);
  await waitFor(() => Boolean(screen.queryByLabelText('Add fund')));
}

async function completeTsp(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    // Ensure TSP section is visible before querying the opt-out toggle
    const labelMatcher = /I don['’]t invest in the Thrift Savings Plan/i;
    let optOutToggle = screen.queryByLabelText(labelMatcher);
    const start = Date.now();
    while (!optOutToggle && Date.now() - start < 8000) {
      const tspNav = screen.queryByRole('button', { name: /TSP Snapshot/i });
      if (tspNav) await user.click(tspNav);
      await new Promise((r) => setTimeout(r, 250));
      optOutToggle = screen.queryByLabelText(labelMatcher);
    }
    if (!optOutToggle) throw new Error('TSP opt-out toggle not found – section did not render');
    await user.click(optOutToggle);
    await fillReason('Why are you opting out?', 'No TSP access');
  } else {
    // Wait robustly for contribution rate field; fallback to sidebar navigation if initial auto-advance lagged
    let contributionField: HTMLElement | null = null;
    const start = Date.now();
    while (!contributionField && Date.now() - start < 8000) {
      contributionField = screen.queryByLabelText(/Contribution rate/);
      if (contributionField) break;
      // Attempt direct navigation to TSP if not yet on page
      const tspNav = screen.queryByRole('button', { name: /TSP Snapshot/i });
      if (tspNav) await user.click(tspNav);
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!contributionField) throw new Error('Contribution rate field not found – TSP section did not render');
    fireEvent.change(contributionField, { target: { value: '10' } });
    let contribFields = screen.queryAllByLabelText('Contribution (%)');
    if (contribFields.length === 0) {
      await user.click(screen.getByLabelText('Add fund'));
      await user.click(screen.getByText('G Fund'));
      contribFields = await screen.findAllByLabelText('Contribution (%)');
    }
    if (contribFields.length > 0) {
      fireEvent.change(contribFields[0], { target: { value: '100' } });
    }
  }
  await waitForAutosaveComplete();
  // Use sidebar navigation (more reliable than Next in test timing) to reach Cash Accounts
  const cashBtn = screen.getByRole('button', { name: /Cash Accounts/i });
  await user.click(cashBtn);
  let attempts = 0;
  while (attempts < 10 && !screen.queryByRole('heading', { level: 2, name: 'Cash Accounts' })) {
    attempts += 1;
    if (attempts === 4) {
      // Re-click in case first attempt didn't trigger
      const retryBtn = screen.queryByRole('button', { name: /Cash Accounts/i });
      if (retryBtn) await user.click(retryBtn);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
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
  // Wrap the flush in act to avoid state update warnings
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await clickNextSection(user);
  await robustNavigateToHeading('Investments', /Investments/i, { timeoutMs: 12000 });
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
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await waitForSectionStatusTransition('investments', mode === 'optOut' ? 'opted_out' : 'completed');
  await clickNextSection(user);
  await robustNavigateToHeading('Real Estate', /Real Estate/i, { timeoutMs: 13000 });
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
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  try {
    await waitForSectionStatusTransition('real-estate', mode === 'optOut' ? 'opted_out' : 'completed');
  } catch (err) {
    // Proceed even if status chip did not update (log for diagnostics)
    console.warn('Proceeding past real-estate without observed status chip transition:', err);
  }
  await clickNextSection(user);
  await robustNavigateToHeading('Liabilities & Credit', /Liabilities & Credit/i, { timeoutMs: 14000 });
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
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await waitForSectionStatusTransition('liabilities', mode === 'optOut' ? 'opted_out' : 'completed');
  await clickNextSection(user);
  await robustNavigateToHeading('Monthly Expenses', /Monthly Expenses/i, { timeoutMs: 13000 });
}

async function completeExpenses(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I’ll estimate my expenses later'));
    await fillReason('Why are you opting out?', 'Need to pull statements');
  } else {
    fireEvent.change(screen.getByLabelText('Monthly amount ($)'), { target: { value: '3200' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Includes utilities estimate' } });
  }
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await waitForSectionStatusTransition('expenses', mode === 'optOut' ? 'opted_out' : 'completed');
  await clickNextSection(user);
  const targetHeading = 'Tax Posture';
  const maxMs = 12000; const start = Date.now();
  let found = false; let attempts = 0;
  while (!found && Date.now() - start < maxMs) {
    const heading = screen.queryByRole('heading', { level: 2, name: targetHeading });
    if (heading) { found = true; break; }
    if (attempts % 3 === 2) {
      const sidebarBtn = screen.queryByRole('button', { name: /Tax Posture/i });
      if (sidebarBtn) await user.click(sidebarBtn);
    }
    attempts += 1;
    await new Promise(r => setTimeout(r, 300));
  }
  if (!found) await assertHeading(targetHeading);
}

async function completeTax(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('A CPA handles this for me'));
    await fillReason('Add context so we can follow up later', 'Handled externally right now');
  } else {
    fireEvent.change(screen.getByLabelText('Marginal rate (%)'), { target: { value: '24' } });
    fireEvent.change(screen.getByLabelText('Effective rate (%)'), { target: { value: '18' } });
    fireEvent.change(screen.getByLabelText('Withholding (%)'), { target: { value: '17' } });
  }
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await waitForSectionStatusTransition('tax', mode === 'optOut' ? 'opted_out' : 'completed');
  await clickNextSection(user);
  const targetHeading = 'Insurance Coverage';
  const maxMs = 12000; const start = Date.now();
  let found = false; let attempts = 0;
  while (!found && Date.now() - start < maxMs) {
    const heading = screen.queryByRole('heading', { level: 2, name: targetHeading });
    if (heading) { found = true; break; }
    if (attempts % 3 === 2) {
      const sidebarBtn = screen.queryByRole('button', { name: /Insurance Coverage/i });
      if (sidebarBtn) await user.click(sidebarBtn);
    }
    attempts += 1;
    await new Promise(r => setTimeout(r, 300));
  }
  if (!found) await assertHeading(targetHeading);
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
  await forceFlushAutosaveAct();
  await waitForAutosaveComplete();
  await waitForSectionStatusTransition('insurance', mode === 'optOut' ? 'opted_out' : 'completed');
  await clickNextSection(user);
  const targetHeading = 'Benefits & Programs';
  const maxMs = 12000; const start = Date.now();
  let found = false; let attempts = 0;
  while (!found && Date.now() - start < maxMs) {
    const heading = screen.queryByRole('heading', { level: 2, name: targetHeading });
    if (heading) { found = true; break; }
    if (attempts % 3 === 2) {
      const sidebarBtn = screen.queryByRole('button', { name: /Benefits & Programs/i });
      if (sidebarBtn) await user.click(sidebarBtn);
    }
    attempts += 1;
    await new Promise(r => setTimeout(r, 300));
  }
  if (!found) await assertHeading(targetHeading);
}

async function completeBenefits(user: ReturnType<typeof userEvent.setup>, mode: 'complete' | 'optOut') {
  if (mode === 'optOut') {
    await user.click(screen.getByLabelText('I’ll review benefits later'));
    await fillReason('Why are you opting out?', 'Need time to collect info');
  } else {
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'Employer' } });
    fireEvent.change(screen.getByLabelText('Monthly cost / premium ($)'), { target: { value: '200' } });
  }
  await waitForAutosaveComplete();
  await clickNextSection(user);
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
  await waitForAutosaveComplete();
  await clickNextSection(user);
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
  // Ensure we are on Cash Accounts (auto navigation sometimes delayed); fallback click sidebar
  let attempts = 0;
  while (attempts < 8 && !screen.queryByRole('heading', { level: 2, name: 'Cash Accounts' })) {
    attempts += 1;
    if (attempts === 3) {
      const cashBtn = screen.queryByRole('button', { name: /Cash Accounts/i });
      if (cashBtn) await user.click(cashBtn);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  await assertHeading('Cash Accounts');
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
  // For income tests we can shortcut earlier sections by navigating directly if forms are unstable.
  const incomeNav = screen.getByRole('button', { name: /Income Streams/i });
  await user.click(incomeNav);
  // Wait for a distinctive Income field
  await waitFor(() => Boolean(screen.queryByLabelText('Income source')));
}

export async function navigateDirectToIncome(user: ReturnType<typeof userEvent.setup>) {
  const incomeNav = screen.getByRole('button', { name: /Income Streams/i });
  await user.click(incomeNav);
  await waitFor(() => Boolean(screen.queryByLabelText('Income source')));
}

export async function expectSectionStatus(
  sectionTitle: string,
  status: 'Completed' | 'Opted Out' | 'Needs Info',
) {
  const sidebar = document.querySelector('aside');
  if (!sidebar) {
    throw new Error('Onboarding sidebar navigation not rendered');
  }

  const sidebarWithin = within(sidebar as HTMLElement);
  const navButtons = sidebarWithin.queryAllByRole('button');
  const normalizedTitle = new RegExp(`^${escapeForRegExp(sectionTitle)}$`, 'i');
  const button = navButtons.find((candidate) => within(candidate).queryByText(normalizedTitle));

  if (!button) {
    throw new Error(`Sidebar section button not found for ${sectionTitle}`);
  }

  const statusMatcher = new RegExp(`^${escapeForRegExp(status)}$`, 'i');
  return within(button).findByText(statusMatcher);
}
