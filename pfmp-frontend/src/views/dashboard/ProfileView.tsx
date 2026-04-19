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
  applyLes,
  fetchRetirementProjection,
  type FederalBenefitsProfile,
  type SaveFederalBenefitsRequest,
  type RetirementProjectionResponse,
  type RetirementProjectionParams,
} from '../../services/federalBenefitsApi';
import {
  fetchEstatePlanning,
  saveEstatePlanning,
  type EstatePlanningResponse,
  type SaveEstatePlanningRequest,
} from '../../services/estatePlanningApi';
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
const RETIREMENT_SYSTEMS = ['FERS', 'Military', 'None'];
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

const TAB_KEYS = ['household', 'risk-goals', 'income', 'tax', 'expenses', 'insurance', 'obligations', 'benefits', 'federal-benefits', 'estate-planning'] as const;

const COVERAGE_LEVELS = ['Self Only', 'Self Plus One', 'Self and Family'];

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numStr(v: number | null | undefined): string {
  return v != null ? String(v) : '';
}

/** Format a dollar value truncated to the penny (no rounding). 50.905 → "50.90" */
function numStrTrunc(v: number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  const dot = s.indexOf('.');
  if (dot === -1) return s;
  return s.slice(0, dot + 3); // keep at most 2 decimal places
}

