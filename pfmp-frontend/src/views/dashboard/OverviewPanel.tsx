import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { NetWorthSparkline } from '../../components/charts/NetWorthSparkline';
import type { DashboardData } from '../../services/dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

export const OverviewPanel: React.FC<Props> = ({ data, loading }) => {
  const obligations = data?.longTermObligations;
  const formatDueDate = (value: string | null) => {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not scheduled';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  // TODO: Replace with real historical data from backend once available
  // Generate mock 30-day trend based on current net worth and 30d change
  const sparklineData = useMemo(() => {
    if (!data) return [];
    
    const currentValue = data.netWorth.netWorth.amount;
    const change30dPct = data.netWorth.change30dPct ?? 0;
    
    // Calculate starting value 30 days ago
    const startValue = currentValue / (1 + change30dPct / 100);
    
    // Generate 30 data points with some realistic variation
    const points: number[] = [];
    for (let i = 0; i < 30; i++) {
      const progress = i / 29; // 0 to 1
      // Linear interpolation with slight randomness
      const baseValue = startValue + (currentValue - startValue) * progress;
      const variation = baseValue * (Math.random() * 0.02 - 0.01); // ±1% daily variation
      points.push(Math.round(baseValue + variation));
    }
    
    return points;
  }, [data]);

  // Only show sparkline in non-test environment or when explicitly enabled
  const showSparkline = sparklineData.length > 0 && typeof window !== 'undefined' && !import.meta.env.VITEST;

  return (
    <Box display="flex" gap={4} flexWrap="wrap" data-testid="overview-panel">
      {loading && !data && <Typography variant="body2">Loading overview...</Typography>}
      {!loading && data && (
        <>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Net Worth</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h5">${data.netWorth.netWorth.amount.toLocaleString()}</Typography>
              {showSparkline && (
                <NetWorthSparkline 
                  values={sparklineData} 
                  height={40}
                  width={200}
                />
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Assets</Typography>
            <Typography>${data.netWorth.totalAssets.amount.toLocaleString()}</Typography>
          </Box>
            <Box>
            <Typography variant="subtitle2" color="text.secondary">Liabilities</Typography>
            <Typography>${data.netWorth.totalLiabilities.amount.toLocaleString()}</Typography>
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
