import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  Avatar, 
  Chip,
  LinearProgress,
  Grid,
} from '@mui/material';
import { 
  AccountBalance, 
  TrendingUp, 
  Savings, 
  CreditCard,
  AttachMoney,
  Timeline
} from '@mui/icons-material';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * Protected Portfolio Overview - requires authentication
 */
export const ProtectedPortfolioOverview: React.FC = () => {
  return (
    <ProtectedRoute>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          Portfolio Overview
        </Typography>
        
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Value
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      $124,567
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <AttachMoney />
                  </Avatar>
                </Box>
                <Box mt={2}>
                  <Typography variant="body2" color="success.main">
                    +12.5% this month
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid2>
          
          <Grid2 size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Cash & Savings
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      $45,890
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <Savings />
                  </Avatar>
                </Box>
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    3 accounts
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid2>
          
          <Grid2 size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Investments
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      $67,234
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <Timeline />
                  </Avatar>
                </Box>
                <Box mt={2}>
                  <Typography variant="body2" color="success.main">
                    +8.3% YTD
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid2>
          
          <Grid2 size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Credit Used
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      $11,443
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <CreditCard />
                  </Avatar>
                </Box>
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    28.5% utilization
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid2>
        </Grid2>
      </Paper>
    </ProtectedRoute>
  );
};

/**
 * Protected Account List - requires authentication
 */
export const ProtectedAccountList: React.FC = () => {
  const accounts = [
    { name: 'Chase Checking', type: 'Checking', balance: 12450, institution: 'Chase Bank' },
    { name: 'Savings Account', type: 'Savings', balance: 33440, institution: 'Chase Bank' },
    { name: 'Investment Account', type: 'Investment', balance: 67234, institution: 'Fidelity' },
    { name: 'Credit Card', type: 'Credit', balance: -2340, institution: 'Chase Bank' },
  ];

  return (
    <ProtectedRoute>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalance color="primary" />
          Your Accounts
        </Typography>
        
        <Grid2 container spacing={2}>
          {accounts.map((account, index) => (
            <Grid2 size={{ xs: 12, md: 6 }} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {account.name}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {account.institution}
                      </Typography>
                    </Box>
                    <Chip 
                      label={account.type} 
                      size="small" 
                      color={account.type === 'Credit' ? 'warning' : 'primary'}
                    />
                  </Box>
                  
                  <Typography 
                    variant="h5" 
                    color={account.balance < 0 ? 'error.main' : 'text.primary'}
                  >
                    ${Math.abs(account.balance).toLocaleString()}
                    {account.balance < 0 && ' owed'}
                  </Typography>
                  
                  {account.type === 'Credit' && account.balance < 0 && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Credit Utilization
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={28.5} 
                        color="warning"
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        28.5% of $8,200 limit
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Paper>
    </ProtectedRoute>
  );
};

/**
 * Protected Goals Section - requires authentication
 */
export const ProtectedGoalsSection: React.FC = () => {
  const goals = [
    { name: 'Emergency Fund', target: 25000, current: 18500, deadline: '2024-12-31' },
    { name: 'House Down Payment', target: 100000, current: 45600, deadline: '2025-06-01' },
    { name: 'Vacation Fund', target: 8000, current: 3200, deadline: '2024-07-15' },
  ];

  return (
    <ProtectedRoute>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Savings color="primary" />
          Financial Goals
        </Typography>
        
        <Grid2 container spacing={3}>
          {goals.map((goal, index) => (
            <Grid2 size={{ xs: 12, md: 4 }} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {goal.name}
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Progress: ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(goal.current / goal.target) * 100}
                      color="primary"
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {Math.round((goal.current / goal.target) * 100)}% complete
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Target: {new Date(goal.deadline).toLocaleDateString()}
                  </Typography>
                  
                  <Chip 
                    label={goal.current >= goal.target ? 'Completed' : 'In Progress'} 
                    color={goal.current >= goal.target ? 'success' : 'primary'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Paper>
    </ProtectedRoute>
  );
};