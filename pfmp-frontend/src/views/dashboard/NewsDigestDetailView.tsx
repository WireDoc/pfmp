import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Skeleton, Button, IconButton, Tooltip,
  Alert, Divider, Link, List, ListItem, ListItemText, Tabs, Tab,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import { useDevUserId } from '../../dev/devUserState';
import {
  fetchLatestDigest,
  fetchDigestArticles,
  triggerNewsIngestion,
  type NewsDigest,
  type NewsArticle,
} from '../../services/newsApi';
import { formatRelative, formatAbsolute } from '../../utils/relativeTime';

/**
 * Wave 23 — Full per-category drill-down view. Shows each category's narrative
 * (the same body that appears in the AI prompt) PLUS the source article list,
 * filterable by category, so the user can read the originals when curious.
 */

const sentimentColor = (sentiment: string | null | undefined): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (!sentiment) return 'default';
  const s = sentiment.toLowerCase();
  if (s.includes('bull')) return 'success';
  if (s.includes('bear')) return 'error';
  if (s.includes('mixed')) return 'warning';
  return 'info';
};

const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: 'macro',        label: 'Macro / Fed' },
  { key: 'federal',      label: 'Federal employee' },
  { key: 'holdings',     label: 'Holdings' },
  { key: 'regulatory',   label: 'Regulatory / Tax' },
  { key: 'weather',      label: 'Weather / Disasters' },
  { key: 'geopolitical', label: 'Geopolitical' },
  { key: 'crypto',       label: 'Crypto' },
];


