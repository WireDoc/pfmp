import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Refresh, ErrorOutline } from '@mui/icons-material';

interface Props {
  /**
   * Error message to display
   */
  message?: string;
  /**
   * Optional detailed error description
   */
  description?: string;
  /**
   * Optional callback when retry button is clicked
   */
  onRetry?: () => void;
  /**
   * Whether retry button should be displayed
   */
  showRetry?: boolean;
  /**
   * Variant of the error display
   */
  variant?: 'inline' | 'banner';
}

/**
 * ErrorDisplay - User-friendly error display component
 * 
 * Displays error messages with optional retry functionality.
 * Can be used inline within dashboard panels or as a banner alert.
 */
export const ErrorDisplay: React.FC<Props> = ({
  message = 'Failed to load data',
  description,
  onRetry,
  showRetry = true,
  variant = 'inline',
}) => {
  if (variant === 'banner') {
    return (
      <Alert
        severity="error"
        action={
          showRetry && onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry} startIcon={<Refresh />}>
              Retry
            </Button>
          ) : undefined
        }
      >
        <Typography variant="body2">
          {message}
          {description && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
              {description}
            </Typography>
          )}
        </Typography>
      </Alert>
    );
  }

  // Inline variant
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        textAlign: 'center',
      }}
      data-testid="error-display"
    >
      <ErrorOutline sx={{ fontSize: 48, color: 'error.main', opacity: 0.5, mb: 2 }} />
      <Typography variant="body1" color="error" gutterBottom>
        {message}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {showRetry && onRetry && (
        <Button variant="outlined" color="error" startIcon={<Refresh />} onClick={onRetry} size="small">
          Try Again
        </Button>
      )}
    </Box>
  );
};
