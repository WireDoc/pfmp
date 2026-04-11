import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSearchParams } from 'react-router-dom';
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
import {
  fetchFederalBenefits,
  saveFederalBenefits,
  applySf50,
  applyLes,
  type FederalBenefitsProfile,
  type SaveFederalBenefitsRequest,
} from '../../services/federalBenefitsApi';
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

const TAB_KEYS = ['household', 'risk-goals', 'income', 'tax', 'expenses', 'insurance', 'obligations', 'benefits', 'federal-benefits'] as const;

const COVERAGE_LEVELS = ['Self Only', 'Self Plus One', 'Self and Family'];

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numStr(v: number | null | undefined): string {
  return v != null ? String(v) : '';
}

export function ProfileView() {
  const userId = useDevUserId() ?? 1;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => {
    const t = searchParams.get('tab');
    const idx = TAB_KEYS.indexOf(t as typeof TAB_KEYS[number]);
    return idx >= 0 ? idx : 0;
  }, [searchParams]);
  const setTab = useCallback((index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] }, { replace: true });
  }, [setSearchParams]);
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

  // Federal benefits
  const [fedBen, setFedBen] = useState<FederalBenefitsProfile | null>(null);
  const [fedForm, setFedForm] = useState<SaveFederalBenefitsRequest>({
    hasFegliBasic: false, hasFegliOptionA: false, hasFegliOptionB: false,
    hasFegliOptionC: false, hasFedvipDental: false, hasFedvipVision: false,
    hasFltcip: false, hasFsa: false, hasHsa: false,
  });
  const [sf50Status, setSf50Status] = useState<string | null>(null);
  const [lesStatus, setLesStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const sf50InputRef = React.useRef<HTMLInputElement>(null);
  const lesInputRef = React.useRef<HTMLInputElement>(null);

  // Load all sections on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [userRes, hh, rg, inc, tax, exp, ins, obl, ben, fb] = await Promise.all([
          userService.getById(userId),
          fetchHouseholdProfile(userId),
          fetchRiskGoalsProfile(userId),
          fetchIncomeStreamsProfile(userId),
          fetchTaxProfile(userId),
          fetchExpensesProfile(userId),
          fetchInsurancePoliciesProfile(userId),
          fetchLongTermObligationsProfile(userId),
          fetchBenefitsProfile(userId),
          fetchFederalBenefits(userId),
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
        if (fb) {
          setFedBen(fb);
          setFedForm({
            high3AverageSalary: fb.high3AverageSalary,
            projectedAnnuity: fb.projectedAnnuity,
            projectedMonthlyPension: fb.projectedMonthlyPension,
            creditableYearsOfService: fb.creditableYearsOfService,
            creditableMonthsOfService: fb.creditableMonthsOfService,
            isEligibleForSpecialRetirementSupplement: fb.isEligibleForSpecialRetirementSupplement ?? false,
            estimatedSupplementMonthly: fb.estimatedSupplementMonthly,
            hasFegliBasic: fb.hasFegliBasic, fegliBasicCoverage: fb.fegliBasicCoverage,
            hasFegliOptionA: fb.hasFegliOptionA, hasFegliOptionB: fb.hasFegliOptionB,
            fegliOptionBMultiple: fb.fegliOptionBMultiple,
            hasFegliOptionC: fb.hasFegliOptionC, fegliOptionCMultiple: fb.fegliOptionCMultiple,
            fegliTotalMonthlyPremium: fb.fegliTotalMonthlyPremium,
            fehbPlanName: fb.fehbPlanName, fehbCoverageLevel: fb.fehbCoverageLevel,
            fehbMonthlyPremium: fb.fehbMonthlyPremium, fehbEmployerContribution: fb.fehbEmployerContribution,
            hasFedvipDental: fb.hasFedvipDental, fedvipDentalMonthlyPremium: fb.fedvipDentalMonthlyPremium,
            hasFedvipVision: fb.hasFedvipVision, fedvipVisionMonthlyPremium: fb.fedvipVisionMonthlyPremium,
            hasFltcip: fb.hasFltcip, fltcipMonthlyPremium: fb.fltcipMonthlyPremium,
            hasFsa: fb.hasFsa, fsaAnnualElection: fb.fsaAnnualElection,
            hasHsa: fb.hasHsa, hsaBalance: fb.hsaBalance, hsaAnnualContribution: fb.hsaAnnualContribution,
          });
        }
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

  const applyFedProfile = (p: FederalBenefitsProfile) => {
    setFedBen(p);
    setFedForm({
      high3AverageSalary: p.high3AverageSalary,
      projectedAnnuity: p.projectedAnnuity,
      projectedMonthlyPension: p.projectedMonthlyPension,
      creditableYearsOfService: p.creditableYearsOfService,
      creditableMonthsOfService: p.creditableMonthsOfService,
      isEligibleForSpecialRetirementSupplement: p.isEligibleForSpecialRetirementSupplement ?? false,
      estimatedSupplementMonthly: p.estimatedSupplementMonthly,
      hasFegliBasic: p.hasFegliBasic, fegliBasicCoverage: p.fegliBasicCoverage,
      hasFegliOptionA: p.hasFegliOptionA, hasFegliOptionB: p.hasFegliOptionB,
      fegliOptionBMultiple: p.fegliOptionBMultiple,
      hasFegliOptionC: p.hasFegliOptionC, fegliOptionCMultiple: p.fegliOptionCMultiple,
      fegliTotalMonthlyPremium: p.fegliTotalMonthlyPremium,
      fehbPlanName: p.fehbPlanName, fehbCoverageLevel: p.fehbCoverageLevel,
      fehbMonthlyPremium: p.fehbMonthlyPremium, fehbEmployerContribution: p.fehbEmployerContribution,
      hasFedvipDental: p.hasFedvipDental, fedvipDentalMonthlyPremium: p.fedvipDentalMonthlyPremium,
      hasFedvipVision: p.hasFedvipVision, fedvipVisionMonthlyPremium: p.fedvipVisionMonthlyPremium,
      hasFltcip: p.hasFltcip, fltcipMonthlyPremium: p.fltcipMonthlyPremium,
      hasFsa: p.hasFsa, fsaAnnualElection: p.fsaAnnualElection,
      hasHsa: p.hasHsa, hsaBalance: p.hsaBalance, hsaAnnualContribution: p.hsaAnnualContribution,
    });
  };

  const handleSaveFederalBenefits = () => saveSection('Federal Benefits', async () => {
    const result = await saveFederalBenefits(userId, fedForm);
    setFedBen(result);
  });

  const handleSf50Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setSf50Status('Uploading SF-50…');
    try {
      const result = await applySf50(userId, file);
      applyFedProfile(result);
      setSf50Status(`SF-50 applied — fields updated from ${file.name}`);
    } catch {
      setUploadError('Failed to parse SF-50. Ensure it is a valid PDF.');
      setSf50Status(null);
    }
    if (sf50InputRef.current) sf50InputRef.current.value = '';
  };

  const handleLesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setLesStatus('Uploading LES…');
    try {
      const result = await applyLes(userId, file);
      applyFedProfile(result);
      setLesStatus(`LES applied — deductions updated from ${file.name}`);
    } catch {
      setUploadError('Failed to parse LES. Ensure it is a valid PDF.');
      setLesStatus(null);
    }
    if (lesInputRef.current) lesInputRef.current.value = '';
  };

  const updateFed = <K extends keyof SaveFederalBenefitsRequest>(key: K, value: SaveFederalBenefitsRequest[K]) =>
    setFedForm(prev => ({ ...prev, [key]: value }));

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
          onChange={(_, v: number) => setTab(v)}
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
          <Tab label="Federal Benefits" />
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

        {/* ─── TAB 8: FEDERAL BENEFITS ─── */}
        <TabPanel value={tab} index={8}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Federal Benefits Profile</Typography>
              <Typography variant="body2" color="text.secondary">
                FEGLI, FEHB, FERS/CSRS pension, and supplemental coverage. Upload an SF-50 or LES to auto-fill.
              </Typography>
              {uploadError && <Alert severity="error" onClose={() => setUploadError(null)}>{uploadError}</Alert>}

              {/* PDF Upload */}
              <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" gutterBottom>Quick Import from Documents</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => sf50InputRef.current?.click()} size="small">Upload SF-50</Button>
                  <input ref={sf50InputRef} type="file" accept=".pdf" hidden onChange={handleSf50Upload} />
                  <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => lesInputRef.current?.click()} size="small">Upload LES</Button>
                  <input ref={lesInputRef} type="file" accept=".pdf" hidden onChange={handleLesUpload} />
                </Stack>
                {sf50Status && <Chip icon={<CheckCircleOutlineIcon />} label={sf50Status} color="success" size="small" sx={{ mt: 1 }} />}
                {lesStatus && <Chip icon={<CheckCircleOutlineIcon />} label={lesStatus} color="success" size="small" sx={{ mt: 1, ml: 1 }} />}
                {(fedBen?.lastSf50FileName || fedBen?.lastLesFileName) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {fedBen.lastSf50FileName && `Last SF-50: ${fedBen.lastSf50FileName}`}
                    {fedBen.lastSf50FileName && fedBen.lastLesFileName && ' · '}
                    {fedBen?.lastLesFileName && `Last LES: ${fedBen.lastLesFileName}`}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* FERS/CSRS Pension */}
              <Typography variant="subtitle1" fontWeight={600}>FERS / CSRS Pension</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="High-3 Average Salary" type="number" size="small" value={numStr(fedForm.high3AverageSalary)} onChange={e => updateFed('high3AverageSalary', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Projected Annual Annuity" type="number" size="small" value={numStr(fedForm.projectedAnnuity)} onChange={e => updateFed('projectedAnnuity', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Projected Monthly Pension" type="number" size="small" value={numStr(fedForm.projectedMonthlyPension)} onChange={e => updateFed('projectedMonthlyPension', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField fullWidth label="Creditable Years" type="number" size="small" value={numStr(fedForm.creditableYearsOfService)} onChange={e => updateFed('creditableYearsOfService', parseNum(e.target.value) != null ? Math.floor(parseNum(e.target.value)!) : null)} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField fullWidth label="Creditable Months" type="number" size="small" value={numStr(fedForm.creditableMonthsOfService)} onChange={e => updateFed('creditableMonthsOfService', parseNum(e.target.value) != null ? Math.floor(parseNum(e.target.value)!) : null)} inputProps={{ min: 0, max: 11 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControlLabel control={<Switch checked={fedForm.isEligibleForSpecialRetirementSupplement ?? false} onChange={(_, v) => updateFed('isEligibleForSpecialRetirementSupplement', v)} size="small" />} label="FERS Supplement Eligible" />
                    {fedForm.isEligibleForSpecialRetirementSupplement && (
                      <TextField label="Est. Monthly Supplement" type="number" size="small" sx={{ width: 180 }} value={numStr(fedForm.estimatedSupplementMonthly)} onChange={e => updateFed('estimatedSupplementMonthly', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Divider />

              {/* FEGLI */}
              <Typography variant="subtitle1" fontWeight={600}>FEGLI (Life Insurance)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel control={<Switch checked={fedForm.hasFegliBasic} onChange={(_, v) => updateFed('hasFegliBasic', v)} size="small" />} label="Basic FEGLI" />
                </Grid>
                {fedForm.hasFegliBasic && (
                  <>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Basic Coverage Amount" type="number" size="small" value={numStr(fedForm.fegliBasicCoverage)} onChange={e => updateFed('fegliBasicCoverage', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Total Monthly Premium" type="number" size="small" value={numStr(fedForm.fegliTotalMonthlyPremium)} onChange={e => updateFed('fegliTotalMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <FormControlLabel control={<Switch checked={fedForm.hasFegliOptionA} onChange={(_, v) => updateFed('hasFegliOptionA', v)} size="small" />} label="Option A" />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControlLabel control={<Switch checked={fedForm.hasFegliOptionB} onChange={(_, v) => updateFed('hasFegliOptionB', v)} size="small" />} label="Option B" />
                        {fedForm.hasFegliOptionB && (
                          <Select value={String(fedForm.fegliOptionBMultiple ?? 1)} onChange={e => updateFed('fegliOptionBMultiple', Number(e.target.value))} size="small" sx={{ width: 80 }}>
                            {[1,2,3,4,5].map(m => <MenuItem key={m} value={String(m)}>{m}×</MenuItem>)}
                          </Select>
                        )}
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControlLabel control={<Switch checked={fedForm.hasFegliOptionC} onChange={(_, v) => updateFed('hasFegliOptionC', v)} size="small" />} label="Option C" />
                        {fedForm.hasFegliOptionC && (
                          <Select value={String(fedForm.fegliOptionCMultiple ?? 1)} onChange={e => updateFed('fegliOptionCMultiple', Number(e.target.value))} size="small" sx={{ width: 80 }}>
                            {[1,2,3,4,5].map(m => <MenuItem key={m} value={String(m)}>{m}×</MenuItem>)}
                          </Select>
                        )}
                      </Stack>
                    </Grid>
                  </>
                )}
              </Grid>

              <Divider />

              {/* FEHB */}
              <Typography variant="subtitle1" fontWeight={600}>FEHB (Health Insurance)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Plan Name" size="small" value={fedForm.fehbPlanName ?? ''} onChange={e => updateFed('fehbPlanName', e.target.value || null)} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Coverage Level" size="small" select value={fedForm.fehbCoverageLevel ?? ''} onChange={e => updateFed('fehbCoverageLevel', e.target.value || null)}>
                    <MenuItem value="">—</MenuItem>
                    {COVERAGE_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth label="Monthly Premium" type="number" size="small" value={numStr(fedForm.fehbMonthlyPremium)} onChange={e => updateFed('fehbMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth label="Employer Pays" type="number" size="small" value={numStr(fedForm.fehbEmployerContribution)} onChange={e => updateFed('fehbEmployerContribution', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                </Grid>
              </Grid>

              <Divider />

              {/* FEDVIP / FLTCIP */}
              <Typography variant="subtitle1" fontWeight={600}>FEDVIP & Long-Term Care</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasFedvipDental} onChange={(_, v) => updateFed('hasFedvipDental', v)} size="small" />} label="FEDVIP Dental" />
                    {fedForm.hasFedvipDental && (
                      <TextField label="Monthly Premium" type="number" size="small" value={numStr(fedForm.fedvipDentalMonthlyPremium)} onChange={e => updateFed('fedvipDentalMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasFedvipVision} onChange={(_, v) => updateFed('hasFedvipVision', v)} size="small" />} label="FEDVIP Vision" />
                    {fedForm.hasFedvipVision && (
                      <TextField label="Monthly Premium" type="number" size="small" value={numStr(fedForm.fedvipVisionMonthlyPremium)} onChange={e => updateFed('fedvipVisionMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasFltcip} onChange={(_, v) => updateFed('hasFltcip', v)} size="small" />} label="FLTCIP (Long-Term Care)" />
                    {fedForm.hasFltcip && (
                      <TextField label="Monthly Premium" type="number" size="small" value={numStr(fedForm.fltcipMonthlyPremium)} onChange={e => updateFed('fltcipMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Divider />

              {/* FSA/HSA */}
              <Typography variant="subtitle1" fontWeight={600}>FSA & HSA</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasFsa} onChange={(_, v) => updateFed('hasFsa', v)} size="small" />} label="FSA Enrolled" />
                    {fedForm.hasFsa && (
                      <TextField label="Annual Election" type="number" size="small" value={numStr(fedForm.fsaAnnualElection)} onChange={e => updateFed('fsaAnnualElection', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasHsa} onChange={(_, v) => updateFed('hasHsa', v)} size="small" />} label="HSA Enrolled" />
                    {fedForm.hasHsa && (
                      <>
                        <TextField label="HSA Balance" type="number" size="small" sx={{ mb: 1 }} value={numStr(fedForm.hsaBalance)} onChange={e => updateFed('hsaBalance', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                        <TextField label="Annual Contribution" type="number" size="small" value={numStr(fedForm.hsaAnnualContribution)} onChange={e => updateFed('hsaAnnualContribution', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                      </>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveFederalBenefits} disabled={saving}>Save Federal Benefits</Button>
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
