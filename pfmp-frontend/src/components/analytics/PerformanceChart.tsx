import React from 'react';
import { Paper, Typography, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatPercent } from '../../utils/exportHelpers';
import type { PerformanceDataPoint } from '../../api/portfolioAnalytics';
import type { Period } from '../../api/portfolioAnalytics';

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  loading?: boolean;
}

const periodOptions: Period[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'All'];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  period,
  onPeriodChange,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Performance Chart
        </Typography>
        <Typography color="text.secondary">Loading chart data...</Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Performance History
        </Typography>

        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, value) => {
            if (value !== null) {
              onPeriodChange(value as Period);
            }
          }}
          size="small"
        >
          {periodOptions.map((p) => (
            <ToggleButton key={p} value={p}>
              {p}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        {data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No performance data available for this period
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                tickFormatter={(value) => formatPercent(value)}
              />
              <Tooltip
                formatter={(value: number) => formatPercent(value)}
                labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="portfolioReturn"
                name="Portfolio"
                stroke="#2196f3"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmarkReturn"
                name="S&P 500"
                stroke="#9e9e9e"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
};
