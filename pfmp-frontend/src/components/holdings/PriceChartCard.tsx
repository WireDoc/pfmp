import { useState, useEffect } from 'react';
import { Box, Paper, Typography, ToggleButtonGroup, ToggleButton, CircularProgress, Alert } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PriceHistoryData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
}

interface PriceChartCardProps {
  holdingId: number;
  symbol: string;
}

type Period = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | '10Y';

export function PriceChartCard({ holdingId, symbol }: PriceChartCardProps) {
  const [period, setPeriod] = useState<Period>('1M');
  const [data, setData] = useState<PriceHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

  useEffect(() => {
    fetchPriceHistory();
  }, [holdingId, period]);

  const fetchPriceHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/holdings/${holdingId}/price-history?period=${period}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }

      const prices: PriceHistoryData[] = await response.json();
      
      // Sort by date ascending and ensure clean data
      const sortedPrices = prices
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item) => ({
          ...item,
          // Ensure date is in a consistent format
          date: new Date(item.date).toISOString()
        }));
      
      setData(sortedPrices);
    } catch (err) {
      console.error('Error fetching price history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: Period | null) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (period === '1D') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: PriceHistoryData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Parse the date string properly - assuming ISO format from backend
      const dateObj = new Date(data.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        timeZone: 'UTC' // Use UTC to match backend data
      });
      
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">
            {formattedDate}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Open: {formatPrice(data.open)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            High: {formatPrice(data.high)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Low: {formatPrice(data.low)}
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            Close: {formatPrice(data.close)}
          </Typography>
          {data.change !== null && data.change !== undefined && (
            <Typography variant="body2" sx={{ color: data.change >= 0 ? 'success.main' : 'error.main' }}>
              Change: {formatPrice(data.change)} ({data.changePercent?.toFixed(2)}%)
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  };

  const chartData = data.map(item => ({
    ...item,
    displayDate: formatDate(item.date),
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Price History - {symbol}</Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          <ToggleButton value="1D">1D</ToggleButton>
          <ToggleButton value="1W">1W</ToggleButton>
          <ToggleButton value="1M">1M</ToggleButton>
          <ToggleButton value="3M">3M</ToggleButton>
          <ToggleButton value="6M">6M</ToggleButton>
          <ToggleButton value="1Y">1Y</ToggleButton>
          <ToggleButton value="5Y">5Y</ToggleButton>
          <ToggleButton value="10Y">10Y</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data.length === 0 && (
        <Alert severity="info">
          No price history available for this period. Try selecting a different timeframe.
        </Alert>
      )}

      {!loading && !error && data.length > 0 && data.length < 3 && period === '1D' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Intraday data is limited. The 1D view shows daily closing prices only. For better visualization, try 1W or longer periods.
        </Alert>
      )}

      {!loading && !error && data.length > 0 && (
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (period === '1D') {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                tick={{ fontSize: 12 }}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#1976d2" 
                strokeWidth={2}
                dot={false}
                name="Close Price"
              />
              <Line 
                type="monotone" 
                dataKey="high" 
                stroke="#4caf50" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="High"
              />
              <Line 
                type="monotone" 
                dataKey="low" 
                stroke="#f44336" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Low"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
