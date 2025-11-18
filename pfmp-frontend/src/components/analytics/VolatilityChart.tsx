import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatPercent } from '../../utils/exportHelpers';
import type { VolatilityDataPoint } from '../../api/portfolioAnalytics';

interface VolatilityChartProps {
  data: VolatilityDataPoint[];
  loading?: boolean;
}

export const VolatilityChart: React.FC<VolatilityChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Volatility History
        </Typography>
        <Typography color="text.secondary">Loading chart data...</Typography>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Volatility History
        </Typography>
        <Typography color="text.secondary">
          No volatility data available for this period
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Volatility History (30-Day Rolling)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Weekly snapshots of 30-day annualized volatility
        </Typography>
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
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
              dataKey="volatility"
              name="Volatility"
              stroke="#f57c00"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Higher volatility indicates larger price swings. Most stocks have volatility 
          between 15-30%. Market volatility (SPY) averages around 16%.
        </Typography>
      </Box>
    </Paper>
  );
};