export const NewsDigestDetailView: React.FC = () => {
  const userId = useDevUserId() ?? 1;
  const [digest, setDigest] = useState<NewsDigest | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchLatestDigest(userId);
      setDigest(d);
      const a = await fetchDigestArticles(userId);
      setArticles(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news digest');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // After a "Generate new digest" trigger, poll the API every 5s for up to 60s
  // and auto-reload the page state when a fresher digest appears. Saves the
  // user from manually clicking "Reload page data".
  const pollForNewerDigest = useCallback(async (priorGeneratedAt: string | null) => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const fresh = await fetchLatestDigest(userId);
        if (fresh && (!priorGeneratedAt || fresh.generatedAt !== priorGeneratedAt)) {
          setDigest(fresh);
          const a = await fetchDigestArticles(userId);
          setArticles(a);
          setRefreshNotice(null);
          return;
        }
      } catch {
        // Non-fatal — try again next tick.
      }
    }
    setRefreshNotice('Job still running — click "Reload page data" in a few seconds to see the new digest.');
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNotice(null);
    const priorGeneratedAt = digest?.generatedAt ?? null;
    try {
      await triggerNewsIngestion();
      setRefreshNotice('New digest is being generated (~30 seconds). The page will update automatically.');
      void pollForNewerDigest(priorGeneratedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredArticles = useMemo(() => {
    if (activeCategory === 'all') return articles;
    return articles.filter(a => a.category === activeCategory);
  }, [articles, activeCategory]);

  // Build category data (drop empty ones)
  const categoriesWithContent = useMemo(() => {
    if (!digest) return [] as { key: string; label: string; body: string }[];
    const map: Record<string, string | null> = {
      macro: digest.categories.macro,
      federal: digest.categories.federal,
      holdings: digest.categories.holdings,
      regulatory: digest.categories.regulatory,
      weather: digest.categories.weather,
      geopolitical: digest.categories.geopolitical,
      crypto: digest.categories.crypto,
    };
    return CATEGORY_ORDER
      .map(c => ({ ...c, body: (map[c.key] ?? '').trim() }))
      .filter(c => c.body.length > 0);
  }, [digest]);

  // Article counts per category for the filter tabs
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: articles.length };
    for (const a of articles) {
      if (!a.category) continue;
      c[a.category] = (c[a.category] ?? 0) + 1;
    }
    return c;
  }, [articles]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={load}>Retry</Button>
        }>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton component={RouterLink} to="/dashboard" size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">News Digest</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Runs the news ingestion job: pulls fresh RSS feeds, dedupes, categorizes, and asks Gemini Flash to write a new briefing. ~30 seconds, costs about $0.02. The page will auto-update when done.">
            <span>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? 'Queued…' : 'Generate new digest'}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Re-fetch the latest digest data from the database (instant). Use after a manual database edit or if the auto-update didn't catch the new digest.">
            <span>
              <Button variant="outlined" onClick={load} disabled={loading}>Reload page data</Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {refreshNotice && <Alert sx={{ mb: 2 }} severity="info">{refreshNotice}</Alert>}

      {!digest ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No digest available yet. The daily ingestion runs at 5:30 AM ET; click <strong>Refresh now</strong> to generate one immediately.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Header card */}
          <Paper sx={{ p: 3, mb: 2 }}>
            {digest.headline && (
              <Typography variant="h6" gutterBottom>{digest.headline}</Typography>
            )}
            <Stack direction="row" spacing={2} alignItems="center" mb={1}>
              <Chip
                size="small"
                color={sentimentColor(digest.overallSentiment)}
                label={(digest.overallSentiment ?? 'neutral').replace(/_/g, ' ')}
              />
              {digest.confidence !== null && (
                <Typography variant="caption" color="text.secondary">
                  confidence {(digest.confidence * 100).toFixed(0)}%
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {digest.articleCount} articles · LLM cost ${digest.llmCostUsd.toFixed(4)}
              </Typography>
            </Stack>
            <Tooltip title={`Exact: ${formatAbsolute(digest.generatedAt)} · Period: ${formatAbsolute(digest.periodStart)} → ${formatAbsolute(digest.periodEnd)}`}>
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                Generated {formatRelative(digest.generatedAt)} · Period {formatRelative(digest.periodStart)} → {formatRelative(digest.periodEnd)}
              </Typography>
            </Tooltip>
          </Paper>

          {/* Narrative briefing — radio-style morning summary */}
          {digest.narrativeSummary && (
            <Paper sx={{ p: 3, mb: 2 }}>
              <Typography variant="h6" gutterBottom>Morning briefing</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.75,
                  fontSize: '1.05rem',
                  color: 'text.primary',
                }}
              >
                {digest.narrativeSummary}
              </Typography>
            </Paper>
          )}

          {/* Per-category narrative bodies */}
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>By category</Typography>
            <Divider sx={{ mb: 2 }} />
            {categoriesWithContent.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                The model judged none of the categories as material this period.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {categoriesWithContent.map(c => (
                  <Box key={c.key}>
                    <Typography variant="overline" color="text.secondary">{c.label}</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {c.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Article list with category filter */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Source articles ({articles.length})</Typography>

            <Tabs
              value={activeCategory}
              onChange={(_, v) => setActiveCategory(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              <Tab value="all" label={`All (${counts.all ?? 0})`} />
              {CATEGORY_ORDER.map(c => {
                const n = counts[c.key] ?? 0;
                if (n === 0) return null;
                return <Tab key={c.key} value={c.key} label={`${c.label} (${n})`} />;
              })}
            </Tabs>

            {filteredArticles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No articles match this filter.
              </Typography>
            ) : (
              <List dense disablePadding>
                {filteredArticles.map(a => (
                  <ListItem
                    key={a.articleId}
                    disableGutters
                    sx={{ display: 'block', py: 1.5, borderBottom: 1, borderColor: 'divider' }}
                  >
                    <ListItemText
                      disableTypography
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          {a.category && <Chip size="small" label={a.category} sx={{ height: 18 }} />}
                          <Link href={a.url} target="_blank" rel="noopener noreferrer" underline="hover">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                                {a.title}
                              </Typography>
                              <OpenInNewIcon fontSize="inherit" />
                            </Stack>
                          </Link>
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                          <Tooltip title={a.source}>
                            <Typography variant="caption" color="text.secondary">{a.source}</Typography>
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Tooltip title={formatAbsolute(a.publishedAt)}>
                            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                              {formatRelative(a.publishedAt)}
                            </Typography>
                          </Tooltip>
                          {a.tags && (
                            <>
                              <Typography variant="caption" color="text.secondary">·</Typography>
                              <Typography variant="caption" color="text.secondary">
                                tags: {a.tags}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      }
                    />
                    {a.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {a.summary}
                      </Typography>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};
