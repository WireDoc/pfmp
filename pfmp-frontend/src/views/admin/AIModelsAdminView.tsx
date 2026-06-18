import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Button, TextField, MenuItem, IconButton,
  Tooltip, Chip, Alert, CircularProgress, Divider, Autocomplete, FormControl,
  InputLabel, Select, Switch, FormControlLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import {
  fetchAIModels, upsertSlot, testSlot, fetchCatalog, refreshCatalog,
  type AIModelSlot, type AIReasoningEffort, type AISettingsUpsertPayload,
  type CatalogResponse, type SlotConfigEntry, type TestPingResponse,
  type AppsettingsDefaults,
} from '../../services/aiModelsAdminApi';

const SLOTS: AIModelSlot[] = ['Primary', 'Verifier', 'Chat', 'News', 'Fusion'];

const SLOT_DESCRIPTIONS: Record<AIModelSlot, string> = {
  Primary: 'Lead analyst for dashboard /api/ai/analyze endpoints. Speaks first in the Primary→Verifier flow.',
  Verifier: 'Second-pass reviewer that fact-checks Primary against the raw data.',
  Chat: 'Future chatbot turns (single-shot, fast). Used when AIPromptRequest.Mode = Chat.',
  News: 'Future news aggregator (Gemini Flash-tier). Cheap summarization workload.',
  Fusion: 'OpenRouter Fusion meta-route (dormant; Wave 22 Phase A rollback). General-high preset by default.',
};

const REASONING_EFFORTS: AIReasoningEffort[] = ['Minimal', 'Low', 'Medium', 'High', 'XHigh'];

// Each slot's editable form state. Distinguishes "use default" (null) from explicit empty.
interface SlotFormState {
  model: string;       // empty string = use default
  maxTokens: string;   // empty string = use default
  temperature: string; // empty string = use default
  topP: string;
  reasoningEffort: '' | AIReasoningEffort;
  reasoningExclude: '' | 'true' | 'false';
  reasoningMaxTokens: string;
  fusionPreset: string;
  fusionJudgeModel: string;
  fusionMaxToolCalls: string;
}

const emptyForm: SlotFormState = {
  model: '', maxTokens: '', temperature: '', topP: '',
  reasoningEffort: '', reasoningExclude: '', reasoningMaxTokens: '',
  fusionPreset: '', fusionJudgeModel: '', fusionMaxToolCalls: '',
};

function entryToForm(entry: SlotConfigEntry): SlotFormState {
  const r = entry.row;
  if (!r) return emptyForm;
  return {
    model: r.model ?? '',
    maxTokens: r.maxTokens?.toString() ?? '',
    temperature: r.temperature?.toString() ?? '',
    topP: r.topP?.toString() ?? '',
    reasoningEffort: r.reasoningEffort ?? '',
    reasoningExclude: r.reasoningExclude == null ? '' : (r.reasoningExclude ? 'true' : 'false'),
    reasoningMaxTokens: r.reasoningMaxTokens?.toString() ?? '',
    fusionPreset: r.fusionPreset ?? '',
    fusionJudgeModel: r.fusionJudgeModel ?? '',
    fusionMaxToolCalls: r.fusionMaxToolCalls?.toString() ?? '',
  };
}

function formToPayload(form: SlotFormState): AISettingsUpsertPayload {
  const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
  const strOrNull = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    model: strOrNull(form.model),
    maxTokens: numOrNull(form.maxTokens),
    temperature: numOrNull(form.temperature),
    topP: numOrNull(form.topP),
    reasoningEffort: form.reasoningEffort === '' ? null : form.reasoningEffort,
    reasoningExclude: form.reasoningExclude === '' ? null : form.reasoningExclude === 'true',
    reasoningMaxTokens: numOrNull(form.reasoningMaxTokens),
    fusionPreset: strOrNull(form.fusionPreset),
    fusionJudgeModel: strOrNull(form.fusionJudgeModel),
    fusionMaxToolCalls: numOrNull(form.fusionMaxToolCalls),
  };
}

function defaultModelFor(slot: AIModelSlot, defaults: AppsettingsDefaults): string {
  switch (slot) {
    case 'Primary': return defaults.primaryModel;
    case 'Verifier': return defaults.verifierModel;
    case 'Chat': return defaults.chatModel;
    case 'News': return defaults.newsModel;
    case 'Fusion': return defaults.fusionModel;
  }
}

