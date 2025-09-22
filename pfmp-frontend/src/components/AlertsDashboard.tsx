import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { AlertCard } from './AlertCard';

interface AlertsDashboardProps {
  userId: number;
}

// Sample alert data for demonstration
const sampleAlerts = [
  {
    alertId: 1,
    userId: 1,
    title: 'Portfolio Rebalancing Recommended',
    message: 'Your C Fund allocation has drifted to 75% (target: 70%). Consider rebalancing to maintain your target allocation and optimize returns.',
    severity: 'High' as const,
    category: 'Rebalancing',
    isRead: false,
    isActionable: true,
    createdAt: new Date().toISOString(),
  },
  {
    alertId: 2,
    userId: 1,
    title: 'Emergency Fund Below Target',
    message: 'Your emergency fund is currently at $8,500 but your target is $15,000. Consider increasing contributions to reach your goal faster.',
    severity: 'Medium' as const,
    category: 'Goal',
    isRead: false,
    isActionable: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    alertId: 3,
    userId: 1,
    title: 'Tax Loss Harvesting Opportunity',
    message: 'VTIAX in your taxable account is down 12% from purchase price. Consider harvesting losses for tax benefits.',
    severity: 'Medium' as const,
    category: 'Tax',
    isRead: true,
    isActionable: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

export const AlertsDashboard: React.FC<AlertsDashboardProps> = ({ userId }) => {
  const [alerts, setAlerts] = useState(sampleAlerts);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMarkAsRead = (alertId: number) => {
    setAlerts(alerts.map(alert => 
      alert.alertId === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const handleDismiss = (alertId: number) => {
    setAlerts(alerts.filter(alert => alert.alertId !== alertId));
  };

  const handleTaskCreated = () => {
    setSuccessMessage('Task created successfully! You can view and manage it in the Tasks tab.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const readAlerts = alerts.filter(alert => alert.isRead);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Alerts & Recommendations
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            AI-powered recommendations and alerts to help optimize your financial portfolio. 
            Convert actionable recommendations into tasks that you can track and complete.
          </Typography>
        </CardContent>
      </Card>

      {unreadAlerts.length > 0 && (
        <>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            New Recommendations ({unreadAlerts.length})
          </Typography>
          {unreadAlerts.map(alert => (
            <AlertCard
              key={alert.alertId}
              alert={alert}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismiss}
              onTaskCreated={handleTaskCreated}
            />
          ))}
        </>
      )}

      {readAlerts.length > 0 && (
        <>
          <Typography variant="h5" component="h2" sx={{ mb: 2, mt: 4 }}>
            Previous Alerts ({readAlerts.length})
          </Typography>
          {readAlerts.map(alert => (
            <AlertCard
              key={alert.alertId}
              alert={alert}
              onDismiss={handleDismiss}
              onTaskCreated={handleTaskCreated}
            />
          ))}
        </>
      )}

      {alerts.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No alerts or recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your portfolio looks good! We'll notify you when recommendations are available.
          </Typography>
        </Box>
      )}
    </Box>
  );
};