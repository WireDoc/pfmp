import { Box, Typography, Paper } from '@mui/material';

/**
 * InsightsView - Placeholder for insights page
 * Shows AI-generated insights and recommendations
 */
export function InsightsView() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Insights & Recommendations
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Insights view coming soon. This will display:
        </Typography>
        <ul>
          <li>AI-powered financial recommendations</li>
          <li>Portfolio rebalancing suggestions</li>
          <li>Tax optimization opportunities</li>
          <li>Cash yield optimization</li>
          <li>Emergency fund status</li>
        </ul>
      </Paper>
    </Box>
  );
}
