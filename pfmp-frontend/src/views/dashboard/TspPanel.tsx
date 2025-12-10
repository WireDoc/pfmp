import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import type { AccountSnapshot } from '../../services/dashboard/types';

interface TspPanelProps {
  tspAccount?: AccountSnapshot;
  loading?: boolean;
}

export default function TspPanel({ tspAccount, loading = false }: TspPanelProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Thrift Savings Plan (TSP)
          </Typography>
          <Typography color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!tspAccount) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Thrift Savings Plan (TSP)
          </Typography>
          <Typography color="text.secondary">No TSP data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const totalValue = tspAccount.balance.amount;
  const lastSync = tspAccount.lastSync 
    ? new Date(tspAccount.lastSync).toLocaleDateString()
    : 'Unknown';

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <AccountBalanceIcon color="primary" />
            <Typography variant="h6">Thrift Savings Plan (TSP)</Typography>
          </Box>
          <Typography variant="h6" color="primary">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Balance
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastSync}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box 
              width={8} 
              height={8} 
              borderRadius="50%" 
              bgcolor={tspAccount.syncStatus === 'ok' ? 'success.main' : 'warning.main'}
            />
            <Typography variant="caption" color="text.secondary">
              {tspAccount.syncStatus === 'ok' ? 'Synced' : 'Pending sync'}
            </Typography>
          </Box>
        </Box>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', flex: 1 }}>
            Click "View Details" for fund breakdown and current prices
          </Typography>
          <Button
            variant="outlined"
            size="small"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate('/dashboard/tsp')}
            sx={{ ml: 2 }}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
