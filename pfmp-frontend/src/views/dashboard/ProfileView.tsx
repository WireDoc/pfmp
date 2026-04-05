import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Skeleton,
  Stack,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDevUserId } from '../../dev/devUserState';
import { userService } from '../../services/api';
import type { User } from '../../services/api';
import {
  fetchHouseholdProfile,
  upsertHouseholdProfile,
  fetchRiskGoalsProfile,
  upsertRiskGoalsProfile,
  fetchIncomeStreamsProfile,
  upsertIncomeStreamsProfile,
  fetchTaxProfile,
  upsertTaxProfile,
  fetchExpensesProfile,
  upsertExpensesProfile,
  fetchInsurancePoliciesProfile,
  upsertInsurancePoliciesProfile,
  fetchLongTermObligationsProfile,
  upsertLongTermObligationsProfile,
  fetchBenefitsProfile,
  upsertBenefitsProfile,
} from '../../services/financialProfileApi';
import type {
  HouseholdProfilePayload,
  RiskGoalsProfilePayload,
  IncomeStreamPayload,
  TaxProfilePayload,
  ExpenseBudgetPayload,
  InsurancePolicyPayload,
  LongTermObligationPayload,
  BenefitCoveragePayload,
} from '../../services/financialProfileApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>
      {value === index && children}
    </Box>
  );
}

const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Domestic Partnership'];
const EMPLOYMENT_TYPES = ['Federal', 'Military', 'Contractor', 'Private'];
const RETIREMENT_SYSTEMS = ['FERS', 'CSRS', 'Military', 'None'];
const FILING_STATUSES = ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_widow'];
const EXPENSE_CATEGORIES = ['Housing', 'Utilities', 'Transportation', 'Food', 'Healthcare', 'Insurance', 'Childcare', 'Entertainment', 'Clothing', 'Personal', 'Subscriptions', 'Debt Payments', 'Charitable', 'Other'];
const INSURANCE_TYPES = ['Life', 'Disability', 'Health', 'Auto', 'Homeowners', 'Renters', 'Umbrella', 'Professional', 'Travel', 'Other'];
const PREMIUM_FREQUENCIES = ['Monthly', 'Quarterly', 'SemiAnnually', 'Annually'];
const OBLIGATION_TYPES = ['general', 'education', 'wedding', 'major_purchase', 'home_improvement', 'vehicle', 'medical', 'legal', 'travel', 'other'];
const INCOME_TYPES = ['salary', 'rental', 'pension', 'va_disability', 'social_security', 'business', 'annuity', 'dividends', 'other'];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

