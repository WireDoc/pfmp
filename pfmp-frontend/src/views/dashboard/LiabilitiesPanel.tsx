import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Stack, IconButton, Tooltip } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SchoolIcon from '@mui/icons-material/School';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { LiabilitySnapshot } from '../../services/dashboard/types';

interface LiabilitiesPanelProps {
  liabilities?: LiabilitySnapshot[];
  loading?: boolean;
}

// Determine the icon and route based on liability type
function getLiabilityInfo(type: string) {
  const normalizedType = type.toLowerCase().replace(/[^a-z_]/g, '');
  
  if (normalizedType.includes('credit') || normalizedType === 'credit_card' || normalizedType === 'creditcard') {
    return { 
      Icon: CreditCardIcon, 
      route: 'credit-cards',
      color: 'info.main' as const
    };
  }
  if (normalizedType.includes('mortgage') || normalizedType === 'mortgage') {
    return { 
      Icon: HomeIcon, 
      route: 'loans',
      color: 'primary.main' as const
    };
  }
  if (normalizedType.includes('auto') || normalizedType === 'auto_loan' || normalizedType === 'autoloan') {
    return { 
      Icon: DirectionsCarIcon, 
      route: 'loans',
      color: 'secondary.main' as const
    };
  }
  if (normalizedType.includes('student') || normalizedType === 'student_loan' || normalizedType === 'studentloan') {
    return { 
      Icon: SchoolIcon, 
      route: 'loans',
      color: 'warning.main' as const
    };
  }
  // Default for other loan types
  return { 
    Icon: AccountBalanceIcon, 
    route: 'loans',
    color: 'action.active' as const
  };
}

export default function LiabilitiesPanel({ liabilities = [], loading = false }: LiabilitiesPanelProps) {
  const navigate = useNavigate();
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
          {liabilities.map((liability) => {
            const { Icon, route, color } = getLiabilityInfo(liability.type);
            
            return (
              <Card 
                key={liability.id} 
                variant="outlined" 
                sx={{ 
                  bgcolor: 'background.default',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'translateX(4px)',
                  }
                }}
                onClick={() => navigate(`/dashboard/${route}/${liability.id}`)}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Icon sx={{ color }} />
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {liability.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatLiabilityType(liability.type)}
                      </Typography>
                    </Box>
                    <Box textAlign="right" sx={{ mr: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        ${liability.currentBalance.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                      {liability.interestRate && (
                        <Typography variant="caption" color="text.secondary">
                          {liability.interestRate.toFixed(2)}% APR
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="View details">
                      <IconButton size="small">
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
            );
          })}
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

// Format liability type for display
function formatLiabilityType(type: string): string {
  const typeMap: Record<string, string> = {
    mortgage: 'Mortgage',
    auto_loan: 'Auto Loan',
    autoloan: 'Auto Loan',
    student_loan: 'Student Loan',
    studentloan: 'Student Loan',
    personal_loan: 'Personal Loan',
    personalloan: 'Personal Loan',
    credit_card: 'Credit Card',
    creditcard: 'Credit Card',
    'credit-card': 'Credit Card',
  };
  const normalizedType = type.toLowerCase().replace(/[^a-z_-]/g, '');
  return typeMap[normalizedType] || type;
}
