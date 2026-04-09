import React from 'react';
import { Paper, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const actions: QuickAction[] = [
  { label: 'Run AI Analysis', icon: <InsightsIcon />, path: '/dashboard/insights' },
  { label: 'Add Account', icon: <AccountBalanceIcon />, path: '/dashboard/accounts' },
  { label: 'View Expenses', icon: <ReceiptLongIcon />, path: '/dashboard/profile?tab=expenses' },
  { label: 'Update TSP', icon: <SavingsIcon />, path: '/dashboard/tsp' },
];

export const QuickActionsBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper sx={{ p: 1.5 }} data-testid="quick-actions-bar">
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Quick Actions</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {actions.map(action => (
          <Button
            key={action.label}
            variant="outlined"
            size="small"
            startIcon={action.icon}
            onClick={() => navigate(action.path)}
            sx={{ textTransform: 'none' }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
};
