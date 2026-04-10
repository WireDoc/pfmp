import { useCallback, useMemo, useState, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { FinancialProfileSectionStatusValue } from '../../services/financialProfileApi';
import {
  fetchFederalBenefits,
  saveFederalBenefits,
  applySf50,
  applyLes,
  type SaveFederalBenefitsRequest,
  type FederalBenefitsProfile,
} from '../../services/federalBenefitsApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

type Props = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

// ── Helpers ──

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numStr(v: number | null | undefined): string {
  return v != null ? String(v) : '';
}

const COVERAGE_LEVEL_OPTIONS = [
  { value: 'Self Only', label: 'Self Only' },
  { value: 'Self Plus One', label: 'Self Plus One' },
  { value: 'Self and Family', label: 'Self and Family' },
];

// ── Component ──

export default function FederalBenefitsSectionForm({ userId, onStatusChange, currentStatus }: Props) {
  // Opt-out
  const [optedOut, setOptedOut] = useState(false);
  const [optOutReason, setOptOutReason] = useState('');

  // Pension fields
  const [high3, setHigh3] = useState('');
  const [projectedAnnuity, setProjectedAnnuity] = useState('');
  const [projectedMonthlyPension, setProjectedMonthlyPension] = useState('');
  const [creditableYears, setCreditableYears] = useState('');
  const [creditableMonths, setCreditableMonths] = useState('');
  const [supplementEligible, setSupplementEligible] = useState(false);
  const [supplementMonthly, setSupplementMonthly] = useState('');

  // FEGLI
  const [hasFegliBasic, setHasFegliBasic] = useState(false);
  const [fegliBasicCoverage, setFegliBasicCoverage] = useState('');
  const [hasFegliA, setHasFegliA] = useState(false);
  const [hasFegliB, setHasFegliB] = useState(false);
  const [fegliBMultiple, setFegliBMultiple] = useState('');
  const [hasFegliC, setHasFegliC] = useState(false);
  const [fegliCMultiple, setFegliCMultiple] = useState('');
  const [fegliPremium, setFegliPremium] = useState('');

  // FEHB
  const [fehbPlan, setFehbPlan] = useState('');
  const [fehbCoverage, setFehbCoverage] = useState('');
  const [fehbPremium, setFehbPremium] = useState('');
  const [fehbEmployer, setFehbEmployer] = useState('');

  // FEDVIP
  const [hasDental, setHasDental] = useState(false);
  const [dentalPremium, setDentalPremium] = useState('');
  const [hasVision, setHasVision] = useState(false);
  const [visionPremium, setVisionPremium] = useState('');

  // FLTCIP
  const [hasFltcip, setHasFltcip] = useState(false);
  const [fltcipPremium, setFltcipPremium] = useState('');

  // FSA/HSA
  const [hasFsa, setHasFsa] = useState(false);
  const [fsaElection, setFsaElection] = useState('');
  const [hasHsa, setHasHsa] = useState(false);
  const [hsaBalance, setHsaBalance] = useState('');
  const [hsaContribution, setHsaContribution] = useState('');

  // Upload state
  const [sf50Status, setSf50Status] = useState<string | null>(null);
  const [lesStatus, setLesStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSf50, setLastSf50] = useState<string | null>(null);
  const [lastLes, setLastLes] = useState<string | null>(null);
  const sf50InputRef = useRef<HTMLInputElement>(null);
  const lesInputRef = useRef<HTMLInputElement>(null);

  // ── Hydration ──
  const applyProfile = useCallback((p: FederalBenefitsProfile) => {
    setHigh3(numStr(p.high3AverageSalary));
    setProjectedAnnuity(numStr(p.projectedAnnuity));
    setProjectedMonthlyPension(numStr(p.projectedMonthlyPension));
    setCreditableYears(numStr(p.creditableYearsOfService));
    setCreditableMonths(numStr(p.creditableMonthsOfService));
    setSupplementEligible(p.isEligibleForSpecialRetirementSupplement ?? false);
    setSupplementMonthly(numStr(p.estimatedSupplementMonthly));

    setHasFegliBasic(p.hasFegliBasic);
    setFegliBasicCoverage(numStr(p.fegliBasicCoverage));
    setHasFegliA(p.hasFegliOptionA);
    setHasFegliB(p.hasFegliOptionB);
    setFegliBMultiple(numStr(p.fegliOptionBMultiple));
    setHasFegliC(p.hasFegliOptionC);
    setFegliCMultiple(numStr(p.fegliOptionCMultiple));
    setFegliPremium(numStr(p.fegliTotalMonthlyPremium));

    setFehbPlan(p.fehbPlanName ?? '');
    setFehbCoverage(p.fehbCoverageLevel ?? '');
    setFehbPremium(numStr(p.fehbMonthlyPremium));
    setFehbEmployer(numStr(p.fehbEmployerContribution));

    setHasDental(p.hasFedvipDental);
    setDentalPremium(numStr(p.fedvipDentalMonthlyPremium));
    setHasVision(p.hasFedvipVision);
    setVisionPremium(numStr(p.fedvipVisionMonthlyPremium));

    setHasFltcip(p.hasFltcip);
    setFltcipPremium(numStr(p.fltcipMonthlyPremium));

    setHasFsa(p.hasFsa);
    setFsaElection(numStr(p.fsaAnnualElection));
    setHasHsa(p.hasHsa);
    setHsaBalance(numStr(p.hsaBalance));
    setHsaContribution(numStr(p.hsaAnnualContribution));

    setLastSf50(p.lastSf50FileName);
    setLastLes(p.lastLesFileName);
  }, []);

  useSectionHydration({
    sectionKey: 'federal-benefits',
    userId,
    fetcher: fetchFederalBenefits,
    mapPayloadToState: (p) => p,
    applyState: (p) => { if (p) applyProfile(p); },
  });

  // ── Build save payload ──
  const buildPayload = useCallback((): SaveFederalBenefitsRequest => ({
    high3AverageSalary: parseNum(high3),
    projectedAnnuity: parseNum(projectedAnnuity),
    projectedMonthlyPension: parseNum(projectedMonthlyPension),
    creditableYearsOfService: parseNum(creditableYears) != null ? Math.floor(parseNum(creditableYears)!) : null,
    creditableMonthsOfService: parseNum(creditableMonths) != null ? Math.floor(parseNum(creditableMonths)!) : null,
    isEligibleForSpecialRetirementSupplement: supplementEligible,
    estimatedSupplementMonthly: parseNum(supplementMonthly),

    hasFegliBasic,
    fegliBasicCoverage: parseNum(fegliBasicCoverage),
    hasFegliOptionA: hasFegliA,
    hasFegliOptionB: hasFegliB,
    fegliOptionBMultiple: parseNum(fegliBMultiple) != null ? Math.floor(parseNum(fegliBMultiple)!) : null,
    hasFegliOptionC: hasFegliC,
    fegliOptionCMultiple: parseNum(fegliCMultiple) != null ? Math.floor(parseNum(fegliCMultiple)!) : null,
    fegliTotalMonthlyPremium: parseNum(fegliPremium),

    fehbPlanName: fehbPlan || null,
    fehbCoverageLevel: fehbCoverage || null,
    fehbMonthlyPremium: parseNum(fehbPremium),
    fehbEmployerContribution: parseNum(fehbEmployer),

    hasFedvipDental: hasDental,
    fedvipDentalMonthlyPremium: parseNum(dentalPremium),
    hasFedvipVision: hasVision,
    fedvipVisionMonthlyPremium: parseNum(visionPremium),

    hasFltcip,
    fltcipMonthlyPremium: parseNum(fltcipPremium),

    hasFsa,
    fsaAnnualElection: parseNum(fsaElection),
    hasHsa,
    hsaBalance: parseNum(hsaBalance),
    hsaAnnualContribution: parseNum(hsaContribution),
  }), [
    high3, projectedAnnuity, projectedMonthlyPension, creditableYears, creditableMonths,
    supplementEligible, supplementMonthly, hasFegliBasic, fegliBasicCoverage, hasFegliA,
    hasFegliB, fegliBMultiple, hasFegliC, fegliCMultiple, fegliPremium, fehbPlan, fehbCoverage,
    fehbPremium, fehbEmployer, hasDental, dentalPremium, hasVision, visionPremium, hasFltcip,
    fltcipPremium, hasFsa, fsaElection, hasHsa, hsaBalance, hsaContribution,
  ]);

  const persist = useCallback(
    async (payload: SaveFederalBenefitsRequest) => { await saveFederalBenefits(userId, payload); },
    [userId],
  );

  const deriveStatus = useCallback((): FinancialProfileSectionStatusValue => {
    if (optedOut) return 'opted_out';
    const hasAnyData = high3 || hasFegliBasic || fehbPlan || hasDental || hasVision || hasFltcip || hasFsa || hasHsa;
    return hasAnyData ? 'completed' : 'needs_info';
  }, [optedOut, high3, hasFegliBasic, fehbPlan, hasDental, hasVision, hasFltcip, hasFsa, hasHsa]);

  const payload = useMemo(buildPayload, [buildPayload]);

  const { status, lastSavedAt, error } = useAutoSaveForm<SaveFederalBenefitsRequest>({
    data: payload,
    persist,
    determineStatus: deriveStatus,
    onStatusResolved: onStatusChange,
    debounceMs: 800,
  });

  // ── PDF Upload Handlers ──
  const handleSf50Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setSf50Status('Uploading SF-50…');
    try {
      const result = await applySf50(userId, file);
      applyProfile(result);
      setSf50Status(`SF-50 applied — fields updated from ${file.name}`);
      setLastSf50(file.name);
    } catch {
      setUploadError('Failed to parse SF-50. Ensure it is a valid PDF.');
      setSf50Status(null);
    }
    if (sf50InputRef.current) sf50InputRef.current.value = '';
  }, [userId, applyProfile]);

  const handleLesUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setLesStatus('Uploading LES…');
    try {
      const result = await applyLes(userId, file);
      applyProfile(result);
      setLesStatus(`LES applied — deductions updated from ${file.name}`);
      setLastLes(file.name);
    } catch {
      setUploadError('Failed to parse LES. Ensure it is a valid PDF.');
      setLesStatus(null);
    }
    if (lesInputRef.current) lesInputRef.current.value = '';
  }, [userId, applyProfile]);

  // ── Render ──
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Federal Benefits Profile</Typography>
        <AutoSaveIndicator status={status} lastSavedAt={lastSavedAt} />
      </Box>

      <FormControlLabel
        control={<Switch checked={optedOut} onChange={(e) => setOptedOut(e.target.checked)} color="primary" />}
        label="I don't need federal benefits tracking"
      />

      {optedOut ? (
        <TextField
          label="Why are you opting out?"
          value={optOutReason}
          onChange={(e) => setOptOutReason(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
      ) : (
      <>
      {error && <Alert severity="error">{error}</Alert>}
      {uploadError && <Alert severity="error" onClose={() => setUploadError(null)}>{uploadError}</Alert>}

      {/* ── PDF Upload Section ── */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>Quick Import from Documents</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload your SF-50 or LES (PDF) to auto-fill fields. You can still edit values manually after import.
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => sf50InputRef.current?.click()}
            size="small"
          >
            Upload SF-50
          </Button>
          <input ref={sf50InputRef} type="file" accept=".pdf" hidden onChange={handleSf50Upload} />

          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => lesInputRef.current?.click()}
            size="small"
          >
            Upload LES
          </Button>
          <input ref={lesInputRef} type="file" accept=".pdf" hidden onChange={handleLesUpload} />
        </Stack>
        {sf50Status && (
          <Chip icon={<CheckCircleOutlineIcon />} label={sf50Status} color="success" size="small" sx={{ mt: 1 }} />
        )}
        {lesStatus && (
          <Chip icon={<CheckCircleOutlineIcon />} label={lesStatus} color="success" size="small" sx={{ mt: 1, ml: 1 }} />
        )}
        {(lastSf50 || lastLes) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {lastSf50 && `Last SF-50: ${lastSf50}`}{lastSf50 && lastLes && ' · '}{lastLes && `Last LES: ${lastLes}`}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* ── FERS/CSRS Pension ── */}
      <Typography variant="subtitle1" fontWeight={600}>FERS / CSRS Pension</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="High-3 Average Salary"
            value={high3}
            onChange={(e) => setHigh3(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Projected Annual Annuity"
            value={projectedAnnuity}
            onChange={(e) => setProjectedAnnuity(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Projected Monthly Pension"
            value={projectedMonthlyPension}
            onChange={(e) => setProjectedMonthlyPension(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="Creditable Years"
            value={creditableYears}
            onChange={(e) => setCreditableYears(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="Creditable Months"
            value={creditableMonths}
            onChange={(e) => setCreditableMonths(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 11 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch checked={supplementEligible} onChange={(_, v) => setSupplementEligible(v)} size="small" />}
              label="FERS Supplement Eligible"
            />
            {supplementEligible && (
              <TextField
                label="Est. Monthly Supplement"
                value={supplementMonthly}
                onChange={(e) => setSupplementMonthly(e.target.value)}
                size="small"
                type="number"
                sx={{ width: 180 }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            )}
          </Stack>
        </Grid>
      </Grid>

      <Divider />

      {/* ── FEGLI ── */}
      <Typography variant="subtitle1" fontWeight={600}>FEGLI (Life Insurance)</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControlLabel
            control={<Switch checked={hasFegliBasic} onChange={(_, v) => setHasFegliBasic(v)} size="small" />}
            label="Basic FEGLI"
          />
        </Grid>
        {hasFegliBasic && (
          <>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Basic Coverage Amount"
                value={fegliBasicCoverage}
                onChange={(e) => setFegliBasicCoverage(e.target.value)}
                fullWidth
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Total Monthly Premium"
                value={fegliPremium}
                onChange={(e) => setFegliPremium(e.target.value)}
                fullWidth
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <FormControlLabel
                control={<Switch checked={hasFegliA} onChange={(_, v) => setHasFegliA(v)} size="small" />}
                label="Option A"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={<Switch checked={hasFegliB} onChange={(_, v) => setHasFegliB(v)} size="small" />}
                  label="Option B"
                />
                {hasFegliB && (
                  <Select
                    value={fegliBMultiple || '1'}
                    onChange={(e) => setFegliBMultiple(e.target.value)}
                    size="small"
                    sx={{ width: 80 }}
                  >
                    {[1, 2, 3, 4, 5].map((m) => (
                      <MenuItem key={m} value={String(m)}>{m}×</MenuItem>
                    ))}
                  </Select>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={<Switch checked={hasFegliC} onChange={(_, v) => setHasFegliC(v)} size="small" />}
                  label="Option C"
                />
                {hasFegliC && (
                  <Select
                    value={fegliCMultiple || '1'}
                    onChange={(e) => setFegliCMultiple(e.target.value)}
                    size="small"
                    sx={{ width: 80 }}
                  >
                    {[1, 2, 3, 4, 5].map((m) => (
                      <MenuItem key={m} value={String(m)}>{m}×</MenuItem>
                    ))}
                  </Select>
                )}
              </Stack>
            </Grid>
          </>
        )}
      </Grid>

      <Divider />

      {/* ── FEHB ── */}
      <Typography variant="subtitle1" fontWeight={600}>FEHB (Health Insurance)</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Plan Name"
            value={fehbPlan}
            onChange={(e) => setFehbPlan(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Coverage Level"
            value={fehbCoverage}
            onChange={(e) => setFehbCoverage(e.target.value)}
            fullWidth
            size="small"
            select
          >
            <MenuItem value="">—</MenuItem>
            {COVERAGE_LEVEL_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <TextField
            label="Monthly Premium"
            value={fehbPremium}
            onChange={(e) => setFehbPremium(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <TextField
            label="Employer Pays"
            value={fehbEmployer}
            onChange={(e) => setFehbEmployer(e.target.value)}
            fullWidth
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
          />
        </Grid>
      </Grid>

      <Divider />

      {/* ── FEDVIP / FLTCIP ── */}
      <Typography variant="subtitle1" fontWeight={600}>FEDVIP & Long-Term Care</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack>
            <FormControlLabel
              control={<Switch checked={hasDental} onChange={(_, v) => setHasDental(v)} size="small" />}
              label="FEDVIP Dental"
            />
            {hasDental && (
              <TextField
                label="Monthly Premium"
                value={dentalPremium}
                onChange={(e) => setDentalPremium(e.target.value)}
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            )}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack>
            <FormControlLabel
              control={<Switch checked={hasVision} onChange={(_, v) => setHasVision(v)} size="small" />}
              label="FEDVIP Vision"
            />
            {hasVision && (
              <TextField
                label="Monthly Premium"
                value={visionPremium}
                onChange={(e) => setVisionPremium(e.target.value)}
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            )}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack>
            <FormControlLabel
              control={<Switch checked={hasFltcip} onChange={(_, v) => setHasFltcip(v)} size="small" />}
              label="FLTCIP (Long-Term Care)"
            />
            {hasFltcip && (
              <TextField
                label="Monthly Premium"
                value={fltcipPremium}
                onChange={(e) => setFltcipPremium(e.target.value)}
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            )}
          </Stack>
        </Grid>
      </Grid>

      <Divider />

      {/* ── FSA / HSA ── */}
      <Typography variant="subtitle1" fontWeight={600}>FSA & HSA</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack>
            <FormControlLabel
              control={<Switch checked={hasFsa} onChange={(_, v) => setHasFsa(v)} size="small" />}
              label="Flexible Spending Account (FSA)"
            />
            {hasFsa && (
              <TextField
                label="Annual Election"
                value={fsaElection}
                onChange={(e) => setFsaElection(e.target.value)}
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
              />
            )}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack>
            <FormControlLabel
              control={<Switch checked={hasHsa} onChange={(_, v) => setHasHsa(v)} size="small" />}
              label="Health Savings Account (HSA)"
            />
            {hasHsa && (
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Balance"
                  value={hsaBalance}
                  onChange={(e) => setHsaBalance(e.target.value)}
                  size="small"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  label="Annual Contribution"
                  value={hsaContribution}
                  onChange={(e) => setHsaContribution(e.target.value)}
                  size="small"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              </Stack>
            )}
          </Stack>
        </Grid>
      </Grid>
      </>
      )}
    </Stack>
  );
}
