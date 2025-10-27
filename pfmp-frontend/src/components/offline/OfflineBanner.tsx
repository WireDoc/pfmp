import React from 'react';
import { Alert, Slide } from '@mui/material';
import { WifiOff, Wifi } from '@mui/icons-material';

interface Props {
  /**
   * Whether the app is currently offline
   */
  isOffline: boolean;
  /**
   * Whether the user was recently offline (for "back online" message)
   */
  wasOffline?: boolean;
}

/**
 * OfflineBanner - Displays a banner notification when the app goes offline
 * 
 * Shows a warning banner when offline and a success banner briefly when
 * coming back online. Uses Slide animation for smooth entry/exit.
 */
export const OfflineBanner: React.FC<Props> = ({ isOffline, wasOffline }) => {
  // Show offline banner when offline
  if (isOffline) {
    return (
      <Slide direction="down" in={isOffline} mountOnEnter unmountOnExit>
        <Alert
          severity="warning"
          icon={<WifiOff />}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            borderRadius: 0,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          You're offline. Some features may not work until your connection is restored.
        </Alert>
      </Slide>
    );
  }

  // Show "back online" banner briefly after reconnecting
  if (wasOffline) {
    return (
      <Slide direction="down" in={wasOffline} mountOnEnter unmountOnExit>
        <Alert
          severity="success"
          icon={<Wifi />}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            borderRadius: 0,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          You're back online!
        </Alert>
      </Slide>
    );
  }

  return null;
};
