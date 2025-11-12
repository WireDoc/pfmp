import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Holding } from '../../types/holdings';

interface AssetAllocationChartProps {
  holdings: Holding[];
}

const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Green
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#8884D8', // Purple
  '#82ca9d', // Light Green
  '#ffc658', // Gold
  '#ff7c7c', // Red
  '#8dd1e1', // Cyan
  '#d084d6', // Pink
];

export function AssetAllocationChart({ holdings }: AssetAllocationChartProps) {
  // Group holdings by asset type and calculate totals
  const allocationMap = new Map<string, number>();
  
  holdings.forEach(holding => {
    const assetType = holding.assetType;
    const currentValue = holding.currentValue;
    allocationMap.set(assetType, (allocationMap.get(assetType) || 0) + currentValue);
  });

  // Convert to array and calculate percentages
  const total = Array.from(allocationMap.values()).reduce((sum, value) => sum + value, 0);
  
  const data = Array.from(allocationMap.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / total) * 100).toFixed(1),
  })).sort((a, b) => b.value - a.value); // Sort by value descending

  if (data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data available for asset allocation
        </Typography>
      </Box>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percentage: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2">
            {formatCurrency(data.value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.percentage}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