/** Calculate creditable service (years + months) from SCD to today */
function creditableService(scd: string | null | undefined): { years: number; months: number } | null {
  if (!scd) return null;
  const scdDate = new Date(scd);
  if (isNaN(scdDate.getTime())) return null;
  const today = new Date();
  let totalMonths = (today.getFullYear() - scdDate.getFullYear()) * 12 + today.getMonth() - scdDate.getMonth();
  if (today.getDate() < scdDate.getDate()) totalMonths--;
  if (totalMonths < 0) totalMonths = 0;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

/** OPM Minimum Retirement Age from birth year */
function getMraAge(birthYear: number): { years: number; months: number } {
  if (birthYear < 1948) return { years: 55, months: 0 };
  if (birthYear === 1948) return { years: 55, months: 2 };
  if (birthYear === 1949) return { years: 55, months: 4 };
  if (birthYear === 1950) return { years: 55, months: 6 };
  if (birthYear === 1951) return { years: 55, months: 8 };
  if (birthYear === 1952) return { years: 55, months: 10 };
  if (birthYear >= 1953 && birthYear <= 1964) return { years: 56, months: 0 };
  if (birthYear === 1965) return { years: 56, months: 2 };
  if (birthYear === 1966) return { years: 56, months: 4 };
  if (birthYear === 1967) return { years: 56, months: 6 };
  if (birthYear === 1968) return { years: 56, months: 8 };
  if (birthYear === 1969) return { years: 56, months: 10 };
  return { years: 57, months: 0 }; // 1970+
}

/** Calculate FERS pension projection from High-3, creditable years/months.
 *  Uses 1.0% multiplier (today's snapshot). The 1.1% multiplier (age 62+ with 20+ yrs)
 *  is only applied in the Retirement Projector scenarios where age is known. */
function fersPensionCalc(high3: number | null, creditYears: number, creditMonths: number) {
  if (!high3 || high3 <= 0) return { annuity: null, monthly: null };
  const totalService = creditYears + creditMonths / 12;
  const multiplier = 0.01;
  const annuity = Math.floor(multiplier * high3 * totalService * 100) / 100;
  const monthly = Math.floor((annuity / 12) * 100) / 100;
  return { annuity, monthly };
}

/** Infer FERS supplement eligibility from DOB + creditable years */
function inferSupplementEligible(dob: string | null | undefined, creditableYears: number): boolean | null {
  if (!dob || creditableYears <= 0) return null;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return null;
  const today = new Date();
  let ageToday = today.getFullYear() - dobDate.getFullYear();
  if (today < new Date(dobDate.getFullYear() + ageToday, dobDate.getMonth(), dobDate.getDate())) ageToday--;
  const mra = getMraAge(dobDate.getFullYear());
  const mraAgeYears = mra.years;
  const yearsUntilMra = Math.max(0, mraAgeYears - ageToday);
  const projectedYearsAtMra = creditableYears + yearsUntilMra;
  const yearsUntil60 = Math.max(0, 60 - ageToday);
  const projectedYearsAt60 = creditableYears + yearsUntil60;
  return projectedYearsAtMra >= 30 || projectedYearsAt60 >= 20;
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
  const [lesStatus, setLesStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lesInputRef = React.useRef<HTMLInputElement>(null);
  const [projection, setProjection] = useState<RetirementProjectionResponse | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(false);

  // Phase 2: Retirement Projector advanced controls
  const [projParams, setProjParams] = useState<RetirementProjectionParams>({});
  const updateProjParam = <K extends keyof RetirementProjectionParams>(key: K, value: RetirementProjectionParams[K]) =>
    setProjParams(prev => ({ ...prev, [key]: value }));

  // Estate Planning
  const [estateForm, setEstateForm] = useState<SaveEstatePlanningRequest>({
    hasWill: false, willLastReviewedDate: null,
    hasTrust: false, trustType: null, trustLastReviewedDate: null,
    hasFinancialPOA: false, hasHealthcarePOA: false, hasAdvanceDirective: false,
    attorneyName: null, attorneyLastConsultDate: null, notes: null,
  });
  const updateEstate = <K extends keyof SaveEstatePlanningRequest>(key: K, value: SaveEstatePlanningRequest[K]) =>
    setEstateForm(prev => ({ ...prev, [key]: value }));

  // Load all sections on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [userRes, hh, rg, inc, tax, exp, ins, obl, ben, fb, ep] = await Promise.all([
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
          fetchEstatePlanning(userId),
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
            fersCumulativeRetirement: fb.fersCumulativeRetirement,
            socialSecurityEstimateAt62: fb.socialSecurityEstimateAt62,
            annualSalaryGrowthRate: fb.annualSalaryGrowthRate,
            hasFegliBasic: fb.hasFegliBasic, fegliBasicCoverage: fb.fegliBasicCoverage,
            hasFegliOptionA: fb.hasFegliOptionA, hasFegliOptionB: fb.hasFegliOptionB,
            fegliOptionBMultiple: fb.fegliOptionBMultiple,
            hasFegliOptionC: fb.hasFegliOptionC, fegliOptionCMultiple: fb.fegliOptionCMultiple,
            fegliTotalMonthlyPremium: fb.fegliTotalMonthlyPremium,
            fehbEnrollmentCode: fb.fehbEnrollmentCode,
            fehbPlanName: fb.fehbPlanName, fehbCoverageLevel: fb.fehbCoverageLevel,
            fehbMonthlyPremium: fb.fehbMonthlyPremium, fehbEmployerContribution: fb.fehbEmployerContribution,
            hasFedvipDental: fb.hasFedvipDental, fedvipDentalMonthlyPremium: fb.fedvipDentalMonthlyPremium,
            hasFedvipVision: fb.hasFedvipVision, fedvipVisionMonthlyPremium: fb.fedvipVisionMonthlyPremium,
            hasFltcip: fb.hasFltcip, fltcipMonthlyPremium: fb.fltcipMonthlyPremium,
            hasFsa: fb.hasFsa, fsaAnnualElection: fb.fsaAnnualElection,
            hasHsa: fb.hasHsa, hsaBalance: fb.hsaBalance, hsaAnnualContribution: fb.hsaAnnualContribution,
            annualLeaveBalance: fb.annualLeaveBalance, sickLeaveBalance: fb.sickLeaveBalance,
            federalTaxWithholdingBiweekly: fb.federalTaxWithholdingBiweekly,
            stateTaxWithholdingBiweekly: fb.stateTaxWithholdingBiweekly,
            oasdiDeductionBiweekly: fb.oasdiDeductionBiweekly,
            medicareDeductionBiweekly: fb.medicareDeductionBiweekly,
          });
        }
        if (ep) {
          setEstateForm({
            hasWill: ep.hasWill, willLastReviewedDate: ep.willLastReviewedDate,
            hasTrust: ep.hasTrust, trustType: ep.trustType, trustLastReviewedDate: ep.trustLastReviewedDate,
            hasFinancialPOA: ep.hasFinancialPOA, hasHealthcarePOA: ep.hasHealthcarePOA,
            hasAdvanceDirective: ep.hasAdvanceDirective,
            attorneyName: ep.attorneyName, attorneyLastConsultDate: ep.attorneyLastConsultDate,
            notes: ep.notes,
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
  const handleSaveEstatePlanning = () => saveSection('Estate Planning', () => saveEstatePlanning(userId, estateForm));

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
      fersCumulativeRetirement: p.fersCumulativeRetirement,
      socialSecurityEstimateAt62: p.socialSecurityEstimateAt62,
      annualSalaryGrowthRate: p.annualSalaryGrowthRate,
      hasFegliBasic: p.hasFegliBasic, fegliBasicCoverage: p.fegliBasicCoverage,
      hasFegliOptionA: p.hasFegliOptionA, hasFegliOptionB: p.hasFegliOptionB,
      fegliOptionBMultiple: p.fegliOptionBMultiple,
      hasFegliOptionC: p.hasFegliOptionC, fegliOptionCMultiple: p.fegliOptionCMultiple,
      fegliTotalMonthlyPremium: p.fegliTotalMonthlyPremium,
      fehbEnrollmentCode: p.fehbEnrollmentCode,
      fehbPlanName: p.fehbPlanName, fehbCoverageLevel: p.fehbCoverageLevel,
      fehbMonthlyPremium: p.fehbMonthlyPremium, fehbEmployerContribution: p.fehbEmployerContribution,
      hasFedvipDental: p.hasFedvipDental, fedvipDentalMonthlyPremium: p.fedvipDentalMonthlyPremium,
      hasFedvipVision: p.hasFedvipVision, fedvipVisionMonthlyPremium: p.fedvipVisionMonthlyPremium,
      hasFltcip: p.hasFltcip, fltcipMonthlyPremium: p.fltcipMonthlyPremium,
      hasFsa: p.hasFsa, fsaAnnualElection: p.fsaAnnualElection,
      hasHsa: p.hasHsa, hsaBalance: p.hsaBalance, hsaAnnualContribution: p.hsaAnnualContribution,
      annualLeaveBalance: p.annualLeaveBalance, sickLeaveBalance: p.sickLeaveBalance,
      federalTaxWithholdingBiweekly: p.federalTaxWithholdingBiweekly,
      stateTaxWithholdingBiweekly: p.stateTaxWithholdingBiweekly,
      oasdiDeductionBiweekly: p.oasdiDeductionBiweekly,
      medicareDeductionBiweekly: p.medicareDeductionBiweekly,
    });
  };

  const handleSaveFederalBenefits = () => saveSection('Federal Benefits', async () => {
    const result = await saveFederalBenefits(userId, fedForm);
    setFedBen(result);
    // Also persist user core fields shown on this tab (agency, pay grade, SCD, retirement system)
    const u = userCore as User;
    if (u.userId && u.firstName && u.lastName) {
      const { accounts, ...userPayload } = u as User & { accounts?: unknown };
      await userService.update(u.userId, userPayload as User);
    }
    // Refresh projection after saving
    loadProjection();
  });

  const loadProjection = useCallback(async () => {
    setProjectionLoading(true);
    try {
      const proj = await fetchRetirementProjection(userId, projParams);
      setProjection(proj);
    } catch {
      // Projection may fail if user hasn't set SCD/DOB yet — that's fine
      setProjection(null);
    } finally {
      setProjectionLoading(false);
    }
  }, [userId, projParams]);

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

  // Load retirement projection when Federal Benefits tab is shown
  useEffect(() => {
    if (tab === 8 && !projection && !projectionLoading) {
      loadProjection();
    }
  }, [tab, projection, projectionLoading, loadProjection]);

  // Auto-calculate FERS pension fields when SCD, DOB, High-3, or SS estimate change
  useEffect(() => {
    const scd = (userCore as User)?.serviceComputationDate;
    const dob = (userCore as User)?.dateOfBirth;
    const high3 = fedForm.high3AverageSalary;
    const ssAt62 = fedForm.socialSecurityEstimateAt62;
    if (!scd) return;
    const cs = creditableService(scd);
    if (!cs) return;
    const updates: Partial<SaveFederalBenefitsRequest> = {
      creditableYearsOfService: cs.years,
      creditableMonthsOfService: cs.months,
    };
    if (high3 != null && high3 > 0) {
      const calc = fersPensionCalc(high3, cs.years, cs.months);
      updates.projectedAnnuity = calc.annuity;
      updates.projectedMonthlyPension = calc.monthly;
    }
    if (dob) {
      const eligible = inferSupplementEligible(dob, cs.years);
      if (eligible !== null) {
        updates.isEligibleForSpecialRetirementSupplement = eligible;
      }
    }
    // Auto-calculate SRS estimate: ssAt62 × (serviceYears / 40)
    if (ssAt62 != null && ssAt62 > 0) {
      const totalService = cs.years + cs.months / 12;
      updates.estimatedSupplementMonthly = Math.round(ssAt62 * (totalService / 40) * 100) / 100;
    }
    setFedForm(prev => ({ ...prev, ...updates }));
  }, [(userCore as User)?.serviceComputationDate, (userCore as User)?.dateOfBirth, fedForm.high3AverageSalary, fedForm.socialSecurityEstimateAt62]);

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
          <Tab label="Estate Planning" />
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
                  <TextField fullWidth type="number" label="VA Disability %" value={userCore.vaDisabilityPercentage ?? ''} onChange={e => setUserCore(p => ({ ...p, vaDisabilityPercentage: Number(e.target.value) || undefined }))} inputProps={{ min: 0, max: 100 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="VA Monthly Amount" value={userCore.vaDisabilityMonthlyAmount ?? ''} onChange={e => setUserCore(p => ({ ...p, vaDisabilityMonthlyAmount: Number(e.target.value) || undefined }))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel control={<Switch checked={userCore.includeVaDisabilityInProjections ?? false} onChange={(_, v) => setUserCore(p => ({ ...p, includeVaDisabilityInProjections: v }))} size="small" />} label="Include VA disability in retirement projections" />
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
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Inflation Assumption (%)" value={riskGoals.inflationAssumptionPercent ?? ''} onChange={e => setRiskGoals(p => ({ ...p, inflationAssumptionPercent: Number(e.target.value) || null }))} inputProps={{ min: 0, max: 15, step: 0.1 }} helperText="Adjusts projections to nominal dollars" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="number" label="Projected Retirement Expenses ($/mo)" value={riskGoals.projectedMonthlyRetirementExpenses ?? ''} onChange={e => setRiskGoals(p => ({ ...p, projectedMonthlyRetirementExpenses: Number(e.target.value) || null }))} helperText="Estimated monthly expenses in retirement" />
                </Grid>
              </Grid>
              {riskGoals.passiveIncomeGoal && riskGoals.inflationAssumptionPercent && riskGoals.targetRetirementDate && (() => {
                const yearsForward = Math.max(0, new Date(riskGoals.targetRetirementDate).getFullYear() - new Date().getFullYear());
                if (yearsForward <= 0) return null;
                const inflated = riskGoals.passiveIncomeGoal * Math.pow(1 + riskGoals.inflationAssumptionPercent / 100, yearsForward);
                return (
                  <Typography variant="body2" color="text.secondary">
                    Monthly Passive Income Goal: ${riskGoals.passiveIncomeGoal.toLocaleString()}/mo (${Math.round(inflated).toLocaleString()} inflation-adjusted to {new Date(riskGoals.targetRetirementDate).getFullYear()} at {riskGoals.inflationAssumptionPercent}%)
                  </Typography>
                );
              })()}
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
                FEGLI, FEHB, FERS pension, and supplemental coverage. Upload an LES to auto-fill.
              </Typography>
              {uploadError && <Alert severity="error" onClose={() => setUploadError(null)}>{uploadError}</Alert>}

              {/* PDF Upload */}
              <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" gutterBottom>Quick Import from Documents</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => lesInputRef.current?.click()} size="small">Upload LES</Button>
                  <input ref={lesInputRef} type="file" accept=".pdf" hidden onChange={handleLesUpload} />
                </Stack>
                {lesStatus && <Chip icon={<CheckCircleOutlineIcon />} label={lesStatus} color="success" size="small" sx={{ mt: 1 }} />}
                {fedBen?.lastLesFileName && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Last LES: {fedBen.lastLesFileName}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Federal Employment Info */}
              <Typography variant="subtitle1" fontWeight={600}>Federal Employment</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Government Agency" size="small" value={userCore.governmentAgency ?? ''} onChange={e => setUserCore(p => ({ ...p, governmentAgency: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Pay Grade" size="small" value={userCore.payGrade ?? ''} onChange={e => setUserCore(p => ({ ...p, payGrade: e.target.value }))} placeholder="e.g. GS-13" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Retirement System</InputLabel>
                    <Select value={userCore.retirementSystem ?? ''} label="Retirement System" onChange={e => setUserCore(p => ({ ...p, retirementSystem: e.target.value }))}>
                      {RETIREMENT_SYSTEMS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="date" label="Service Computation Date" size="small" value={userCore.serviceComputationDate?.split('T')[0] ?? ''} onChange={e => setUserCore(p => ({ ...p, serviceComputationDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
              </Grid>

              <Divider />

              {/* FERS Pension */}
              <Typography variant="subtitle1" fontWeight={600}>FERS Pension</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="High-3 Average Salary" type="number" size="small" value={numStrTrunc(fedForm.high3AverageSalary)} onChange={e => updateFed('high3AverageSalary', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Projected Annual Annuity" type="number" size="small" value={numStrTrunc(fedForm.projectedAnnuity)} onChange={e => updateFed('projectedAnnuity', parseNum(e.target.value))} inputProps={{ min: 0 }} helperText={(userCore as User)?.serviceComputationDate && fedForm.high3AverageSalary ? '1.0% × High-3 × service (today)' : undefined} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Projected Monthly Pension" type="number" size="small" value={numStrTrunc(fedForm.projectedMonthlyPension)} onChange={e => updateFed('projectedMonthlyPension', parseNum(e.target.value))} inputProps={{ min: 0 }} helperText={(userCore as User)?.serviceComputationDate && fedForm.high3AverageSalary ? 'Auto-calculated' : undefined} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField fullWidth label="Creditable Years" type="number" size="small" value={numStr(fedForm.creditableYearsOfService)} onChange={e => updateFed('creditableYearsOfService', parseNum(e.target.value) != null ? Math.floor(parseNum(e.target.value)!) : null)} inputProps={{ min: 0 }} helperText={(userCore as User)?.serviceComputationDate ? 'From SCD' : undefined} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField fullWidth label="Creditable Months" type="number" size="small" value={numStr(fedForm.creditableMonthsOfService)} onChange={e => updateFed('creditableMonthsOfService', parseNum(e.target.value) != null ? Math.floor(parseNum(e.target.value)!) : null)} inputProps={{ min: 0, max: 11 }} helperText={(userCore as User)?.serviceComputationDate ? 'From SCD' : undefined} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="FERS Cumulative Retirement" type="number" size="small" value={numStrTrunc(fedForm.fersCumulativeRetirement)} onChange={e => updateFed('fersCumulativeRetirement', parseNum(e.target.value))} inputProps={{ min: 0 }} helperText="YTD from LES" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControlLabel control={<Switch checked={fedForm.isEligibleForSpecialRetirementSupplement ?? false} onChange={(_, v) => updateFed('isEligibleForSpecialRetirementSupplement', v)} size="small" />} label="FERS Supplement Eligible" />
                  </Stack>
                </Grid>
                {fedForm.isEligibleForSpecialRetirementSupplement && (
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Est. Monthly Supplement" type="number" size="small" value={numStrTrunc(fedForm.estimatedSupplementMonthly)} onChange={e => updateFed('estimatedSupplementMonthly', parseNum(e.target.value))} inputProps={{ min: 0 }} helperText={fedForm.socialSecurityEstimateAt62 ? 'SS × (service/40)' : 'Enter SS estimate below'} />
                  </Grid>
                )}
              </Grid>

              <Divider />

              {/* FERS Retirement Projector */}
              <Typography variant="subtitle1" fontWeight={600}>Retirement Projector</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Compare retirement scenarios at different ages. Projections use OPM FERS formulas. Provide your SS estimate from ssa.gov and salary growth rate for more accurate results.
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="SS Benefit Estimate at 62 ($/mo)" type="number" size="small" value={numStrTrunc(fedForm.socialSecurityEstimateAt62)} onChange={e => updateFed('socialSecurityEstimateAt62', parseNum(e.target.value))} inputProps={{ min: 0 }} helperText="From ssa.gov/myaccount" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Annual Salary Growth Rate (%)" type="number" size="small" value={numStr(fedForm.annualSalaryGrowthRate)} onChange={e => updateFed('annualSalaryGrowthRate', parseNum(e.target.value))} inputProps={{ min: 0, max: 20, step: '0.1' }} helperText="e.g. 2.5 for 2.5%/yr" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Custom Retirement Age" type="number" size="small" value={projParams.customAge ?? ''} onChange={e => updateProjParam('customAge', e.target.value ? Number(e.target.value) : undefined)} inputProps={{ min: 50, max: 80 }} helperText="Add a what-if age (50–80)" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Survivor Benefit</InputLabel>
                    <Select label="Survivor Benefit" value={projParams.survivorElection ?? 'none'} onChange={e => updateProjParam('survivorElection', e.target.value === 'none' ? undefined : e.target.value)}>
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="25%">25% (−5% pension)</MenuItem>
                      <MenuItem value="50%">50% (−10% pension)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="COLA Rate (%)" type="number" size="small" value={projParams.colaRate ?? ''} onChange={e => updateProjParam('colaRate', e.target.value ? Number(e.target.value) : undefined)} inputProps={{ min: 0, max: 10, step: '0.1' }} helperText="Default 1.5%/yr" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="Monthly Income Goal ($)" type="number" size="small" value={projParams.incomeGoal ?? ''} onChange={e => updateProjParam('incomeGoal', e.target.value ? Number(e.target.value) : undefined)} inputProps={{ min: 0 }} helperText="Target retirement income" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Button variant="outlined" size="small" onClick={loadProjection} disabled={projectionLoading} sx={{ mt: 1 }}>
                    {projectionLoading ? 'Calculating…' : 'Refresh Projections'}
                  </Button>
                </Grid>
              </Grid>

              {projection && projection.scenarios.length > 0 && (() => {
                const hasCola = projection.scenarios.some(s => s.monthlyPensionAge85WithCola != null);
                const hasSurvivor = projection.scenarios.some(s => s.survivorElection && s.survivorElection !== 'none');
                const hasTax = projection.scenarios.some(s => s.afterTaxMonthlyIncome != null);
                const hasGap = projection.scenarios.some(s => s.monthlyIncomeGap != null);
                const hasVa = projection.scenarios.some(s => s.vaDisabilityMonthly != null);
                return (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell align="right">Age</TableCell>
                        <TableCell align="right">Service</TableCell>
                        <TableCell align="right">High-3</TableCell>
                        <TableCell align="right">Annual Annuity</TableCell>
                        <TableCell align="right">Monthly Pension</TableCell>
                        {hasCola && <TableCell align="right">Pension@85</TableCell>}
                        {hasSurvivor && <TableCell align="right">Survivor</TableCell>}
                        <TableCell align="right">Supplement</TableCell>
                        <TableCell align="right">SS at 62</TableCell>
                        {hasVa && <TableCell align="right">VA Disability</TableCell>}
                        <TableCell align="right">TSP Balance</TableCell>
                        <TableCell align="right">TSP/mo</TableCell>
                        <TableCell align="right">Total Monthly</TableCell>
                        {hasTax && <TableCell align="right">After-Tax</TableCell>}
                        {hasGap && <TableCell align="right">Income Gap</TableCell>}
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projection.scenarios.map((s, i) => (
                        <TableRow key={i} sx={{ opacity: s.isEligible ? 1 : 0.5 }}>
                          <TableCell sx={{ fontWeight: 600 }}>{s.label}</TableCell>
                          <TableCell align="right">{s.retirementAge}{s.retirementAgeMonths > 0 ? `+${s.retirementAgeMonths}mo` : ''}</TableCell>
                          <TableCell align="right">{s.projectedServiceYears}y {s.projectedServiceMonths}m</TableCell>
                          <TableCell align="right">{fmt$(s.projectedHigh3)}</TableCell>
                          <TableCell align="right">{fmt$(s.annualAnnuity)}</TableCell>
                          <TableCell align="right">
                            {fmt$(s.monthlyPension)}
                            {hasSurvivor && s.survivorBenefitReduction != null && s.survivorBenefitReduction > 0 && (
                              <Typography variant="caption" display="block" color="warning.main">
                                −{(s.survivorBenefitReduction * 100).toFixed(0)}% elected
                              </Typography>
                            )}
                          </TableCell>
                          {hasCola && (
                            <TableCell align="right">
                              {s.monthlyPensionAge85WithCola != null ? (
                                <>
                                  {fmt$(s.monthlyPensionAge85WithCola)}
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {s.colaRatePercent ?? 1.5}%/yr COLA
                                  </Typography>
                                </>
                              ) : '—'}
                            </TableCell>
                          )}
                          {hasSurvivor && (
                            <TableCell align="right">
                              {s.survivorBenefitMonthly != null && s.survivorBenefitMonthly > 0 ? (
                                <>
                                  {fmt$(s.survivorBenefitMonthly)}/mo
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {s.survivorElection} to spouse
                                  </Typography>
                                </>
                              ) : '—'}
                            </TableCell>
                          )}
                          <TableCell align="right">{s.supplementEligible ? `${fmt$(s.monthlySupplementEstimate)}/mo × ${s.supplementMonths}mo` : '—'}</TableCell>
                          <TableCell align="right">{s.socialSecurityMonthly != null ? fmt$(s.socialSecurityMonthly) : '—'}</TableCell>
                          {hasVa && (
                            <TableCell align="right">
                              {s.vaDisabilityMonthly != null ? (
                                <>
                                  {fmt$(s.vaDisabilityMonthly)}
                                  <Typography variant="caption" display="block" color="text.secondary">tax-free</Typography>
                                </>
                              ) : '—'}
                            </TableCell>
                          )}
                          <TableCell align="right">
                            {s.projectedTspBalance != null ? fmt$(s.projectedTspBalance) : '—'}
                            {s.projectedTspRothBalance != null && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Roth: {fmt$(s.projectedTspRothBalance)} · Trad: {fmt$(s.projectedTspTraditionalBalance ?? 0)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {s.monthlyTspWithdrawal != null ? fmt$(s.monthlyTspWithdrawal) : '—'}
                            {s.monthlyTspRothWithdrawal != null && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Roth: {fmt$(s.monthlyTspRothWithdrawal)}/mo · Trad: {fmt$(s.monthlyTspTraditionalWithdrawal ?? 0)}/mo
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt$(s.totalMonthlyRetirementIncome)}</TableCell>
                          {hasTax && (
                            <TableCell align="right">
                              {s.afterTaxMonthlyIncome != null ? (
                                <>
                                  {fmt$(s.afterTaxMonthlyIncome)}
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Fed: {fmt$(s.estimatedFederalTaxMonthly ?? 0)} · St: {fmt$(s.estimatedStateTaxMonthly ?? 0)}
                                  </Typography>
                                </>
                              ) : '—'}
                            </TableCell>
                          )}
                          {hasGap && (
                            <TableCell align="right">
                              {s.monthlyIncomeGap != null ? (
                                <Chip
                                  size="small"
                                  label={`${s.monthlyIncomeGap >= 0 ? '+' : ''}${fmt$(s.monthlyIncomeGap)}`}
                                  color={s.monthlyIncomeGap >= 0 ? 'success' : 'error'}
                                  variant="outlined"
                                />
                              ) : '—'}
                            </TableCell>
                          )}
                          <TableCell>
                            {!s.isEligible && <Chip label="Not eligible" size="small" color="error" variant="outlined" />}
                            {s.eligibilityNote && <Typography variant="caption" color="text.secondary">{s.eligibilityNote}</Typography>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                );
              })()}

              {projection && projection.inputs?.inflationAssumptionPercent != null && projection.inputs.inflationAssumptionPercent > 0 && (
                <Typography variant="caption" color="text.secondary">
                  SS, Supplement, and VA disability amounts are inflation-adjusted to nominal dollars at {projection.inputs.inflationAssumptionPercent}%/yr. Set in Risk &amp; Goals tab.
                </Typography>
              )}

              {!projection && !projectionLoading && (userCore as User)?.serviceComputationDate && (userCore as User)?.dateOfBirth && (
                <Typography variant="body2" color="text.secondary">
                  Save your profile to generate retirement projections.
                </Typography>
              )}

              {!projection && !projectionLoading && (!(userCore as User)?.serviceComputationDate || !(userCore as User)?.dateOfBirth) && (
                <Typography variant="body2" color="text.secondary">
                  Set your Date of Birth and Service Computation Date to enable retirement projections.
                </Typography>
              )}

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
                      <TextField fullWidth label="Basic Coverage Amount" type="number" size="small" value={numStrTrunc(fedForm.fegliBasicCoverage)} onChange={e => updateFed('fegliBasicCoverage', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Total Monthly Premium" type="number" size="small" value={numStrTrunc(fedForm.fegliTotalMonthlyPremium)} onChange={e => updateFed('fegliTotalMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
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
                  <TextField fullWidth label="Monthly Premium" type="number" size="small" value={numStrTrunc(fedForm.fehbMonthlyPremium)} onChange={e => updateFed('fehbMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth label="Employer Pays" type="number" size="small" value={numStrTrunc(fedForm.fehbEmployerContribution)} onChange={e => updateFed('fehbEmployerContribution', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
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
                      <TextField label="Monthly Premium" type="number" size="small" value={numStrTrunc(fedForm.fedvipDentalMonthlyPremium)} onChange={e => updateFed('fedvipDentalMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasFedvipVision} onChange={(_, v) => updateFed('hasFedvipVision', v)} size="small" />} label="FEDVIP Vision" />
                    {fedForm.hasFedvipVision && (
                      <TextField label="Monthly Premium" type="number" size="small" value={numStrTrunc(fedForm.fedvipVisionMonthlyPremium)} onChange={e => updateFed('fedvipVisionMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasFltcip} onChange={(_, v) => updateFed('hasFltcip', v)} size="small" />} label="FLTCIP (Long-Term Care)" />
                    {fedForm.hasFltcip && (
                      <TextField label="Monthly Premium" type="number" size="small" value={numStrTrunc(fedForm.fltcipMonthlyPremium)} onChange={e => updateFed('fltcipMonthlyPremium', parseNum(e.target.value))} inputProps={{ min: 0, step: '0.01' }} />
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
                      <TextField label="Annual Election" type="number" size="small" value={numStrTrunc(fedForm.fsaAnnualElection)} onChange={e => updateFed('fsaAnnualElection', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack>
                    <FormControlLabel control={<Switch checked={fedForm.hasHsa} onChange={(_, v) => updateFed('hasHsa', v)} size="small" />} label="HSA Enrolled" />
                    {fedForm.hasHsa && (
                      <>
                        <TextField label="HSA Balance" type="number" size="small" sx={{ mb: 1 }} value={numStrTrunc(fedForm.hsaBalance)} onChange={e => updateFed('hsaBalance', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                        <TextField label="Annual Contribution" type="number" size="small" value={numStrTrunc(fedForm.hsaAnnualContribution)} onChange={e => updateFed('hsaAnnualContribution', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                      </>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Divider />

              {/* Leave Balances */}
              <Typography variant="subtitle1" fontWeight={600}>Leave Balances</Typography>
              <Typography variant="caption" color="text.secondary">From most recent LES upload. Sick leave is credited toward FERS retirement service.</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Annual Leave (hours)" type="number" size="small" fullWidth value={numStrTrunc(fedForm.annualLeaveBalance)} onChange={e => updateFed('annualLeaveBalance', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Sick Leave (hours)" type="number" size="small" fullWidth value={numStrTrunc(fedForm.sickLeaveBalance)} onChange={e => updateFed('sickLeaveBalance', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
              </Grid>

              <Divider />

              {/* Tax Withholding */}
              <Typography variant="subtitle1" fontWeight={600}>Tax Withholding (Biweekly)</Typography>
              <Typography variant="caption" color="text.secondary">Biweekly deduction amounts from LES. Used by AI advisor for tax analysis.</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField label="Federal Tax" type="number" size="small" fullWidth value={numStrTrunc(fedForm.federalTaxWithholdingBiweekly)} onChange={e => updateFed('federalTaxWithholdingBiweekly', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField label="State Tax" type="number" size="small" fullWidth value={numStrTrunc(fedForm.stateTaxWithholdingBiweekly)} onChange={e => updateFed('stateTaxWithholdingBiweekly', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField label="OASDI (Social Security)" type="number" size="small" fullWidth value={numStrTrunc(fedForm.oasdiDeductionBiweekly)} onChange={e => updateFed('oasdiDeductionBiweekly', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField label="Medicare" type="number" size="small" fullWidth value={numStrTrunc(fedForm.medicareDeductionBiweekly)} onChange={e => updateFed('medicareDeductionBiweekly', parseNum(e.target.value))} inputProps={{ min: 0 }} />
                </Grid>
              </Grid>

              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveFederalBenefits} disabled={saving}>Save Federal Benefits</Button>
            </Stack>
          </Box>
        </TabPanel>

        {/* ─── TAB 9: ESTATE PLANNING ─── */}
        <TabPanel value={tab} index={9}>
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Estate Planning Documents</Typography>
              <Typography variant="body2" color="text.secondary">
                Track which essential estate planning documents you have in place. This helps identify gaps and feeds your AI advisor.
              </Typography>

              {/* Document Checklist */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={<Switch checked={estateForm.hasWill} onChange={(_, v) => updateEstate('hasWill', v)} />}
                      label="Last Will & Testament"
                    />
                    {estateForm.hasWill && (
                      <TextField
                        label="Last Reviewed"
                        type="date"
                        size="small"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={estateForm.willLastReviewedDate?.slice(0, 10) ?? ''}
                        onChange={e => updateEstate('willLastReviewedDate', e.target.value || null)}
                      />
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={<Switch checked={estateForm.hasTrust} onChange={(_, v) => updateEstate('hasTrust', v)} />}
                      label="Trust"
                    />
                    {estateForm.hasTrust && (
                      <>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Trust Type</InputLabel>
                          <Select
                            label="Trust Type"
                            value={estateForm.trustType ?? ''}
                            onChange={e => updateEstate('trustType', e.target.value || null)}
                          >
                            <MenuItem value="Revocable">Revocable</MenuItem>
                            <MenuItem value="Irrevocable">Irrevocable</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          label="Last Reviewed"
                          type="date"
                          size="small"
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={estateForm.trustLastReviewedDate?.slice(0, 10) ?? ''}
                          onChange={e => updateEstate('trustLastReviewedDate', e.target.value || null)}
                        />
                      </>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Divider />

              {/* Powers of Attorney & Directives */}
              <Typography variant="subtitle1" fontWeight={600}>Powers of Attorney & Directives</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel
                    control={<Switch checked={estateForm.hasFinancialPOA} onChange={(_, v) => updateEstate('hasFinancialPOA', v)} />}
                    label="Financial Power of Attorney"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel
                    control={<Switch checked={estateForm.hasHealthcarePOA} onChange={(_, v) => updateEstate('hasHealthcarePOA', v)} />}
                    label="Healthcare Power of Attorney"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel
                    control={<Switch checked={estateForm.hasAdvanceDirective} onChange={(_, v) => updateEstate('hasAdvanceDirective', v)} />}
                    label="Advance Directive / Living Will"
                  />
                </Grid>
              </Grid>

              <Divider />

              {/* Attorney Info */}
              <Typography variant="subtitle1" fontWeight={600}>Attorney Information</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Attorney Name"
                    size="small"
                    fullWidth
                    value={estateForm.attorneyName ?? ''}
                    onChange={e => updateEstate('attorneyName', e.target.value || null)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Last Consultation Date"
                    type="date"
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={estateForm.attorneyLastConsultDate?.slice(0, 10) ?? ''}
                    onChange={e => updateEstate('attorneyLastConsultDate', e.target.value || null)}
                  />
                </Grid>
              </Grid>

              <Divider />

              {/* Notes */}
              <TextField
                label="Estate Planning Notes"
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                value={estateForm.notes ?? ''}
                onChange={e => updateEstate('notes', e.target.value || null)}
                helperText="Any additional details about your estate plan, upcoming reviews, or items to discuss with your attorney."
              />

              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveEstatePlanning} disabled={saving}>
                Save Estate Planning
              </Button>
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
