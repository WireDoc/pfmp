import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type { LiabilitySnapshot } from '../../services/dashboard/types';

interface LiabilitiesPanelProps {
  liabilities?: LiabilitySnapshot[];
  loading?: boolean;
}

export default function LiabilitiesPanel({ liabilities = [], loading = false }: LiabilitiesPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Liabilities
          </Typography>
          <Typography color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!liabilities || liabilities.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Liabilities
          </Typography>
          <Typography color="text.secondary">No liabilities to display</Typography>
        </CardContent>
      </Card>
    );
  }

  const totalDebt = liabilities.reduce((sum, l) => sum + l.currentBalance.amount, 0);
  const totalMinimumPayment = liabilities.reduce((sum, l) => sum + (l.minimumPayment?.amount || 0), 0);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Liabilities</Typography>
          <Typography variant="h6" color="error">
            ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {liabilities.map((liability) => (
            <Card key={liability.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <AccountBalanceIcon color="action" />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {liability.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {liability.type}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2" fontWeight={600}>
                      ${liability.currentBalance.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Typography>
                    {liability.interestRate && (
                      <Typography variant="caption" color="text.secondary">
                        {liability.interestRate.toFixed(2)}% APR
                      </Typography>
                    )}
                  </Box>
                </Box>

                {liability.minimumPayment && liability.minimumPayment.amount > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Min Payment: ${liability.minimumPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" fontWeight={600}>Total Debt</Typography>
            <Typography variant="body2" fontWeight={600} color="error">
              ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          {totalMinimumPayment > 0 && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Total Min Payment</Typography>
              <Typography variant="body2" fontWeight={600}>
                ${totalMinimumPayment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
