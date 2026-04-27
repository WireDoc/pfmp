import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, Skeleton, Divider } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import { getCryptoStakingSummary, type CryptoStakingSummary } from '../../services/cryptoApi';

interface StakingSummaryCardProps {
  userId: number;
  refreshKey?: number;
}

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const usdWhole = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(2)}%`);

/**
 * Wave 13 Phase 3: Staking + earn summary. Shows total staked value, weighted APY,
 * YTD rewards, and per-asset breakdown. Pulls from /api/crypto/staking-summary.
 */
export default function StakingSummaryCard({ userId, refreshKey = 0 }: StakingSummaryCardProps) {
  const [summary, setSummary] = useState<CryptoStakingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCryptoStakingSummary(userId)
      .then(s => { if (!cancelled) { setSummary(s); setLoading(false); } })
      .catch(() => { if (!cancelled) { setSummary(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Staking & Earn</Typography>
          <Skeleton variant="rectangular" height={120} />
        </CardContent>
      </Card>
    );
  }

  const hasStakedValue = summary != null && summary.totalStakedValueUsd > 0;
  if (!summary || (!hasStakedValue && summary.ytdRewardsUsd === 0)) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <SavingsIcon color="action" />
            <Typography variant="h6">Staking & Earn</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            No staked balances or earn rewards detected yet. Connect or stake on a linked exchange to start tracking.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SavingsIcon color="action" />
            <Typography variant="h6">Staking & Earn</Typography>
          </Stack>
          <Typography variant="h6">{usdWhole(summary.totalStakedValueUsd)}</Typography>
        </Stack>

        <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Weighted APY</Typography>
            <Typography variant="h6">{pct(summary.weightedApyPercent)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">YTD Rewards</Typography>
            <Typography variant="h6">{usd(summary.ytdRewardsUsd)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Assets</Typography>
            <Typography variant="h6">{summary.stakedAssetCount}</Typography>
          </Box>
        </Stack>

        {summary.byAsset.length > 0 && (
          <>
            <Divider sx={{ mb: 1 }} />
            <Stack spacing={0.5}>
              {summary.byAsset.slice(0, 5).map(asset => (
                <Stack key={asset.symbol} direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    <strong>{asset.symbol}</strong> · {asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    {asset.apyPercent != null && ` · ${asset.apyPercent.toFixed(2)}% APY`}
                  </Typography>
                  <Typography variant="body2">{usd(asset.marketValueUsd)}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
