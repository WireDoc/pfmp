import React, { useState, useEffect } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { fetchPerformanceMetrics, type Period, type PerformanceMetrics } from '../../api/portfolioAnalytics';
import { PerformanceMetricsCard } from './PerformanceMetricsCard';
import { PerformanceChart } from './PerformanceChart';
import { BenchmarkComparisonTable } from './BenchmarkComparisonTable';

interface PerformanceTabProps {
  accountId: number;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ accountId }) => {
  const [period, setPeriod] = useState<Period>('1Y');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPerformanceMetrics(accountId, period);
        setMetrics(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [accountId, period]);

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
        Failed to load performance metrics. Please try again later.
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="info">
        No performance data available for this account.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 3 }}>
        {/* Metrics Card - Left Column */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 33%' } }}>
          <PerformanceMetricsCard metrics={metrics} loading={isLoading} />
        </Box>

        {/* Chart - Right Column */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66%' } }}>
          <PerformanceChart
            data={metrics.historicalPerformance}
            period={period}
            onPeriodChange={setPeriod}
            loading={isLoading}
          />
        </Box>
      </Box>

      {/* Benchmark Comparison - Full Width */}
      <Box>
        <BenchmarkComparisonTable
          benchmarks={metrics.benchmarks}
          portfolioReturn={metrics.timeWeightedReturn}
          loading={isLoading}
        />
      </Box>
    </Box>
  );
};
