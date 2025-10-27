import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
  /**
   * Optional callback to trigger when user clicks retry
   */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * DashboardErrorBoundary - Error boundary specialized for dashboard content
 * 
 * Catches runtime errors in the dashboard and displays a user-friendly
 * error message with retry capability. Logs errors to console for debugging.
 */
export class DashboardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error('[DashboardErrorBoundary] Caught error:', error);
    console.error('[DashboardErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
    // trackError(error, { componentStack: errorInfo.componentStack });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message ?? 'An unexpected error occurred';
      const isDevelopment = import.meta.env.DEV;

      return (
        <Box sx={{ p: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textAlign: 'center',
            }}
          >
            <ErrorOutline sx={{ fontSize: 64, color: 'error.main', opacity: 0.7 }} />
            
            <Box>
              <Typography variant="h5" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                We encountered an unexpected error while loading your dashboard.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try refreshing the page or contact support if the problem persists.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              size="large"
            >
              Try Again
            </Button>

            {isDevelopment && (
              <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Development Error Details:
                </Typography>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                  {errorMessage}
                </Typography>
                {this.state.errorInfo && (
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.7rem', mt: 1 }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Alert>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
