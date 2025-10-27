import { Box, IconButton, Tooltip, Typography, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

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
}: DataRefreshIndicatorProps) {
  const isSmall = size === 'small';
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        variant={isSmall ? 'caption' : 'body2'}
        color="text.secondary"
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
