import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Chip, Skeleton, Button, IconButton, Tooltip, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { fetchLatestDigest, triggerNewsIngestion, type NewsDigest } from '../../services/newsApi';

interface NewsDigestWidgetProps {
  userId: number;
}

/**
 * Wave 23 — Compact dashboard widget showing the latest news digest. Renders:
 *   • The headline + overall sentiment chip
 *   • Generated-at timestamp
 *   • Quick category snippets (only categories that have content)
 *   • Refresh button (triggers ingestion job manually)
 *   • Link to the drill-down detail view
 */
const sentimentColor = (sentiment: string | null | undefined): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (!sentiment) return 'default';
  const s = sentiment.toLowerCase();
  if (s.includes('bull')) return 'success';
  if (s.includes('bear')) return 'error';
  if (s.includes('mixed')) return 'warning';
  return 'info';
};

const sentimentLabel = (sentiment: string | null | undefined): string =>
  (sentiment ?? 'neutral').replace(/_/g, ' ');

const formatGeneratedAt = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? `today at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : d.toLocaleString();
};

export const NewsDigestWidget: React.FC<NewsDigestWidgetProps> = ({ userId }) => {
  const [digest, setDigest] = useState<NewsDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const d = await fetchLatestDigest(userId);
        if (!cancelled) setDigest(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load news digest');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const result = await triggerNewsIngestion();
      setRefreshNotice(`Refresh queued (job ${result.jobId.slice(0, 8)}…). Reload in ~30s to see the new digest.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger refresh');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="rectangular" height={80} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!digest) {
    return (
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">News Digest</Typography>
          <Button size="small" onClick={handleRefresh} disabled={refreshing} startIcon={<RefreshIcon />}>
            Generate
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          No digest available yet. The daily ingestion runs at 5:30 AM ET; click Generate to run it now.
        </Typography>
        {refreshNotice && <Alert sx={{ mt: 1 }} severity="info">{refreshNotice}</Alert>}
      </Paper>
    );
  }

  // Filter out null categories so we don't waste space on empty sections.
  const categories: { key: string; label: string; body: string }[] = [
    { key: 'macro',        label: 'Macro / Fed',                 body: digest.categories.macro ?? '' },
    { key: 'federal',      label: 'Federal employee',            body: digest.categories.federal ?? '' },
    { key: 'holdings',     label: 'Holdings',                    body: digest.categories.holdings ?? '' },
    { key: 'regulatory',   label: 'Regulatory / Tax',            body: digest.categories.regulatory ?? '' },
    { key: 'weather',      label: 'Weather / Disasters',         body: digest.categories.weather ?? '' },
    { key: 'geopolitical', label: 'Geopolitical',                body: digest.categories.geopolitical ?? '' },
    { key: 'crypto',       label: 'Crypto',                      body: digest.categories.crypto ?? '' },
  ].filter(c => c.body.trim().length > 0);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h6" gutterBottom>News Digest</Typography>
          <Typography variant="caption" color="text.secondary">
            Generated {formatGeneratedAt(digest.generatedAt)} · {digest.articleCount} articles
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Open detail view">
            <IconButton size="small" component={RouterLink} to="/dashboard/news">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh digest (runs ingestion now)">
            <span>
              <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {digest.headline && (
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          {digest.headline}
        </Typography>
      )}

      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Chip
          size="small"
          color={sentimentColor(digest.overallSentiment)}
          label={sentimentLabel(digest.overallSentiment)}
        />
        {digest.confidence !== null && (
          <Typography variant="caption" color="text.secondary">
            confidence {(digest.confidence * 100).toFixed(0)}%
          </Typography>
        )}
      </Stack>

      {refreshNotice && <Alert sx={{ mb: 1 }} severity="info">{refreshNotice}</Alert>}

      {/* Narrative briefing — the morning-radio-style summary. Lead with this since
          it's how a human would actually want to start their day. */}
      {digest.narrativeSummary && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Morning briefing
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {digest.narrativeSummary}
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {categories.slice(0, 3).map(c => (
          <Box key={c.key}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {c.label}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {c.body.length > 220 ? c.body.slice(0, 220) + '…' : c.body}
            </Typography>
          </Box>
        ))}
        {categories.length > 3 && (
          <Button
            size="small"
            component={RouterLink}
            to="/dashboard/news"
            sx={{ alignSelf: 'flex-start' }}
          >
            View {categories.length - 3} more {categories.length - 3 === 1 ? 'category' : 'categories'} →
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
