import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency, formatPercent } from '../../utils/exportHelpers';
import type { AllocationItem } from '../../api/portfolioAnalytics';

interface AllocationSunburstChartProps {
  allocations: AllocationItem[];
  dimension: 'assetClass' | 'sector' | 'geography' | 'marketCap';
  loading?: boolean;
}

const COLORS = [
  '#1976d2', // blue
  '#388e3c', // green
  '#f57c00', // orange
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#0097a7', // cyan
  '#c2185b', // pink
  '#fbc02d', // yellow
  '#5d4037', // brown
  '#455a64', // blue-grey
  '#e91e63', // deep pink
  '#00bcd4', // cyan
];

const getDimensionLabel = (dimension: string): string => {
  switch (dimension) {
    case 'assetClass':
      return 'Asset Class';
    case 'sector':
      return 'Sector';
    case 'geography':
      return 'Geography';
    case 'marketCap':
      return 'Market Cap';
    default:
      return dimension;
  }
};

export const AllocationSunburstChart: React.FC<AllocationSunburstChartProps> = ({
  allocations,
  dimension,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2, minHeight: 350 }}>
        <Typography variant="h6" gutterBottom>
          Allocation by {getDimensionLabel(dimension)}
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (!allocations || allocations.length === 0) {
    return (
      <Paper sx={{ p: 2, minHeight: 350 }}>
        <Typography variant="h6" gutterBottom>
          Allocation by {getDimensionLabel(dimension)}
        </Typography>
        <Typography color="text.secondary">No allocation data available</Typography>
      </Paper>
    );
  }

  // Transform data and sort by percentage descending
  const sortedData = allocations
    .map(item => ({
      name: item.category,
      value: item.value,
      percentage: item.percent,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Value: {formatCurrency(data.value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Percentage: {formatPercent(data.percentage / 100)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Calculate dynamic height based on number of items (more items = taller legend)
  // Base height 350px + 25px per item over 5 items
  const chartHeight = Math.max(350, 300 + (sortedData.length * 25));

  return (
    <Box>
      <Paper sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Allocation by {getDimensionLabel(dimension)}
        </Typography>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={sortedData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={100}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '10px' }}
              formatter={(value, entry: any) => {
                const item = sortedData.find((d) => d.name === value);
                if (item) {
                  return `${value} (${item.percentage.toFixed(1)}%)`;
                }
                return value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Paper>

      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
        <Typography variant="caption" color="info.dark">
          <strong>Diversification Tip:</strong> A well-diversified portfolio typically has no single 
          {dimension === 'assetClass' && ' asset class'}
          {dimension === 'sector' && ' sector'}
          {dimension === 'geography' && ' geographic region'}
          {dimension === 'marketCap' && ' market cap category'}
          {' '}representing more than 25-30% of total value.
        </Typography>
      </Box>
    </Box>
  );
};