export default function AIModelsAdminView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotConfigEntry[]>([]);
  const [defaults, setDefaults] = useState<AppsettingsDefaults | null>(null);
  const [forms, setForms] = useState<Record<AIModelSlot, SlotFormState>>({
    Primary: emptyForm, Verifier: emptyForm, Chat: emptyForm, News: emptyForm, Fusion: emptyForm,
  });
  const [savingSlot, setSavingSlot] = useState<AIModelSlot | null>(null);
  const [testingSlot, setTestingSlot] = useState<AIModelSlot | null>(null);
  const [testResults, setTestResults] = useState<Record<AIModelSlot, TestPingResponse | null>>({
    Primary: null, Verifier: null, Chat: null, News: null, Fusion: null,
  });
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchAIModels();
      setSlots(r.slots);
      setDefaults(r.appsettings);
      const formMap = {} as Record<AIModelSlot, SlotFormState>;
      for (const e of r.slots) formMap[e.slot] = entryToForm(e);
      setForms(formMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI model settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleFormChange = (slot: AIModelSlot, patch: Partial<SlotFormState>) => {
    setForms(prev => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
  };

  const handleSave = async (slot: AIModelSlot) => {
    setSavingSlot(slot);
    setError(null);
    try {
      const payload = formToPayload(forms[slot]);
      const updated = await upsertSlot(slot, payload);
      setSlots(prev => prev.map(s => (s.slot === slot ? updated : s)));
      setForms(prev => ({ ...prev, [slot]: entryToForm(updated) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to save ${slot}`);
    } finally {
      setSavingSlot(null);
    }
  };

  const handleClear = (slot: AIModelSlot) => {
    setForms(prev => ({ ...prev, [slot]: emptyForm }));
  };

  const handleTest = async (slot: AIModelSlot) => {
    setTestingSlot(slot);
    try {
      const r = await testSlot(slot);
      setTestResults(prev => ({ ...prev, [slot]: r }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestResults(prev => ({
        ...prev,
        [slot]: { slot, success: false, elapsedMs: 0, error: msg },
      }));
    } finally {
      setTestingSlot(null);
    }
  };

  const handleLoadCatalog = async (force: boolean) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const r = force ? await refreshCatalog() : await fetchCatalog();
      setCatalog(r);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'Catalog fetch failed');
    } finally {
      setCatalogLoading(false);
    }
  };

  const modelOptions = useMemo(() => catalog?.models.map(m => m.id) ?? [], [catalog]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={600}>AI Models</Typography>
          <Typography variant="body2" color="text.secondary">
            Per-slot model + sampling overrides. Empty fields fall back to <code>appsettings.json</code>.
            Wave 22 Phase C.
          </Typography>
        </Box>
        <Tooltip title="Reload from server">
          <IconButton onClick={loadAll}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Catalog controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight={600}>OpenRouter Model Catalog</Typography>
            <Typography variant="caption" color="text.secondary">
              {catalog
                ? `${catalog.count} models loaded · fetched ${new Date(catalog.fetchedAt).toLocaleString()}`
                : 'Not loaded. Click Load to fetch the model catalog from OpenRouter.'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={catalogLoading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
            disabled={catalogLoading}
            onClick={() => handleLoadCatalog(false)}
          >
            {catalog ? 'Catalog Loaded' : 'Load Catalog'}
          </Button>
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            disabled={catalogLoading}
            onClick={() => handleLoadCatalog(true)}
          >
            Refresh
          </Button>
        </Stack>
        {catalogError && <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setCatalogError(null)}>{catalogError}</Alert>}
      </Paper>

      {/* Per-slot editors */}
      <Stack spacing={2}>
        {SLOTS.map(slot => {
          const entry = slots.find(s => s.slot === slot);
          if (!entry) return null;
          const form = forms[slot];
          const resolved = entry.resolved;
          const test = testResults[slot];
          const isFusion = slot === 'Fusion';
          const defaultModel = defaults ? defaultModelFor(slot, defaults) : '';

          return (
            <Paper key={slot} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>{slot}</Typography>
                  <Typography variant="caption" color="text.secondary">{SLOT_DESCRIPTIONS[slot]}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Send a single 'Reply OK' ping to verify auth + alias resolution">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={testingSlot === slot ? <CircularProgress size={14} /> : <PlayCircleOutlineIcon />}
                      disabled={testingSlot === slot}
                      onClick={() => handleTest(slot)}
                    >
                      Test
                    </Button>
                  </Tooltip>
                  <Tooltip title="Clear all overrides for this slot (fall back to appsettings)">
                    <span>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleClear(slot)}
                      >
                        Clear
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={savingSlot === slot ? <CircularProgress size={14} /> : <SaveIcon />}
                    disabled={savingSlot === slot}
                    onClick={() => handleSave(slot)}
                  >
                    Save
                  </Button>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1} mb={2}>
                <Chip size="small" label={`resolved: ${resolved.model}`} color="primary" variant="outlined" />
                <Chip size="small" label={`source: ${resolved.fieldSources.Model ?? 'unset'}`} />
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Model field — Autocomplete from catalog if available, else plain text */}
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={modelOptions}
                  value={form.model}
                  onInputChange={(_e, v) => handleFormChange(slot, { model: v ?? '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Model slug"
                      placeholder={defaultModel}
                      helperText={`Default: ${defaultModel}`}
                    />
                  )}
                />
                <TextField
                  size="small"
                  label="Max tokens"
                  type="number"
                  value={form.maxTokens}
                  placeholder={defaults?.maxTokens.toString() ?? ''}
                  onChange={e => handleFormChange(slot, { maxTokens: e.target.value })}
                  helperText={`Default: ${defaults?.maxTokens ?? '(unset)'}`}
                />
                <TextField
                  size="small"
                  label="Temperature"
                  type="number"
                  inputProps={{ step: 0.05, min: 0, max: 2 }}
                  value={form.temperature}
                  placeholder={defaults?.temperature.toString() ?? ''}
                  onChange={e => handleFormChange(slot, { temperature: e.target.value })}
                  helperText={`Default: ${defaults?.temperature ?? '(unset)'}`}
                />
                <TextField
                  size="small"
                  label="Top P"
                  type="number"
                  inputProps={{ step: 0.05, min: 0, max: 1 }}
                  value={form.topP}
                  onChange={e => handleFormChange(slot, { topP: e.target.value })}
                  helperText="Default: (not sent)"
                />
                <FormControl size="small">
                  <InputLabel id={`reasoning-effort-${slot}`}>Reasoning effort</InputLabel>
                  <Select
                    labelId={`reasoning-effort-${slot}`}
                    label="Reasoning effort"
                    value={form.reasoningEffort}
                    onChange={e => handleFormChange(slot, { reasoningEffort: e.target.value as '' | AIReasoningEffort })}
                  >
                    <MenuItem value=""><em>(unset)</em></MenuItem>
                    {REASONING_EFFORTS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Reasoning max tokens"
                  type="number"
                  value={form.reasoningMaxTokens}
                  onChange={e => handleFormChange(slot, { reasoningMaxTokens: e.target.value })}
                  helperText="Default: (not sent)"
                />
              </Box>

              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={form.reasoningExclude === 'true'}
                    onChange={e => handleFormChange(slot, { reasoningExclude: e.target.checked ? 'true' : '' })}
                  />
                }
                label="Exclude reasoning tokens from response (billed but hidden)"
              />

              {isFusion && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Fusion-only fields</Typography>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                    <TextField
                      size="small"
                      label="Preset"
                      value={form.fusionPreset}
                      placeholder={defaults?.fusionPreset ?? ''}
                      onChange={e => handleFormChange(slot, { fusionPreset: e.target.value })}
                      helperText="general-high | general-budget"
                    />
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={modelOptions}
                      value={form.fusionJudgeModel}
                      onInputChange={(_e, v) => handleFormChange(slot, { fusionJudgeModel: v ?? '' })}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Judge model (override)"
                          placeholder={defaults?.fusionJudgeModel || '(preset default)'}
                          helperText="Empty = use preset's judge"
                        />
                      )}
                    />
                    <TextField
                      size="small"
                      label="Max tool calls"
                      type="number"
                      value={form.fusionMaxToolCalls}
                      placeholder={defaults?.fusionMaxToolCalls.toString() ?? ''}
                      onChange={e => handleFormChange(slot, { fusionMaxToolCalls: e.target.value })}
                      helperText={`Default: ${defaults?.fusionMaxToolCalls ?? '(unset)'}`}
                    />
                  </Box>
                </>
              )}

              {test && (
                <Alert
                  severity={test.success ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                  onClose={() => setTestResults(prev => ({ ...prev, [slot]: null }))}
                >
                  {test.success ? (
                    <>
                      <strong>OK</strong> — model: <code>{test.actualModel ?? test.requestedModel}</code> ·
                      latency: {Math.round(test.elapsedMs)}ms ·
                      cost: ${(test.cost ?? 0).toFixed(6)} ·
                      tokens: {test.tokens} ·
                      response: <em>"{test.response}"</em>
                    </>
                  ) : (
                    <>
                      <strong>FAIL</strong> — {test.error} ({Math.round(test.elapsedMs)}ms)
                    </>
                  )}
                </Alert>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
