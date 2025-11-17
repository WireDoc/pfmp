import React, { useState, useEffect } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { fetchTaxInsights, type TaxInsights } from '../../api/portfolioAnalytics';
import { TaxSummaryCard } from './TaxSummaryCard';
import { TaxLotTable } from './TaxLotTable';
import { HarvestingOpportunities } from './HarvestingOpportunities';

interface TaxInsightsTabProps {
  accountId: number;
}

export const TaxInsightsTab: React.FC<TaxInsightsTabProps> = ({ accountId }) => {
  const [taxInsights, setTaxInsights] = useState<TaxInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadTaxInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchTaxInsights(accountId);
        setTaxInsights(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTaxInsights();
  }, [accountId]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load tax insights. Please try again later.
      </Alert>
    );
  }

  if (!taxInsights) {
    return (
      <Alert severity="info">
        No tax data available for this account.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 3 }}>
        {/* Tax Summary Card - Left Column */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 33%' } }}>
          <TaxSummaryCard taxInsights={taxInsights} loading={isLoading} />
        </Box>

        {/* Harvesting Opportunities - Right Column */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66%' } }}>
          <HarvestingOpportunities
            opportunities={taxInsights.harvestingOpportunities}
            loading={isLoading}
          />
        </Box>
      </Box>

      {/* Tax Lot Table - Full Width */}
      <Box>
        <TaxLotTable
          holdings={taxInsights.holdingDetails}
          loading={isLoading}
        />
      </Box>
    </Box>
  );
};
