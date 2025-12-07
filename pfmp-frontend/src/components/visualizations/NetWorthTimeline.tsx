/**
 * Net Worth Timeline Component
 * 
 * Stacked area chart showing net worth growth over time by category.
 * Uses Recharts for the stacked area visualization.
 * 
 * Features:
 * - Stacked areas for different account types
 * - Time range selector (1M, 3M, 6M, 1Y, ALL)
 * - Hover tooltips with breakdown
 * - Responsive design
 */

import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Skeleton,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Time range options
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface NetWorthDataPoint {
  date: string;
  investments: number;
  realEstate: number;
  cash: number;
  retirement: number;
  liabilities: number;
  total: number;
}

interface NetWorthTimelineProps {
  data?: NetWorthDataPoint[];
  loading?: boolean;
  height?: number;
}

// Color scheme for different categories
const CATEGORY_COLORS = {
  investments: '#1976d2', // Blue
  realEstate: '#7b1fa2', // Purple
  cash: '#388e3c', // Green
  retirement: '#f57c00', // Orange
  liabilities: '#d32f2f', // Red (shown as negative)
};

// Format currency
const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Format full currency for tooltip
const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Generate demo data for visualization
const generateDemoData = (months: number): NetWorthDataPoint[] => {
  const data: NetWorthDataPoint[] = [];
  const now = new Date();
  
  // Starting values
  let investments = 85000;
  let realEstate = 150000; // Home equity
  let cash = 15000;
  let retirement = 120000;
  let liabilities = 45000; // Debt
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    // Simulate growth with some volatility
    const volatility = 0.02;
    const growth = 0.005; // ~6% annual growth
    
    investments *= 1 + growth + (Math.random() - 0.5) * volatility;
    realEstate *= 1 + growth * 0.5; // Slower growth for real estate
    cash *= 1 + 0.001; // Minimal cash growth
    retirement *= 1 + growth + (Math.random() - 0.5) * volatility * 0.5;
    liabilities *= 0.995; // Slowly paying down debt
    
    // Add occasional larger changes (contributions/withdrawals)
    if (Math.random() > 0.8) {
      retirement += 1000; // Monthly contribution
    }
    if (Math.random() > 0.9) {
      cash += 2000; // Bonus
    }
    
    const total = investments + realEstate + cash + retirement - liabilities;
    
    data.push({
      date: date.toISOString().split('T')[0],
      investments: Math.round(investments),
      realEstate: Math.round(realEstate),
      cash: Math.round(cash),
      retirement: Math.round(retirement),
      liabilities: Math.round(liabilities),
      total: Math.round(total),
    });
  }
  
  return data;
};

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  // Calculate total (excluding liabilities which is negative in the stacked area)
  const totalNetWorth = payload.reduce((sum, item) => {
    if (item.name === 'liabilities') return sum - item.value;
    return sum + item.value;
  }, 0);
  
  return (
    <Paper sx={{ p: 1.5, maxWidth: 250 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        {new Date(label!).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Typography>
      
      {payload.map((item) => (
        <Box
          key={item.name}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: 0.5,
                bgcolor: item.color,
              }}
            />
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
              {item.name}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            fontWeight="medium"
            color={item.name === 'liabilities' ? 'error.main' : 'text.primary'}
          >
            {item.name === 'liabilities' ? '-' : ''}
            {formatFullCurrency(item.value)}
          </Typography>
        </Box>
      ))}
      
      <Box
        sx={{
          mt: 1,
          pt: 1,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" fontWeight="bold">
          Net Worth
        </Typography>
        <Typography variant="body2" fontWeight="bold" color="primary.main">
          {formatFullCurrency(totalNetWorth)}
        </Typography>
      </Box>
    </Paper>
  );
};

export const NetWorthTimeline: React.FC<NetWorthTimelineProps> = ({
  data: providedData,
  loading = false,
  height = 400,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  
  // Filter data based on time range
  const chartData = useMemo(() => {
    // Use provided data or generate demo data
    const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : timeRange === '1Y' ? 12 : 36;
    const fullData = providedData ?? generateDemoData(months);
    
    // Filter based on time range
    if (timeRange === 'ALL') return fullData;
    
    const now = new Date();
    const cutoff = new Date(now);
    
    switch (timeRange) {
      case '1M':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
      case '3M':
        cutoff.setMonth(cutoff.getMonth() - 3);
        break;
      case '6M':
        cutoff.setMonth(cutoff.getMonth() - 6);
        break;
      case '1Y':
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        break;
    }
    
    return fullData.filter((d) => new Date(d.date) >= cutoff);
  }, [providedData, timeRange]);
  
  // Calculate summary stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const change = last.total - first.total;
    const changePercent = (change / first.total) * 100;
    
    return {
      currentNetWorth: last.total,
      change,
      changePercent,
    };
  }, [chartData]);
  
  const handleTimeRangeChange = (
    _: React.MouseEvent<HTMLElement>,
    newRange: TimeRange | null
  ) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };
  
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Net Worth Over Time
        </Typography>
        <Skeleton variant="rectangular" height={height} />
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            Net Worth Over Time
          </Typography>
          {stats && (
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Current Net Worth
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatFullCurrency(stats.currentNetWorth)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Change ({timeRange})
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={stats.change >= 0 ? 'success.main' : 'error.main'}
                >
                  {stats.change >= 0 ? '+' : ''}
                  {formatFullCurrency(stats.change)} ({stats.changePercent >= 0 ? '+' : ''}
                  {stats.changePercent.toFixed(1)}%)
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
        
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
        >
          <ToggleButton value="1M">1M</ToggleButton>
          <ToggleButton value="3M">3M</ToggleButton>
          <ToggleButton value="6M">6M</ToggleButton>
          <ToggleButton value="1Y">1Y</ToggleButton>
          <ToggleButton value="ALL">ALL</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                <linearGradient
                  key={key}
                  id={`color${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.2} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            <XAxis
              dataKey="date"
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString('en-US', {
                  month: 'short',
                  year: timeRange === 'ALL' ? '2-digit' : undefined,
                })
              }
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (
                <span style={{ textTransform: 'capitalize' }}>{value}</span>
              )}
            />
            
            {/* Stacked areas - order matters for layering */}
            <Area
              type="monotone"
              dataKey="retirement"
              name="retirement"
              stackId="1"
              stroke={CATEGORY_COLORS.retirement}
              fill={`url(#colorretirement)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="investments"
              name="investments"
              stackId="1"
              stroke={CATEGORY_COLORS.investments}
              fill={`url(#colorinvestments)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="realEstate"
              name="realEstate"
              stackId="1"
              stroke={CATEGORY_COLORS.realEstate}
              fill={`url(#colorrealEstate)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cash"
              name="cash"
              stackId="1"
              stroke={CATEGORY_COLORS.cash}
              fill={`url(#colorcash)`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
        <Typography variant="caption" color="info.dark">
          <strong>Note:</strong> This chart shows the growth of your net worth
          over time, broken down by asset category. Liabilities are not shown in
          the stacked area but are subtracted from the total.
        </Typography>
      </Box>
    </Paper>
  );
};
