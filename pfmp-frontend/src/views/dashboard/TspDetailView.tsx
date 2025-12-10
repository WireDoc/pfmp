import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Chip,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { fetchTspDetail, upsertTspProfile, type TspDetailResponse } from '../../services/financialProfileApi';
import { useDevUserId } from '../../dev/devUserState';
import { useAuth } from '../../contexts/auth/useAuth';
import { TspPositionsEditor, type TspPositionInput } from '../../components/tsp/TspPositionsEditor';

// TSP Fund names for display
const TSP_FUND_NAMES: Record<string, string> = {
  G: 'Government Securities (G Fund)',
  F: 'Fixed Income Index (F Fund)',
  C: 'Common Stock Index (C Fund)',
  S: 'Small Cap Stock Index (S Fund)',
  I: 'International Stock Index (I Fund)',
  'L-INCOME': 'Lifecycle Income (L Income)',
  L2030: 'Lifecycle 2030 (L 2030)',
  L2035: 'Lifecycle 2035 (L 2035)',
  L2040: 'Lifecycle 2040 (L 2040)',
  L2045: 'Lifecycle 2045 (L 2045)',
  L2050: 'Lifecycle 2050 (L 2050)',
  L2055: 'Lifecycle 2055 (L 2055)',
  L2060: 'Lifecycle 2060 (L 2060)',
  L2065: 'Lifecycle 2065 (L 2065)',
  L2070: 'Lifecycle 2070 (L 2070)',
  L2075: 'Lifecycle 2075 (L 2075)',
};

// Map fund codes to their price field in the snapshot
const FUND_TO_PRICE_KEY: Record<string, keyof TspDetailResponse['allFundPrices']> = {
  G: 'gFundPrice',
  F: 'fFundPrice',
  C: 'cFundPrice',
  S: 'sFundPrice',
  I: 'iFundPrice',
  'L-INCOME': 'lIncomeFundPrice',
  L2030: 'l2030FundPrice',
  L2035: 'l2035FundPrice',
  L2040: 'l2040FundPrice',
  L2045: 'l2045FundPrice',
  L2050: 'l2050FundPrice',
  L2055: 'l2055FundPrice',
  L2060: 'l2060FundPrice',
  L2065: 'l2065FundPrice',
  L2070: 'l2070FundPrice',
  L2075: 'l2075FundPrice',
};

// All fund codes in display order
const ALL_FUND_CODES = ['G', 'F', 'C', 'S', 'I', 'L-INCOME', 'L2030', 'L2035', 'L2040', 'L2045', 'L2050', 'L2055', 'L2060', 'L2065', 'L2070', 'L2075'];

/**
 * TspDetailView - Full page TSP account detail view
 * Displays user positions and complete fund price table
 * Uses stored prices only - no external API calls
 */
