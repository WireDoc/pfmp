import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Breadcrumbs,
  Link,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Skeleton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import netWorthService, {
  type TimelineResponse,
  type TimelinePeriod,
} from '../../services/netWorthService';
import { useDevUserId } from '../../dev/devUserState';
import { useAuth } from '../../contexts/auth/useAuth';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const periodLabels: Record<TimelinePeriod, string> = {
  '1M': '1 Month',
  '3M': '3 Months',
  '6M': '6 Months',
  '1Y': '1 Year',
  'YTD': 'Year to Date',
  'ALL': 'All Time',
};

/**
 * NetWorthTimelineView - Full-page net worth history visualization
 * Wave 10: Background Jobs & Automation - Phase 3
 */
export const NetWorthTimelineView: React.FC = () => {
  const { user } = useAuth();
  const devUserId = useDevUserId();
  const navigate = useNavigate();
  // Priority: 1) Dev user switcher, 2) Authenticated user, 3) Env var fallback
  const userId = devUserId ?? (user?.localAccountId ? Number(user.localAccountId) : null) ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');
  const [period, setPeriod] = useState<TimelinePeriod>('3M');
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Track which datasets are hidden (by label) to persist across period changes
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await netWorthService.getTimeline(userId, period);
      setData(response);
    } catch (err) {
      console.error('Failed to fetch net worth timeline:', err);
      setError('Failed to load net worth history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePeriodChange = (_: React.MouseEvent<HTMLElement>, newPeriod: TimelinePeriod | null) => {
    if (newPeriod) {
      setPeriod(newPeriod);
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    
    setRefreshing(true);
    try {
      await netWorthService.triggerSnapshot(userId);
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh snapshot:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Chart configuration
  const chartData = {
    labels: data?.snapshots.map(s => {
      const date = new Date(s.date);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }) ?? [],
    datasets: [
      {
        label: 'Net Worth',
        data: data?.snapshots.map(s => s.totalNetWorth) ?? [],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: data && data.snapshots.length < 30 ? 4 : 0,
        pointHoverRadius: 6,
        hidden: hiddenDatasets.has('Net Worth'),
      },
      {
        label: 'Investments',
        data: data?.snapshots.map(s => s.investments) ?? [],
        borderColor: '#2e7d32',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        hidden: hiddenDatasets.has('Investments'),
      },
      {
        label: 'Cash',
        data: data?.snapshots.map(s => s.cash) ?? [],
        borderColor: '#ed6c02',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        hidden: hiddenDatasets.has('Cash'),
      },
      {
        label: 'Retirement',
        data: data?.snapshots.map(s => s.retirement) ?? [],
        borderColor: '#9c27b0',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        hidden: hiddenDatasets.has('Retirement'),
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
        onClick: (_event, legendItem, legend) => {
          // Get the dataset label
          const label = legendItem.text;
          if (!label) return;
          
          // Toggle visibility in our state
          setHiddenDatasets(prev => {
            const next = new Set(prev);
            if (next.has(label)) {
              next.delete(label);
            } else {
              next.add(label);
            }
            return next;
          });
          
          // Also toggle the default Chart.js behavior
          const index = legendItem.datasetIndex;
          if (index !== undefined) {
            const meta = legend.chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            legend.chart.update();
          }
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return '';
            return `${context.dataset.label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `$${Number(value).toLocaleString()}`,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  // Empty state component
  const EmptyState = () => (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Building Your Net Worth History
      </Typography>
      <Typography color="text.secondary" paragraph>
        We're collecting data to show your net worth over time.
        Check back in a few days once we have enough data points.
      </Typography>
      {data && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {data.dataPoints} of 3 minimum data points collected
        </Typography>
      )}
      <Box sx={{ mt: 3 }}>
        <Tooltip title="Take a snapshot now">
          <IconButton onClick={handleRefresh} disabled={refreshing} color="primary">
            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );

  // Summary stats component
  const SummaryStats = () => {
    if (!data?.summary) return null;
    
    const { summary } = data;
    const changeColor = summary.change >= 0 ? 'success.main' : 'error.main';
    
    return (
      <Box display="flex" gap={4} flexWrap="wrap" mb={3}>
        <Box>
          <Typography variant="caption" color="text.secondary">Current</Typography>
          <Typography variant="h5">${summary.endValue.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Change</Typography>
          <Typography variant="h6" sx={{ color: changeColor }}>
            {summary.change >= 0 ? '+' : ''}${summary.change.toLocaleString()}
            {' '}
            <Typography component="span" variant="body2" sx={{ color: changeColor }}>
              ({summary.changePercent >= 0 ? '+' : ''}{summary.changePercent.toFixed(2)}%)
            </Typography>
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">High</Typography>
          <Typography>${summary.high.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Low</Typography>
          <Typography>${summary.low.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Average</Typography>
          <Typography>${Math.round(summary.average).toLocaleString()}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Secondary Breadcrumbs - Back Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">Net Worth Timeline</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Net Worth Timeline</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            {(Object.keys(periodLabels) as TimelinePeriod[]).map((p) => (
              <ToggleButton key={p} value={p}>
                {p}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Paper sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Paper>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {data && data.dataPoints < 3 ? (
            <EmptyState />
          ) : (
            <Paper sx={{ p: 3 }}>
              <SummaryStats />
              <Box sx={{ height: 400 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Showing {data?.dataPoints ?? 0} data points from{' '}
                {periodLabels[period]}
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default NetWorthTimelineView;
