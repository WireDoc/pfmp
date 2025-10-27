import { Box, IconButton, Tooltip, Typography, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon, Warning as WarningIcon } from '@mui/icons-material';

export interface DataRefreshIndicatorProps {
  /** Timestamp of last refresh */
  lastRefreshed: Date | null;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Callback when refresh button is clicked */
  onRefresh: () => void;
  /** Human-readable time since last refresh */
  timeSinceRefresh?: string;
  /** Optional label text */
  label?: string;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Whether the app is offline */
  isOffline?: boolean;
}

/**
 * Component showing last data update time with manual refresh button
 * 
 * @example
 * ```tsx
 * <DataRefreshIndicator
 *   lastRefreshed={lastRefreshed}
 *   isRefreshing={isRefreshing}
 *   onRefresh={refresh}
 *   timeSinceRefresh={timeSinceRefresh}
 * />
 * ```
 */
export function DataRefreshIndicator({
  lastRefreshed,
  isRefreshing,
  onRefresh,
  timeSinceRefresh,
  label = 'Updated',
  size = 'medium',
  isOffline = false,
}: DataRefreshIndicatorProps) {
  const isSmall = size === 'small';
  
  // Check if data is stale (>15 minutes old)
  const isStale = lastRefreshed && (Date.now() - lastRefreshed.getTime()) > 15 * 60 * 1000;
  const showWarning = isStale || isOffline;
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {showWarning && (
        <Tooltip title={isOffline ? 'Data may be outdated (offline)' : 'Data is stale (>15 min old)'}>
          <WarningIcon 
            fontSize={isSmall ? 'small' : 'medium'} 
            color="warning" 
            sx={{ fontSize: isSmall ? 16 : 20 }}
          />
        </Tooltip>
      )}
      <Typography
        variant={isSmall ? 'caption' : 'body2'}
        color={showWarning ? 'warning.main' : 'text.secondary'}
        sx={{ fontSize: isSmall ? '0.75rem' : undefined }}
      >
        {label}: {timeSinceRefresh || (lastRefreshed ? 'Just now' : 'Never')}
      </Typography>
      
      <Tooltip title={isRefreshing ? 'Refreshing...' : 'Refresh data'}>
        <span>
          <IconButton
            onClick={onRefresh}
            disabled={isRefreshing}
            size={isSmall ? 'small' : 'medium'}
            aria-label="refresh data"
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            {isRefreshing ? (
              <CircularProgress size={isSmall ? 16 : 20} />
            ) : (
              <RefreshIcon fontSize={isSmall ? 'small' : 'medium'} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