export const TspDetailView: React.FC = () => {
  const { user } = useAuth();
  const devUserId = useDevUserId();
  const userId = devUserId ?? (user?.localAccountId ? Number(user.localAccountId) : null) ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');

  const [data, setData] = useState<TspDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTspDetail(userId);
      setData(response);
    } catch (err) {
      console.error('Failed to fetch TSP detail:', err);
      setError('Failed to load TSP data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const response = await fetchTspDetail(userId);
      setData(response);
    } catch (err) {
      console.error('Failed to refresh TSP data:', err);
      setError('Failed to refresh data.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSavePositions = async (positions: TspPositionInput[], contributionRate: number) => {
    if (!userId) throw new Error('No user ID');
    
    // Convert to the API payload format
    const payload = {
      contributionRatePercent: contributionRate,
      lifecyclePositions: positions.map(p => ({
        fundCode: p.fundCode,
        contributionPercent: p.contributionPercent,
        units: p.units,
        dateUpdated: new Date().toISOString(),
      })),
    };
    
    await upsertTspProfile(userId, payload);
    
    // Refresh data after save
    setEditMode(false);
    await handleRefresh();
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatUnits = (value: number | null) => {
    if (value === null || value === undefined || value === 0) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    // Parse as UTC date to avoid timezone shift issues
    // The API returns dates at midnight UTC (e.g., "2025-12-08T00:00:00Z")
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC', // Interpret as UTC to get the correct calendar date
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get user's positions with non-zero balances
  const activePositions = data?.positions.filter(p => p.units > 0) ?? [];

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <AccountBalanceIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Thrift Savings Plan (TSP)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your federal retirement savings account
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {data?.pricesAsOfUtc && !editMode && (
            <Chip
              icon={<ScheduleIcon />}
              label={`Updated ${formatDateTime(data.pricesAsOfUtc)}`}
              size="small"
              variant="outlined"
              color="info"
            />
          )}
          {editMode ? (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setEditMode(false)}
            >
              Back to View
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
              >
                Edit Positions
              </Button>
              <Tooltip title="Refresh data">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <RefreshIcon className={refreshing ? 'spinning' : ''} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Edit Mode - Positions Editor */}
      {editMode ? (
        <TspPositionsEditor
          positions={data?.positions.map(p => ({
            fundCode: p.fundCode,
            contributionPercent: p.currentMixPercent ?? undefined,
            units: p.units,
          })) ?? []}
          onSave={handleSavePositions}
          contributionRate={data?.profile?.contributionRatePercent ?? 0}
          showContributionPercent={true}
          showUnits={true}
          title="Edit TSP Positions"
        />
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Total Market Value
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="primary">
                    {formatCurrency(data?.totalMarketValue ?? 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Active Positions
                  </Typography>
              <Typography variant="h4" fontWeight={600}>
                {activePositions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Contribution Rate
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {data?.profile?.contributionRatePercent !== null 
                  ? `${data?.profile?.contributionRatePercent}%`
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Employer Match
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {data?.profile?.employerMatchPercent !== null
                  ? `${data?.profile?.employerMatchPercent}%`
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Your Positions Table */}
      <Paper sx={{ mb: 4 }}>
        <Box p={2} display="flex" alignItems="center" gap={1}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h6">Your Positions</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Fund</strong></TableCell>
                <TableCell align="right"><strong>Units</strong></TableCell>
                <TableCell align="right"><strong>Price</strong></TableCell>
                <TableCell align="right"><strong>Market Value</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activePositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No active positions
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                activePositions.map((position) => (
                  <TableRow key={position.fundCode} hover>
                    <TableCell>
                      <Box>
                        <Typography fontWeight={500}>{position.fundCode}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {TSP_FUND_NAMES[position.fundCode] ?? position.fundCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{formatUnits(position.units)}</TableCell>
                    <TableCell align="right">{formatPrice(position.currentPrice)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(position.currentMarketValue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {/* Total row */}
              {activePositions.length > 0 && (
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell colSpan={3}>
                    <Typography fontWeight={600}>Total</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600} color="primary">
                      {formatCurrency(data?.totalMarketValue ?? 0)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* All Fund Prices Table */}
      <Paper>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <AccountBalanceIcon color="primary" />
            <Typography variant="h6">All TSP Fund Prices</Typography>
          </Box>
          {data?.allFundPrices?.priceDate && (
            <Chip
              label={`As of ${formatDate(data.allFundPrices.priceDate)}`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Fund Code</strong></TableCell>
                <TableCell><strong>Fund Name</strong></TableCell>
                <TableCell align="right"><strong>Share Price</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ALL_FUND_CODES.map((fundCode) => {
                const priceKey = FUND_TO_PRICE_KEY[fundCode];
                const price = data?.allFundPrices?.[priceKey] as number | null;
                const hasPosition = activePositions.some(p => p.fundCode === fundCode);
                
                return (
                  <TableRow 
                    key={fundCode} 
                    hover
                    sx={hasPosition ? { bgcolor: 'action.selected' } : undefined}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={hasPosition ? 600 : 400}>
                          {fundCode}
                        </Typography>
                        {hasPosition && (
                          <Chip label="Held" size="small" color="primary" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography color={hasPosition ? 'text.primary' : 'text.secondary'}>
                        {TSP_FUND_NAMES[fundCode]}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={hasPosition ? 600 : 400}>
                        {formatPrice(price)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box p={2} bgcolor="grey.50">
          <Typography variant="caption" color="text.secondary">
            <strong>Data Source:</strong> {data?.allFundPrices?.dataSource ?? 'Unknown'} • 
            Prices updated daily at market close by scheduled background job. 
            No external API calls are made when viewing this page.
          </Typography>
        </Box>
      </Paper>
        </>
      )}

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default TspDetailView;
