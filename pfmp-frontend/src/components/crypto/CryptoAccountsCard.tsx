import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, Chip, Skeleton, Button } from '@mui/material';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { listCryptoHoldings, listExchangeConnections, type CryptoHolding, type ExchangeConnection } from '../../services/cryptoApi';

interface Props {
  userId: number;
  /** Layout variant: 'section' renders the same Paper-with-header pattern used by AccountsView; 'panel' renders a compact Card-like list for the dashboard. */
  variant?: 'section' | 'panel';
}

function fmt$(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);
}

function fmtQty(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

/**
 * Wave 13: shared crypto accounts card. Aggregates holdings across all linked exchanges
 * and presents per-position rows. Used on the AccountsView ("All Accounts" page) and on
 * the dashboard accounts panel.
 */
export const CryptoAccountsCard: React.FC<Props> = ({ userId, variant = 'section' }) => {
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
  }, [userId]);

  const totalValue = (holdings ?? []).reduce((s, h) => s + (h.marketValueUsd ?? 0), 0);
  const hasConnections = (connections?.length ?? 0) > 0;
  const hasHoldings = (holdings?.length ?? 0) > 0;

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: variant === 'section' ? 2 : 0 }}>
        <Skeleton variant="text" width={200} />
        <Skeleton variant="rectangular" height={80} sx={{ mt: 1, borderRadius: 1 }} />
      </Paper>
    );
  }

  // No exchanges linked yet — render a compact CTA row.
  if (!hasConnections) {
    return (
      <Paper sx={{ p: 2, mb: variant === 'section' ? 2 : 0 }} variant={variant === 'panel' ? 'outlined' : 'elevation'}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CurrencyBitcoinIcon color="primary" />
            <Box>
              <Typography variant="subtitle1">Crypto</Typography>
              <Typography variant="caption" color="text.secondary">
                Link Kraken or Binance.US with read-only API keys to see your crypto here.
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            onClick={() => navigate('/dashboard/settings/crypto')}
          >
            Link Exchange
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mb: variant === 'section' ? 2 : 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CurrencyBitcoinIcon color="primary" />
          <Typography variant="h6">Crypto</Typography>
          <Chip
            label={`${holdings?.length ?? 0} position${holdings?.length === 1 ? '' : 's'} · ${connections?.length ?? 0} exchange${connections?.length === 1 ? '' : 's'}`}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" color="primary">{fmt$(totalValue)}</Typography>
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={() => navigate('/dashboard/settings/crypto')}
          >
            Manage
          </Button>
        </Box>
      </Box>
      <Box sx={{ px: 2, pb: 2 }}>
        {!hasHoldings ? (
          <Typography variant="body2" color="text.secondary">
            No crypto holdings yet. Use Sync Now in the Crypto Settings to pull current balances.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {(holdings ?? []).map(h => (
              <Paper
                key={h.cryptoHoldingId}
                variant="outlined"
                sx={{ p: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/dashboard/settings/crypto')}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{h.symbol}</Typography>
                      {h.isStaked && <Chip label="Staked" size="small" color="info" variant="outlined" />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {h.provider} · {fmtQty(h.quantity)} {h.symbol}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fmt$(h.marketValueUsd)}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};
