import React, { useCallback } from 'react';
import { Paper, Box, Typography, Divider, Button, Stack, Alert } from '@mui/material';
import GenerateAdviceButton from './GenerateAdviceButton';
import AdviceList from './AdviceList';

interface AdvicePanelProps {
  userId: number;
}

/**
 * Temporary Wave 1 Advice panel.
 * Provides: generate action + list display stacked vertically.
 * This file can be removed or relocated in a future dashboard refactor.
 */
const AdvicePanel: React.FC<AdvicePanelProps> = ({ userId }) => {
  const handleGenerated = useCallback(() => {
    // If we later expose a refresh method from AdviceList, call it here.
    // For now, parent doesn't need to do anything because AdviceList doesn't expose imperative handle.
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
        Temporary advice panel (Wave 1). Will evolve with validator & task linking.
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" component="h2">AI Advice</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <GenerateAdviceButton userId={userId} onGenerated={handleGenerated} />
          <Button size="small" variant="outlined" onClick={handleGenerated}>Manual Refresh</Button>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <AdviceList userId={userId} />
      </Box>
    </Paper>
  );
};

export default AdvicePanel;
