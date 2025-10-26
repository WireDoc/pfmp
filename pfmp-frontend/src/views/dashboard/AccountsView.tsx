import { Box, Typography, Paper } from '@mui/material';

/**
 * AccountsView - Placeholder for accounts list page
 * Shows all user accounts (cash, investments, TSP, properties)
 */
export function AccountsView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Accounts
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Account list view coming soon. This will display all your financial accounts including:
        </Typography>
        <ul>
          <li>Cash accounts (checking, savings, money market)</li>
          <li>Investment accounts (brokerage, retirement)</li>
          <li>TSP positions</li>
          <li>Real estate properties</li>
        </ul>
      </Paper>
    </Box>
  );
}
