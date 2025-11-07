import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import type { PropertySnapshot } from '../../services/dashboard/types';

interface PropertiesPanelProps {
  properties?: PropertySnapshot[];
  loading?: boolean;
}

export default function PropertiesPanel({ properties = [], loading = false }: PropertiesPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Properties
          </Typography>
          <Typography color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Properties
          </Typography>
          <Typography color="text.secondary">No properties to display</Typography>
        </CardContent>
      </Card>
    );
  }

  const totalValue = properties.reduce((sum, p) => sum + p.estimatedValue.amount, 0);
  const totalMortgage = properties.reduce((sum, p) => sum + (p.mortgageBalance?.amount || 0), 0);
  const totalEquity = totalValue - totalMortgage;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Properties</Typography>
          <Typography variant="h6" color="primary">
            ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {properties.map((property) => {
            const equity = property.estimatedValue.amount - (property.mortgageBalance?.amount || 0);
            const equityPct = property.estimatedValue.amount > 0
              ? (equity / property.estimatedValue.amount) * 100
              : 0;

            return (
              <Card key={property.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <HomeIcon color="action" />
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {property.address}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {property.type}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="body2" fontWeight={600}>
                        ${equity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {equityPct.toFixed(1)}% equity
                      </Typography>
                    </Box>
                  </Box>

                  <Box mt={1} display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Value: ${property.estimatedValue.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Typography>
                    {property.mortgageBalance && property.mortgageBalance.amount > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Mortgage: ${property.mortgageBalance.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">Total Value</Typography>
            <Typography variant="body2" fontWeight={600}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">Total Mortgages</Typography>
            <Typography variant="body2" fontWeight={600}>
              ${totalMortgage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" fontWeight={600}>Net Equity</Typography>
            <Typography variant="body2" fontWeight={600} color="primary">
              ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
