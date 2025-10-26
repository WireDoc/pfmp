import { Box, Typography, Paper } from '@mui/material';

/**
 * ProfileView - Placeholder for user profile page
 * Shows financial profile summary from onboarding
 */
export function ProfileView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Financial Profile
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Profile view coming soon. This will display:
        </Typography>
        <ul>
          <li>Household information</li>
          <li>Risk tolerance and goals</li>
          <li>Income sources</li>
          <li>Asset summary</li>
          <li>Liability overview</li>
          <li>Edit profile sections</li>
        </ul>
      </Paper>
    </Box>
  );
}
