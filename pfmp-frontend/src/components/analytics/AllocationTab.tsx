import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import BusinessIcon from '@mui/icons-material/Business';
import PublicIcon from '@mui/icons-material/Public';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { AllocationSunburstChart } from './AllocationSunburstChart';
import { AllocationTableView } from './AllocationTableView';
import { RebalancingRecommendations } from './RebalancingRecommendations';
import { fetchAllocationBreakdown } from '../../api/portfolioAnalytics';
import type { AllocationBreakdown, AllocationDimension } from '../../api/portfolioAnalytics';

interface AllocationTabProps {
  accountId: number;
}

export const AllocationTab: React.FC<AllocationTabProps> = ({ accountId }) => {
  const [dimension, setDimension] = useState<AllocationDimension>('assetClass');
  const [allocationData, setAllocationData] = useState<AllocationBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAllocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAllocationBreakdown(accountId, dimension);
        setAllocationData(data);
      } catch (err) {
        console.error('Error loading allocation data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load allocation data');
      } finally {
        setLoading(false);
      }
    };

    loadAllocationData();
  }, [accountId, dimension]);

  const handleDimensionChange = (_: React.MouseEvent<HTMLElement>, newDimension: AllocationDimension | null) => {
    if (newDimension !== null) {
      setDimension(newDimension);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!allocationData) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No allocation data available for this account
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Portfolio Allocation
        </Typography>

        <ToggleButtonGroup
          value={dimension}
          exclusive
          onChange={handleDimensionChange}
          size="small"
          aria-label="allocation dimension"
        >
          <ToggleButton value="assetClass" aria-label="asset class">
            <PieChartIcon sx={{ mr: 1 }} fontSize="small" />
            Asset Class
          </ToggleButton>
          <ToggleButton value="sector" aria-label="sector">
            <BusinessIcon sx={{ mr: 1 }} fontSize="small" />
            Sector
          </ToggleButton>
          <ToggleButton value="geography" aria-label="geography">
            <PublicIcon sx={{ mr: 1 }} fontSize="small" />
            Geography
          </ToggleButton>
          <ToggleButton value="marketCap" aria-label="market cap">
            <ShowChartIcon sx={{ mr: 1 }} fontSize="small" />
            Market Cap
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Top Row: Chart + Table */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 40%' }, display: 'flex', flexDirection: 'column' }}>
          <AllocationSunburstChart
            allocations={allocationData.allocations}
            dimension={dimension}
            loading={false}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 60%' } }}>
          <AllocationTableView
            allocations={allocationData.allocations}
            dimension={allocationData.dimension}
            loading={false}
          />
        </Box>
      </Box>

      {/* Bottom Row: Rebalancing Recommendations */}
      <RebalancingRecommendations
        rebalanceActions={allocationData.rebalancingRecommendations}
        loading={false}
      />

      {/* Educational Content */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Asset Allocation Best Practices:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • <strong>Asset Class:</strong> Balance between stocks, bonds, cash, and alternatives based on your risk tolerance and time horizon.
        </Typography>
        <Typography variant="body2">
          • <strong>Sector:</strong> Diversify across different industries to reduce concentration risk.
        </Typography>
        <Typography variant="body2">
          • <strong>Geography:</strong> International diversification can reduce country-specific risks.
        </Typography>
        <Typography variant="body2">
          • <strong>Market Cap:</strong> Mix of large, mid, and small cap stocks provides different growth and stability characteristics.
        </Typography>
      </Alert>
    </Box>
  );
};
