import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, Skeleton, Divider, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { getCryptoRealizedPnL, type CryptoRealizedPnLSummary } from '../../services/cryptoApi';

interface RealizedPnLPanelProps {
  userId: number;
  /** Defaults to current calendar year. Pass null to omit the filter. */
  year?: number | null;
  refreshKey?: number;
}

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Wave 13 Phase 3: Realized P/L panel. Shows YTD totals split into short-term vs long-term
 * (FIFO-derived per Phase 3 fallback) and a per-symbol breakdown. Pulls from
 * /api/crypto/realized-pnl.
 */
export default function RealizedPnLPanel({ userId, year, refreshKey = 0 }: RealizedPnLPanelProps) {
  const [summary, setSummary] = useState<CryptoRealizedPnLSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveYear = year === undefined ? new Date().getFullYear() : year ?? undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCryptoRealizedPnL(userId, effectiveYear)
      .then(s => { if (!cancelled) { setSummary(s); setLoading(false); } })
      .catch(() => { if (!cancelled) { setSummary(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, effectiveYear, refreshKey]);

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Realized Crypto P/L</Typography>
          <Skeleton variant="rectangular" height={120} />
        </CardContent>
      </Card>
    );
  }

  if (!summary || (summary.totalProceedsUsd === 0 && summary.totalRealizedGainUsd === 0)) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Realized Crypto P/L</Typography>
          <Typography variant="body2" color="text.secondary">
            No realized gains or losses{effectiveYear ? ` in ${effectiveYear}` : ''}. Sell or withdraw a crypto position
            on a linked exchange to populate this view.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const totalGain = summary.totalRealizedGainUsd;
  const positive = totalGain >= 0;
  const Icon = positive ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon color={positive ? 'success' : 'error'} />
            <Typography variant="h6">Realized Crypto P/L</Typography>
            {effectiveYear && <Chip size="small" label={effectiveYear} />}
          </Stack>
          <Typography variant="h6" color={positive ? 'success.main' : 'error.main'}>
            {usd(totalGain)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Short-term</Typography>
            <Typography variant="body1">{usd(summary.totalShortTermGainUsd)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Long-term</Typography>
            <Typography variant="body1">{usd(summary.totalLongTermGainUsd)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Proceeds</Typography>
            <Typography variant="body1">{usd(summary.totalProceedsUsd)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Cost basis</Typography>
            <Typography variant="body1">{usd(summary.totalCostBasisUsd)}</Typography>
          </Box>
        </Stack>

        {summary.bySymbol.length > 0 && (
          <>
            <Divider sx={{ mb: 1 }} />
            <Stack spacing={0.5}>
              {summary.bySymbol.slice(0, 5).map(row => {
                const rowPositive = row.totalGainUsd >= 0;
                return (
                  <Stack key={row.symbol} direction="row" justifyContent="space-between">
                    <Typography variant="body2"><strong>{row.symbol}</strong></Typography>
                    <Typography variant="body2" color={rowPositive ? 'success.main' : 'error.main'}>
                      {usd(row.totalGainUsd)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
          Cost basis incomplete when synced after the original purchase. PFMP is not a tax-filing tool.
        </Typography>
      </CardContent>
    </Card>
  );
}
