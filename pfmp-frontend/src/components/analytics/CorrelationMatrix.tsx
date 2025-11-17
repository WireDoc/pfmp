import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

interface CorrelationMatrixProps {
  correlationMatrix: Record<string, Record<string, number>>;
  loading?: boolean;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  correlationMatrix,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Correlation Matrix
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  const symbols = Object.keys(correlationMatrix);

  if (symbols.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Correlation Matrix
        </Typography>
        <Typography color="text.secondary">
          No correlation data available
        </Typography>
      </Paper>
    );
  }

  // Helper to get color for correlation value
  const getCorrelationColor = (value: number): string => {
    if (value >= 0.8) return '#1b5e20'; // Strong positive - dark green
    if (value >= 0.5) return '#43a047'; // Moderate positive - green
    if (value >= 0.2) return '#81c784'; // Weak positive - light green
    if (value >= -0.2) return '#e0e0e0'; // Near zero - gray
    if (value >= -0.5) return '#ef5350'; // Weak negative - light red
    if (value >= -0.8) return '#e53935'; // Moderate negative - red
    return '#b71c1c'; // Strong negative - dark red
  };

  const getTextColor = (value: number): string => {
    return Math.abs(value) > 0.3 ? '#ffffff' : '#000000';
  };

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Correlation Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          How holdings move together (1.0 = perfect correlation, -1.0 = inverse, 0 = independent)
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  bgcolor: 'grey.100', 
                  fontWeight: 'bold',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                }}
              >
                Symbol
              </TableCell>
              {symbols.map((symbol) => (
                <TableCell 
                  key={symbol} 
                  align="center"
                  sx={{ 
                    bgcolor: 'grey.100', 
                    fontWeight: 'bold',
                    minWidth: 80,
                  }}
                >
                  {symbol}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {symbols.map((rowSymbol) => (
              <TableRow key={rowSymbol}>
                <TableCell 
                  sx={{ 
                    fontWeight: 'bold',
                    position: 'sticky',
                    left: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                  }}
                >
                  {rowSymbol}
                </TableCell>
                {symbols.map((colSymbol) => {
                  const value = correlationMatrix[rowSymbol]?.[colSymbol] ?? 0;
                  const isDiagonal = rowSymbol === colSymbol;
                  
                  return (
                    <TableCell
                      key={colSymbol}
                      align="center"
                      sx={{
                        bgcolor: getCorrelationColor(value),
                        color: getTextColor(value),
                        fontWeight: isDiagonal ? 'bold' : 'normal',
                        fontSize: '0.875rem',
                      }}
                    >
                      {value.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Color Guide:</strong>
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#1b5e20', borderRadius: 1 }} />
          <Typography variant="caption">Strong (+0.8 to +1.0)</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#81c784', borderRadius: 1 }} />
          <Typography variant="caption">Moderate (+0.2 to +0.8)</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#e0e0e0', borderRadius: 1 }} />
          <Typography variant="caption">Weak (-0.2 to +0.2)</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#e53935', borderRadius: 1 }} />
          <Typography variant="caption">Negative (-0.8 to -0.2)</Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2, pt: 0, bgcolor: 'info.lighter', borderRadius: 1, mx: 2, mb: 2 }}>
        <Typography variant="caption" color="info.dark">
          <strong>Diversification Tip:</strong> Lower correlations mean better diversification. 
          Holdings with correlations near 0 or negative provide the best diversification benefits.
        </Typography>
      </Box>
    </Paper>
  );
};
