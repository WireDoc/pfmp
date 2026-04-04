import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BalanceIcon from '@mui/icons-material/Balance';
import ShieldIcon from '@mui/icons-material/Shield';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDevUserId } from '../../dev/devUserState';
import { useDashboardData } from '../../services/dashboard/useDashboardData';
import type { AdviceItem } from '../../services/dashboard';
import { adviceService } from '../../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

interface AnalysisType {
  key: string;
  label: string;
  endpoint: string;
  icon: React.ReactNode;
  description: string;
}

const ANALYSIS_TYPES: AnalysisType[] = [
  { key: 'cash', label: 'Cash Optimization', endpoint: 'cash-optimization', icon: <MonetizationOnIcon />, description: 'Analyze cash positions and optimize yield across savings, money market, and CDs' },
  { key: 'rebalancing', label: 'Portfolio Rebalancing', endpoint: 'rebalancing', icon: <BalanceIcon />, description: 'Evaluate asset allocation drift and suggest rebalancing trades' },
  { key: 'tsp', label: 'TSP Analysis', endpoint: 'tsp', icon: <AccountBalanceIcon />, description: 'Review TSP fund allocation and contribution strategy' },
  { key: 'risk', label: 'Risk Assessment', endpoint: 'risk', icon: <ShieldIcon />, description: 'Assess overall portfolio risk vs your risk tolerance profile' },
  { key: 'full', label: 'Full Analysis', endpoint: 'full', icon: <AllInclusiveIcon />, description: 'Comprehensive financial review covering all areas' },
];

interface AnalysisResult {
  type: string;
  summary?: string;
  alertsGenerated?: number;
  adviceGenerated?: number;
  totalTokens?: number;
  totalCost?: number;
  analyzedAt?: string;
  detailedFindings?: Record<string, unknown>;
  error?: string;
}

const severityColor = (sev: string) => {
  switch (sev?.toLowerCase()) {
    case 'critical': case 'high': return 'error';
    case 'medium': case 'warn': return 'warning';
    default: return 'info';
  }
};

export function InsightsView() {
  const userId = useDevUserId() ?? 1;
  const { data, loading, refetch } = useDashboardData();
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState(0);
  const abortCtrl = useRef<AbortController | null>(null);

  const advice = data?.advice ?? [];
  const insights = data?.insights ?? [];

  const runAnalysis = useCallback(async (at: AnalysisType) => {
    setRunning(r => ({ ...r, [at.key]: true }));
    try {
      abortCtrl.current = new AbortController();
      const resp = await fetch(`${API_BASE_URL}/ai/analyze/${userId}/${at.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.current.signal,
      });
      if (!resp.ok) throw new Error(`Analysis failed (${resp.status})`);
      const body = await resp.json();
      setResults(r => ({ ...r, [at.key]: { type: at.key, ...body } }));
      setToast(`${at.label} complete`);
      refetch();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setResults(r => ({ ...r, [at.key]: { type: at.key, error: msg } }));
      setToast(`${at.label} failed: ${msg}`);
    } finally {
      setRunning(r => ({ ...r, [at.key]: false }));
    }
  }, [userId, refetch]);

  const handleAcceptAdvice = useCallback(async (id: number) => {
    try {
      await adviceService.accept(id);
      setToast('Advice accepted — task created');
      refetch();
    } catch { setToast('Failed to accept advice'); }
  }, [refetch]);

  const handleDismissAdvice = useCallback(async (id: number) => {
    try {
      await adviceService.dismiss(id);
      setToast('Advice dismissed');
      refetch();
    } catch { setToast('Failed to dismiss advice'); }
  }, [refetch]);

  const anyRunning = Object.values(running).some(Boolean);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Insights &amp; AI Analysis</Typography>
        <Tooltip title="Refresh dashboard data">
          <IconButton onClick={refetch} disabled={loading}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {anyRunning && <LinearProgress sx={{ mb: 2 }} />}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Run Analysis" />
        <Tab label={`Advice (${advice.length})`} />
        <Tab label={`Insights (${insights.length})`} />
      </Tabs>

      {/* Tab 0 — Run Analysis */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {ANALYSIS_TYPES.map(at => {
            const isRunning = running[at.key];
            const result = results[at.key];
            return (
              <Grid key={at.key} size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {at.icon}
                    <Typography variant="h6">{at.label}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                    {at.description}
                  </Typography>

                  {result && !result.error && (
                    <Alert severity="success" sx={{ mb: 1.5 }}>
                      {result.summary || `Generated ${result.adviceGenerated ?? 0} advice items and ${result.alertsGenerated ?? 0} alerts`}
                      {result.totalTokens != null && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Tokens: {result.totalTokens.toLocaleString()} &middot; Cost: ${(result.totalCost ?? 0).toFixed(4)}
                        </Typography>
                      )}
                    </Alert>
                  )}
                  {result?.error && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>{result.error}</Alert>
                  )}

                  <Button
                    variant="contained"
                    startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                    onClick={() => runAnalysis(at)}
                    disabled={isRunning}
                    fullWidth
                  >
                    {isRunning ? 'Analyzing…' : 'Run Analysis'}
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Tab 1 — Advice Feed */}
      {tab === 1 && (
        <Stack spacing={2}>
          {advice.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No active advice. Run an analysis to generate recommendations.</Typography>
            </Paper>
          ) : (
            advice.map((a: AdviceItem) => (
              <Paper key={a.adviceId} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Chip label={a.theme || 'General'} size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                    <Chip label={a.status} size="small" color={a.status === 'Proposed' ? 'warning' : 'default'} />
                    {a.confidenceScore != null && (
                      <Chip label={`${(a.confidenceScore * 100).toFixed(0)}% confidence`} size="small" sx={{ ml: 1 }} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 1.5 }}>{a.consensusText}</Typography>
                {a.status === 'Proposed' && (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleAcceptAdvice(a.adviceId)}>
                      Accept
                    </Button>
                    <Button size="small" variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={() => handleDismissAdvice(a.adviceId)}>
                      Dismiss
                    </Button>
                  </Stack>
                )}
              </Paper>
            ))
          )}
        </Stack>
      )}

      {/* Tab 2 — Insights */}
      {tab === 2 && (
        <Stack spacing={2}>
          {insights.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No insights generated yet. Run a full analysis to see insights.</Typography>
            </Paper>
          ) : (
            insights.map((ins, idx) => (
              <Paper key={ins.id ?? idx} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={ins.category} size="small" color={severityColor(ins.severity) as 'error' | 'warning' | 'info'} />
                  <Typography variant="subtitle1" fontWeight={600}>{ins.title}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{ins.body}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {new Date(ins.generatedAt).toLocaleString()}
                </Typography>
              </Paper>
            ))
          )}
        </Stack>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
