import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatPercent } from '../../utils/exportHelpers';
import type { DrawdownDataPoint } from '../../api/portfolioAnalytics';

interface DrawdownChartProps {
  data: DrawdownDataPoint[];
  loading?: boolean;
}

export const DrawdownChart: React.FC<DrawdownChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Drawdown Chart
        </Typography>
        <Typography color="text.secondary">Loading chart data...</Typography>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Drawdown Chart
        </Typography>
        <Typography color="text.secondary">
          No drawdown data available for this period
        </Typography>
      </Paper>
    );
  }

  const maxDrawdown = Math.min(...data.map(d => d.drawdown));

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Drawdown Chart (Underwater Plot)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Shows portfolio decline from peak value over time
        </Typography>
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={[maxDrawdown * 1.1, 0]}
            />
            <Tooltip
              formatter={(value: number) => formatPercent(value)}
              labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#f44336"
              fill="url(#colorDrawdown)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ p: 2, pt: 0, bgcolor: 'error.lighter', borderRadius: 1 }}>
        <Typography variant="body2" color="error.dark">
          <strong>Maximum Drawdown: {formatPercent(maxDrawdown)}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          The drawdown chart shows how far below the peak your portfolio has fallen. 
          A value of 0% means you're at a new high. Negative values show the percentage 
          decline from the previous peak.
        </Typography>
      </Box>
    </Paper>
  );
};
