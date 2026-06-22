import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Chip, Skeleton, Button, IconButton, Tooltip, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { fetchLatestDigest, triggerNewsIngestion, type NewsDigest } from '../../services/newsApi';
import { formatRelative, formatAbsolute } from '../../utils/relativeTime';

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


export const NewsDigestWidget: React.FC<NewsDigestWidgetProps> = ({ userId }) => {
  const [digest, setDigest] = useState<NewsDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const fetchDigest = useCallback(async (): Promise<NewsDigest | null> => {
    return await fetchLatestDigest(userId);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await fetchDigest();
        if (!cancelled) setDigest(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load news digest');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchDigest]);

  // After a manual "Generate new digest" click, poll every 5s for up to 60s
  // and auto-replace the displayed digest when a fresher one appears. Saves
  // the user from having to click reload after the ingestion job completes.
  const pollForNewerDigest = useCallback(async (priorGeneratedAt: string | null) => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const fresh = await fetchDigest();
        if (fresh && (!priorGeneratedAt || fresh.generatedAt !== priorGeneratedAt)) {
          setDigest(fresh);
          setRefreshNotice(null);
          return;
        }
      } catch {
        // Poll errors are non-fatal — try again next tick.
      }
    }
    setRefreshNotice('Job still running — click "Reload page data" in a few seconds to see the new digest.');
  }, [fetchDigest]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNotice(null);
    const priorGeneratedAt = digest?.generatedAt ?? null;
    try {
      await triggerNewsIngestion();
      setRefreshNotice('New digest is being generated (~30 seconds). The widget will update automatically.');
      // Don't await: let the poll run in the background and update state on its own.
      void pollForNewerDigest(priorGeneratedAt);
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
          <Tooltip title="Run the news ingestion job (~30 seconds, costs about $0.02)">
            <Button size="small" onClick={handleRefresh} disabled={refreshing} startIcon={<RefreshIcon />}>
              Generate new digest
            </Button>
          </Tooltip>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          No digest available yet. The daily ingestion runs at 5:30 AM ET; click <strong>Generate new digest</strong> to run it now.
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
          <Tooltip title={`Generated ${formatAbsolute(digest.generatedAt)}`}>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
              Generated {formatRelative(digest.generatedAt)} · {digest.articleCount} articles
            </Typography>
          </Tooltip>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Open detail view (per-category drill-down + source articles)">
            <IconButton size="small" component={RouterLink} to="/dashboard/news">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Generate a new digest — runs the news ingestion job (~30 seconds, costs about $0.02). The widget will update automatically when done.">
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
