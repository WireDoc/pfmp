import { Box, Typography, Paper, Link as MuiLink } from '@mui/material';

/**
 * HelpView - Placeholder for help/documentation page
 */
export function HelpView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Help & Documentation
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" paragraph>
          Welcome to PFMP! Here you'll find helpful resources and documentation.
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Getting Started
        </Typography>
        <Typography variant="body2" paragraph>
          • Complete your financial profile in the onboarding flow
          <br />
          • Review your dashboard for net worth and account summaries
          <br />
          • Check insights for AI-powered recommendations
          <br />
          • Manage tasks from accepted advice
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Need Support?
        </Typography>
        <Typography variant="body2">
          Contact support at{' '}
          <MuiLink href="mailto:support@pfmp.example.com">
            support@pfmp.example.com
          </MuiLink>
        </Typography>
      </Paper>
    </Box>
  );
}
