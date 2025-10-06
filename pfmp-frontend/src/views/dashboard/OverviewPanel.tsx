import React from 'react';
import { Box, Typography } from '@mui/material';
import type { DashboardData } from '../../services/dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

export const OverviewPanel: React.FC<Props> = ({ data, loading }) => {
  return (
    <Box display="flex" gap={4} flexWrap="wrap" data-testid="overview-panel">
      {loading && !data && <Typography variant="body2">Loading overview...</Typography>}
      {!loading && data && (
        <>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Net Worth</Typography>
            <Typography variant="h5">${data.netWorth.netWorth.amount.toLocaleString()}</Typography>
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
        </>
      )}
      {!loading && !data && <Typography variant="body2">No overview data</Typography>}
    </Box>
  );
};
