import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Typography, Skeleton } from '@mui/material';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { listCryptoHoldings, listExchangeConnections, type CryptoHolding, type ExchangeConnection } from '../../services/cryptoApi';

interface CryptoSummaryCardProps {
  userId: number;
  /** Bumping this value forces a re-fetch (used to mirror the dashboard refresh trigger). */
  refreshKey?: number;
}

/**
 * Wave 13: dashboard-only summary card for crypto holdings. Mirrors `TspPanel` layout
 * (title, total balance, last-updated/synced footer, View Details button). Crypto prices
 * refresh on the same dashboard triggers as Investment Accounts (mount + window focus
 * via `refreshKey`); we never schedule daily TSP-style refreshes here.
 */
export default function CryptoSummaryCard({ userId, refreshKey = 0 }: CryptoSummaryCardProps) {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<CryptoHolding[] | null>(null);
  const [connections, setConnections] = useState<ExchangeConnection[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listCryptoHoldings(userId).catch(() => [] as CryptoHolding[]),
      listExchangeConnections(userId).catch(() => [] as ExchangeConnection[]),
    ]).then(([h, c]) => {
      if (cancelled) return;
      setHoldings(h);
      setConnections(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cryptocurrency</Typography>
          <Skeleton variant="rectangular" height={120} />
        </CardContent>
      </Card>
    );
  }

  const hasConnections = (connections?.length ?? 0) > 0;

  if (!hasConnections) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <CurrencyBitcoinIcon color="primary" />
              <Typography variant="h6">Cryptocurrency</Typography>
            </Box>
          </Box>
          <Typography color="text.secondary" variant="body2" gutterBottom>
            No crypto exchanges linked yet.
          </Typography>
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewIcon />}
              onClick={() => navigate('/dashboard/settings/crypto')}
            >
              Link Exchange
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const totalValue = (holdings ?? []).reduce((s, h) => s + (h.marketValueUsd ?? 0), 0);
  const positionCount = holdings?.length ?? 0;

  // "Last updated" = most recent ExchangeConnection.lastSyncAt across all linked exchanges.
  const lastSyncIso = (connections ?? [])
    .map(c => c.lastSyncAt)
    .filter((s): s is string => !!s)
    .sort()
    .pop() ?? null;
  const lastUpdated = lastSyncIso ? new Date(lastSyncIso).toLocaleDateString() : 'Unknown';

  // Sync status: ok if every active connection has Active status; otherwise "Pending sync".
  const allActive = (connections ?? []).every(c => c.status === 'Active');
  const syncStatusOk = hasConnections && allActive && !!lastSyncIso;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <CurrencyBitcoinIcon color="primary" />
            <Typography variant="h6">Cryptocurrency</Typography>
          </Box>
          <Typography variant="h6" color="primary">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Balance
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {positionCount} position{positionCount === 1 ? '' : 's'} across {connections?.length ?? 0} exchange{connections?.length === 1 ? '' : 's'}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box
              width={8}
              height={8}
              borderRadius="50%"
              bgcolor={syncStatusOk ? 'success.main' : 'warning.main'}
            />
            <Typography variant="caption" color="text.secondary">
              {syncStatusOk ? 'Synced' : 'Pending sync'}
            </Typography>
          </Box>
        </Box>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', flex: 1 }}>
            Click "View Details" for per-exchange holdings and prices
          </Typography>
          <Button
            variant="outlined"
            size="small"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate('/dashboard/settings/crypto')}
            sx={{ ml: 2 }}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
