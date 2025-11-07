import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import type { SyncStatus } from '../../services/dashboard';

interface Props {
  /**
   * Sync status of the account
   */
  status: SyncStatus;
  /**
   * Last sync timestamp (ISO string)
   */
  lastSync: string;
  /**
   * Size variant for the badge
   */
  size?: 'small' | 'medium';
}

/**
 * SyncStatusBadge - Visual indicator for account sync status
 * 
 * Displays a colored badge with icon showing whether account data is:
 * - ok: Successfully synced (green)
 * - pending: Sync in progress (orange)
 * - error: Sync failed (red)
 */
export const SyncStatusBadge: React.FC<Props> = ({
  status,
  lastSync,
  size = 'small',
}) => {
  // Format last sync time
  const getLastSyncText = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return new Intl.DateTimeFormat(undefined, { 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch {
      return 'Unknown';
    }
  };

  const lastSyncText = getLastSyncText(lastSync);

  // Configure badge appearance based on status
  const config = {
    ok: {
      color: 'success' as const,
      icon: <CheckCircleIcon />,
      label: 'Synced',
      tooltip: `Last synced: ${lastSyncText}`,
    },
    pending: {
      color: 'warning' as const,
      icon: <PendingIcon />,
      label: 'Syncing',
      tooltip: 'Sync in progress...',
    },
    error: {
      color: 'error' as const,
      icon: <ErrorIcon />,
      label: 'Error',
      tooltip: `Sync failed. Last attempt: ${lastSyncText}`,
    },
    manual: {
      color: 'default' as const,
      icon: <CheckCircleIcon />,
      label: 'Manual',
      tooltip: `Manually entered account. Last updated: ${lastSyncText}`,
    },
  };

  const { color, icon, label, tooltip } = config[status];

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        icon={icon}
        label={label}
        color={color}
        size={size}
        data-testid={`sync-status-${status}`}
      />
    </Tooltip>
  );
};