function fmt$(v: number | null | undefined): string {
  if (v == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export function ProfileView() {
  const userId = useDevUserId() ?? 1;
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // --- User core fields ---
  const [userCore, setUserCore] = useState<Partial<User>>({});

  // --- Section data ---
  const [household, setHousehold] = useState<HouseholdProfilePayload>({});
  const [riskGoals, setRiskGoals] = useState<RiskGoalsProfilePayload>({});
  const [incomeStreams, setIncomeStreams] = useState<IncomeStreamPayload[]>([]);
  const [taxProfile, setTaxProfile] = useState<TaxProfilePayload>({});
  const [expenses, setExpenses] = useState<ExpenseBudgetPayload[]>([]);
  const [insurance, setInsurance] = useState<InsurancePolicyPayload[]>([]);
  const [obligations, setObligations] = useState<LongTermObligationPayload[]>([]);
  const [benefits, setBenefits] = useState<BenefitCoveragePayload[]>([]);

  // Load all sections on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [userRes, hh, rg, inc, tax, exp, ins, obl, ben] = await Promise.all([
          userService.getById(userId),
          fetchHouseholdProfile(userId),
          fetchRiskGoalsProfile(userId),
          fetchIncomeStreamsProfile(userId),
          fetchTaxProfile(userId),
          fetchExpensesProfile(userId),
          fetchInsurancePoliciesProfile(userId),
          fetchLongTermObligationsProfile(userId),
          fetchBenefitsProfile(userId),
        ]);
        if (cancelled) return;
        setUserCore(userRes.data);
        setHousehold(hh);
        setRiskGoals(rg);
        setIncomeStreams(inc.streams ?? []);
        setTaxProfile(tax);
        setExpenses(exp.expenses ?? []);
        setInsurance(ins.policies ?? []);
        setObligations(obl.obligations ?? []);
        setBenefits(ben.benefits ?? []);
      } catch (err) {
        if (!cancelled) setToast({ message: 'Failed to load profile data', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const saveSection = useCallback(async (section: string, saveFn: () => Promise<void>) => {
    setSaving(true);
    try {
      await saveFn();
      setToast({ message: `${section} saved successfully`, severity: 'success' });
    } catch {
      setToast({ message: `Failed to save ${section}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSaveHousehold = () => saveSection('Household', async () => {
    await upsertHouseholdProfile(userId, household);
    // Also update user core fields (DOB, agency, etc.)
    const u = userCore as User;
    if (u.userId && u.firstName && u.lastName) {
      // Strip navigation properties that cause validation errors on the backend
      const { accounts, ...userPayload } = u as User & { accounts?: unknown };
      await userService.update(u.userId, userPayload as User);
    }
  });

  const handleSaveRiskGoals = () => saveSection('Risk & Goals', () => upsertRiskGoalsProfile(userId, riskGoals));
  const handleSaveIncome = () => saveSection('Income', () => upsertIncomeStreamsProfile(userId, { streams: incomeStreams }));
  const handleSaveTax = () => saveSection('Tax Profile', () => upsertTaxProfile(userId, taxProfile));
  const handleSaveExpenses = () => saveSection('Expenses', () => upsertExpensesProfile(userId, { expenses }));
  const handleSaveInsurance = () => saveSection('Insurance', () => upsertInsurancePoliciesProfile(userId, { policies: insurance }));
  const handleSaveObligations = () => saveSection('Obligations', () => upsertLongTermObligationsProfile(userId, { obligations }));
  const handleSaveBenefits = () => saveSection('Benefits', () => upsertBenefitsProfile(userId, { benefits }));

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} />
        <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Financial Profile</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Edit your financial profile data. Changes here update the AI context for your next analysis.
      </Typography>

      <Paper sx={{ mt: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Household" />
          <Tab label="Risk & Goals" />
          <Tab label="Income" />
          <Tab label="Tax" />
          <Tab label="Expenses" />
          <Tab label="Insurance" />
          <Tab label="Obligations" />
          <Tab label="Benefits" />
        </Tabs>

        {/* ─── TAB 0: HOUSEHOLD ─── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Preferred Name" value={household.preferredName ?? ''} onChange={e => setHousehold(p => ({ ...p, preferredName: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Marital Status</InputLabel>
                    <Select value={MARITAL_OPTIONS.find(o => o.toLowerCase() === (household.maritalStatus ?? '').toLowerCase()) ?? ''} label="Marital Status" onChange={e => setHousehold(p => ({ ...p, maritalStatus: e.target.value }))}>
                      {MARITAL_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Dependents" value={household.dependentCount ?? 0} onChange={e => setHousehold(p => ({ ...p, dependentCount: Number(e.target.value) }))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="date" label="Date of Birth" value={userCore.dateOfBirth?.split('T')[0] ?? ''} onChange={e => setUserCore(p => ({ ...p, dateOfBirth: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Employment Type</InputLabel>
                    <Select value={userCore.employmentType ?? ''} label="Employment Type" onChange={e => setUserCore(p => ({ ...p, employmentType: e.target.value }))}>
                      {EMPLOYMENT_TYPES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Government Agency" value={userCore.governmentAgency ?? ''} onChange={e => setUserCore(p => ({ ...p, governmentAgency: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Pay Grade" value={userCore.payGrade ?? ''} onChange={e => setUserCore(p => ({ ...p, payGrade: e.target.value }))} placeholder="e.g. GS-13" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Retirement System</InputLabel>
                    <Select value={userCore.retirementSystem ?? ''} label="Retirement System" onChange={e => setUserCore(p => ({ ...p, retirementSystem: e.target.value }))}>
                      {RETIREMENT_SYSTEMS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="date" label="Service Computation Date" value={userCore.serviceComputationDate?.split('T')[0] ?? ''} onChange={e => setUserCore(p => ({ ...p, serviceComputationDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="VA Disability %" value={userCore.vaDisabilityPercentage ?? ''} onChange={e => setUserCore(p => ({ ...p, vaDisabilityPercentage: Number(e.target.value) || undefined }))} inputProps={{ min: 0, max: 100 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="VA Monthly Amount" value={userCore.vaDisabilityMonthlyAmount ?? ''} onChange={e => setUserCore(p => ({ ...p, vaDisabilityMonthlyAmount: Number(e.target.value) || undefined }))} inputProps={{ min: 0 }} />
                </Grid>
              </Grid>
              <TextField fullWidth multiline rows={2} label="Household Notes" value={household.serviceNotes ?? ''} onChange={e => setHousehold(p => ({ ...p, serviceNotes: e.target.value }))} />
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveHousehold} disabled={saving}>Save Household</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 1: RISK & GOALS ─── */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Risk Tolerance (1-10)" value={riskGoals.riskTolerance ?? ''} onChange={e => setRiskGoals(p => ({ ...p, riskTolerance: Number(e.target.value) || null }))} inputProps={{ min: 1, max: 10 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="date" label="Target Retirement Date" value={riskGoals.targetRetirementDate?.split('T')[0] ?? ''} onChange={e => setRiskGoals(p => ({ ...p, targetRetirementDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Passive Income Goal ($/mo)" value={riskGoals.passiveIncomeGoal ?? ''} onChange={e => setRiskGoals(p => ({ ...p, passiveIncomeGoal: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Emergency Fund Target ($)" value={riskGoals.emergencyFundTarget ?? ''} onChange={e => setRiskGoals(p => ({ ...p, emergencyFundTarget: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Liquidity Buffer (months)" value={riskGoals.liquidityBufferMonths ?? ''} onChange={e => setRiskGoals(p => ({ ...p, liquidityBufferMonths: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Checking Buffer ($)" value={riskGoals.transactionalAccountDesiredBalance ?? ''} onChange={e => setRiskGoals(p => ({ ...p, transactionalAccountDesiredBalance: Number(e.target.value) || null }))} />
                </Grid>
              </Grid>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveRiskGoals} disabled={saving}>Save Risk & Goals</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 2: INCOME STREAMS ─── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Income Streams</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setIncomeStreams(p => [...p, { name: '', incomeType: 'salary', monthlyAmount: null, monthlyNetAmount: null, isGuaranteed: false, isActive: true }])}>Add Stream</Button>
              </Box>
              {incomeStreams.length === 0 && <Typography color="text.secondary">No income streams. Click "Add Stream" to begin.</Typography>}
              {incomeStreams.map((stream, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Name" value={stream.name ?? ''} onChange={e => { const next = [...incomeStreams]; next[i] = { ...next[i], name: e.target.value }; setIncomeStreams(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select value={stream.incomeType ?? 'salary'} label="Type" onChange={e => { const next = [...incomeStreams]; next[i] = { ...next[i], incomeType: e.target.value }; setIncomeStreams(next); }}>
                          {INCOME_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Monthly Gross $" value={stream.monthlyAmount ?? ''} onChange={e => { const next = [...incomeStreams]; next[i] = { ...next[i], monthlyAmount: Number(e.target.value) || null }; setIncomeStreams(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Monthly Net $" value={stream.monthlyNetAmount ?? ''} onChange={e => { const next = [...incomeStreams]; next[i] = { ...next[i], monthlyNetAmount: Number(e.target.value) || null }; setIncomeStreams(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 1 }}>
                      <FormControlLabel control={<Switch checked={stream.isGuaranteed ?? false} onChange={e => { const next = [...incomeStreams]; next[i] = { ...next[i], isGuaranteed: e.target.checked }; setIncomeStreams(next); }} />} label="Guaranteed" />
                    </Grid>
                    <Grid size={{ xs: 6, md: 1 }}>
                      <FormControlLabel control={<Switch checked={stream.isActive ?? true} onChange={e => { const next = [...incomeStreams]; next[i] = { ...next[i], isActive: e.target.checked }; setIncomeStreams(next); }} />} label="Active" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton color="error" onClick={() => setIncomeStreams(p => p.filter((_, idx) => idx !== i))} aria-label="Delete stream"><DeleteIcon /></IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveIncome} disabled={saving}>Save Income</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 3: TAX PROFILE ─── */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Filing Status</InputLabel>
                    <Select value={taxProfile.filingStatus ?? 'single'} label="Filing Status" onChange={e => setTaxProfile(p => ({ ...p, filingStatus: e.target.value }))}>
                      {FILING_STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>State</InputLabel>
                    <Select value={taxProfile.stateOfResidence ?? ''} label="State" onChange={e => setTaxProfile(p => ({ ...p, stateOfResidence: e.target.value }))}>
                      {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Marginal Rate %" value={taxProfile.marginalRatePercent ?? ''} onChange={e => setTaxProfile(p => ({ ...p, marginalRatePercent: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Effective Rate %" value={taxProfile.effectiveRatePercent ?? ''} onChange={e => setTaxProfile(p => ({ ...p, effectiveRatePercent: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Federal Withholding %" value={taxProfile.federalWithholdingPercent ?? ''} onChange={e => setTaxProfile(p => ({ ...p, federalWithholdingPercent: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Expected Refund ($)" value={taxProfile.expectedRefundAmount ?? ''} onChange={e => setTaxProfile(p => ({ ...p, expectedRefundAmount: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Expected Payment ($)" value={taxProfile.expectedPaymentAmount ?? ''} onChange={e => setTaxProfile(p => ({ ...p, expectedPaymentAmount: Number(e.target.value) || null }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel control={<Switch checked={taxProfile.usesCpaOrPreparer ?? false} onChange={e => setTaxProfile(p => ({ ...p, usesCpaOrPreparer: e.target.checked }))} />} label="Uses CPA / Preparer" />
                </Grid>
              </Grid>
              <TextField fullWidth multiline rows={2} label="Tax Notes" value={taxProfile.notes ?? ''} onChange={e => setTaxProfile(p => ({ ...p, notes: e.target.value }))} />
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveTax} disabled={saving}>Save Tax Profile</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 4: EXPENSES ─── */}
        <TabPanel value={tab} index={4}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Monthly Expenses</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setExpenses(p => [...p, { category: '', monthlyAmount: null, isEstimated: true, notes: '' }])}>Add Expense</Button>
              </Box>
              {expenses.length === 0 && <Typography color="text.secondary">No expenses tracked. Click "Add Expense" to begin.</Typography>}
              {expenses.map((exp, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select value={exp.category ?? ''} label="Category" onChange={e => { const next = [...expenses]; next[i] = { ...next[i], category: e.target.value }; setExpenses(next); }}>
                          {EXPENSE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Monthly $" value={exp.monthlyAmount ?? ''} onChange={e => { const next = [...expenses]; next[i] = { ...next[i], monthlyAmount: Number(e.target.value) || null }; setExpenses(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControlLabel control={<Switch checked={exp.isEstimated ?? true} onChange={e => { const next = [...expenses]; next[i] = { ...next[i], isEstimated: e.target.checked }; setExpenses(next); }} />} label="Estimated" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Notes" value={exp.notes ?? ''} onChange={e => { const next = [...expenses]; next[i] = { ...next[i], notes: e.target.value }; setExpenses(next); }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton color="error" onClick={() => setExpenses(p => p.filter((_, idx) => idx !== i))} aria-label="Delete expense"><DeleteIcon /></IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              {expenses.length > 0 && (
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Total: {fmt$(expenses.reduce((sum, e) => sum + (e.monthlyAmount ?? 0), 0))}/mo
                </Typography>
              )}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveExpenses} disabled={saving}>Save Expenses</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 5: INSURANCE ─── */}
        <TabPanel value={tab} index={5}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Insurance Policies</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setInsurance(p => [...p, { policyType: '', carrier: '', coverageAmount: null, premiumAmount: null, premiumFrequency: 'Monthly', notes: '' }])}>Add Policy</Button>
              </Box>
              {insurance.length === 0 && <Typography color="text.secondary">No insurance policies. Click "Add Policy" to begin.</Typography>}
              {insurance.map((pol, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select value={pol.policyType ?? ''} label="Type" onChange={e => { const next = [...insurance]; next[i] = { ...next[i], policyType: e.target.value }; setInsurance(next); }}>
                          {INSURANCE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField fullWidth label="Carrier" value={pol.carrier ?? ''} onChange={e => { const next = [...insurance]; next[i] = { ...next[i], carrier: e.target.value }; setInsurance(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Coverage $" value={pol.coverageAmount ?? ''} onChange={e => { const next = [...insurance]; next[i] = { ...next[i], coverageAmount: Number(e.target.value) || null }; setInsurance(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Premium $" value={pol.premiumAmount ?? ''} onChange={e => { const next = [...insurance]; next[i] = { ...next[i], premiumAmount: Number(e.target.value) || null }; setInsurance(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Frequency</InputLabel>
                        <Select value={pol.premiumFrequency ?? 'Monthly'} label="Frequency" onChange={e => { const next = [...insurance]; next[i] = { ...next[i], premiumFrequency: e.target.value }; setInsurance(next); }}>
                          {PREMIUM_FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 1 }}>
                      <FormControlLabel control={<Switch checked={pol.isAdequateCoverage ?? false} onChange={e => { const next = [...insurance]; next[i] = { ...next[i], isAdequateCoverage: e.target.checked }; setInsurance(next); }} />} label="Adequate" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton color="error" onClick={() => setInsurance(p => p.filter((_, idx) => idx !== i))} aria-label="Delete policy"><DeleteIcon /></IconButton>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField fullWidth label="Notes" placeholder="e.g. policy through employer, renews automatically" multiline minRows={2} inputProps={{ maxLength: 500 }} value={pol.notes ?? ''} onChange={e => { const next = [...insurance]; next[i] = { ...next[i], notes: e.target.value }; setInsurance(next); }} />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveInsurance} disabled={saving}>Save Insurance</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 6: LONG-TERM OBLIGATIONS ─── */}
        <TabPanel value={tab} index={6}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Long-Term Obligations</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setObligations(p => [...p, { obligationName: '', obligationType: 'general', estimatedCost: null, isCritical: false }])}>Add Obligation</Button>
              </Box>
              {obligations.length === 0 && <Typography color="text.secondary">No obligations. Click "Add Obligation" to begin.</Typography>}
              {obligations.map((obl, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Name" value={obl.obligationName ?? ''} onChange={e => { const next = [...obligations]; next[i] = { ...next[i], obligationName: e.target.value }; setObligations(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select value={obl.obligationType ?? 'general'} label="Type" onChange={e => { const next = [...obligations]; next[i] = { ...next[i], obligationType: e.target.value }; setObligations(next); }}>
                          {OBLIGATION_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Est. Cost $" value={obl.estimatedCost ?? ''} onChange={e => { const next = [...obligations]; next[i] = { ...next[i], estimatedCost: Number(e.target.value) || null }; setObligations(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="date" label="Target Date" value={obl.targetDate?.split('T')[0] ?? ''} onChange={e => { const next = [...obligations]; next[i] = { ...next[i], targetDate: e.target.value }; setObligations(next); }} slotProps={{ inputLabel: { shrink: true } }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControlLabel control={<Switch checked={obl.isCritical ?? false} onChange={e => { const next = [...obligations]; next[i] = { ...next[i], isCritical: e.target.checked }; setObligations(next); }} />} label="Critical" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton color="error" onClick={() => setObligations(p => p.filter((_, idx) => idx !== i))} aria-label="Delete obligation"><DeleteIcon /></IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveObligations} disabled={saving}>Save Obligations</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 7: BENEFITS ─── */}
        <TabPanel value={tab} index={7}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Benefits & Programs</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setBenefits(p => [...p, { benefitType: '', provider: '', isEnrolled: true }])}>Add Benefit</Button>
              </Box>
              {benefits.length === 0 && <Typography color="text.secondary">No benefits tracked. Click "Add Benefit" to begin.</Typography>}
              {benefits.map((ben, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Benefit Type" value={ben.benefitType ?? ''} onChange={e => { const next = [...benefits]; next[i] = { ...next[i], benefitType: e.target.value }; setBenefits(next); }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Provider" value={ben.provider ?? ''} onChange={e => { const next = [...benefits]; next[i] = { ...next[i], provider: e.target.value }; setBenefits(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth type="number" label="Monthly Cost $" value={ben.monthlyCost ?? ''} onChange={e => { const next = [...benefits]; next[i] = { ...next[i], monthlyCost: Number(e.target.value) || null }; setBenefits(next); }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControlLabel control={<Switch checked={ben.isEnrolled ?? false} onChange={e => { const next = [...benefits]; next[i] = { ...next[i], isEnrolled: e.target.checked }; setBenefits(next); }} />} label="Enrolled" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton color="error" onClick={() => setBenefits(p => p.filter((_, idx) => idx !== i))} aria-label="Delete benefit"><DeleteIcon /></IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveBenefits} disabled={saving}>Save Benefits</Button>
            </Stack>
          </Box>
        </TabPanel>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)} variant="filled">{toast?.message}</Alert>
      </Snackbar>
    </Box>
  );
}
