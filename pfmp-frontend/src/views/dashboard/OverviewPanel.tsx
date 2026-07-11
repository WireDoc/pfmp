import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { NetWorthSparkline } from '../../components/charts/NetWorthSparkline';
import netWorthService, { type SparklineResponse } from '../../services/netWorthService';
import type { DashboardData } from '../../services/dashboard';

interface Props { data: DashboardData | null; loading: boolean; userId?: number; }

export const OverviewPanel: React.FC<Props> = ({ data, loading, userId }) => {
  const obligations = data?.longTermObligations;
  const [sparklineData, setSparklineData] = useState<SparklineResponse | null>(null);
  
  // Fetch real sparkline data from API
  useEffect(() => {
    if (userId) {
      netWorthService.getSparkline(userId)
        .then(setSparklineData)
        .catch(err => console.error('Failed to fetch sparkline:', err));
    }
  }, [userId]);

  const formatDueDate = (value: string | null) => {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not scheduled';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  // Wave 25 Phase F: real snapshots only. The old fallback synthesized a
  // 30-day random walk when history was missing, which showed a fresh account
  // a month of net-worth movement that never happened. With fewer than the
  // minimum snapshots we render a "collecting data" caption instead.
  const sparklineValues = useMemo(() => {
    if (sparklineData?.hasEnoughData && sparklineData.points.length > 0) {
      return sparklineData.points.map(p => p.value);
    }
    return [];
  }, [sparklineData]);

  // Only show sparkline in non-test environment or when explicitly enabled
  const showSparkline = sparklineValues.length > 0 && typeof window !== 'undefined' && !import.meta.env.VITEST;
  const collectingHistory = !showSparkline && sparklineData != null && !sparklineData.hasEnoughData;

  return (
    <Box display="flex" gap={4} flexWrap="wrap" data-testid="overview-panel">
      {loading && !data && <Typography variant="body2">Loading overview...</Typography>}
      {!loading && data && (
        <>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Net Worth</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h5">${data.netWorth.netWorth.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
              {showSparkline && (
                <Link to="/dashboard/net-worth" style={{ textDecoration: 'none' }}>
                  <NetWorthSparkline
                    values={sparklineValues}
                    height={40}
                    width={200}
                  />
                </Link>
              )}
              {collectingHistory && (
                <Typography variant="caption" color="text.secondary">
                  Trend appears after a few daily snapshots
                </Typography>
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Assets</Typography>
            <Typography>${data.netWorth.totalAssets.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          </Box>
            <Box>
            <Typography variant="subtitle2" color="text.secondary">Liabilities</Typography>
            <Typography>${data.netWorth.totalLiabilities.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          </Box>
          {data.netWorth.change30dPct !== undefined && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">30d Change</Typography>
              <Typography>{data.netWorth.change30dPct.toFixed(2)}%</Typography>
            </Box>
          )}
          {obligations && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Long-Term Obligations</Typography>
              <Typography variant="body1">{obligations.count} active · ${obligations.totalEstimate.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Next milestone: {formatDueDate(obligations.nextDueDate)}</Typography>
            </Box>
          )}
        </>
      )}
      {!loading && !data && <Typography variant="body2">No overview data</Typography>}
    </Box>
  );
};
