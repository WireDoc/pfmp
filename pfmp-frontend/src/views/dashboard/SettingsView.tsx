import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Switch,
  Slider,
  Snackbar,
  Alert,
  Skeleton,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import BalanceIcon from '@mui/icons-material/Balance';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useDevUserId } from '../../dev/devUserState';
import { userService } from '../../services/api';
import type { User } from '../../services/api';

/**
 * SettingsView - User settings and configuration
 * Route: /dashboard/settings
 */
export function SettingsView() {
  const navigate = useNavigate();
  const userId = useDevUserId() ?? 1;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await userService.getById(userId);
        if (!cancelled) setUser(res.data);
      } catch {
        if (!cancelled) setToast({ message: 'Failed to load settings', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const savePreference = useCallback(async (field: string, value: boolean | number) => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = { ...user, [field]: value };
      // Strip navigation properties
      const { accounts, ...payload } = updated as User & { accounts?: unknown };
      await userService.update(user.userId, payload as User);
      setUser(updated);
      setToast({ message: 'Preference saved', severity: 'success' });
    } catch {
      setToast({ message: 'Failed to save preference', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [user]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} />
        <Skeleton variant="rectangular" height={120} sx={{ mt: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 3 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {/* Connected Accounts Section */}
      <Paper sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          Connected Accounts
        </Typography>
        <Divider />
        <List disablePadding>
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigate('/dashboard/settings/connections')}>
              <ListItemIcon>
                <LinkIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Connected Accounts"
                secondary="Manage all linked bank, investment, credit card, and loan accounts"
              />
              <ChevronRightIcon color="action" />
            </ListItemButton>
          </ListItem>
        </List>
      </Paper>

      {/* Notification Preferences */}
      <Paper sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          Notification Preferences
        </Typography>
        <Divider />
        <List disablePadding>
          <ListItem>
            <ListItemIcon>
              <EmailIcon color={user?.enableEmailAlerts ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Email Alerts"
              secondary="Receive important alerts and AI advice via email"
            />
            <Switch
              edge="end"
              checked={user?.enableEmailAlerts ?? true}
              disabled={saving}
              onChange={(_, checked) => savePreference('enableEmailAlerts', checked)}
              slotProps={{ input: { 'aria-label': 'Email Alerts' } }}
            />
          </ListItem>
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon>
              <NotificationsIcon color={user?.enablePushNotifications ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Push Notifications"
              secondary="Real-time browser notifications for urgent alerts"
            />
            <Switch
              edge="end"
              checked={user?.enablePushNotifications ?? true}
              disabled={saving}
              onChange={(_, checked) => savePreference('enablePushNotifications', checked)}
              slotProps={{ input: { 'aria-label': 'Push Notifications' } }}
            />
          </ListItem>
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon>
              <BalanceIcon color={user?.enableRebalancingAlerts ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Rebalancing Alerts"
              secondary="Get notified when portfolio allocation drifts beyond threshold"
            />
            <Switch
              edge="end"
              checked={user?.enableRebalancingAlerts ?? true}
              disabled={saving}
              onChange={(_, checked) => savePreference('enableRebalancingAlerts', checked)}
              slotProps={{ input: { 'aria-label': 'Rebalancing Alerts' } }}
            />
          </ListItem>
          {user?.enableRebalancingAlerts && (
            <ListItem sx={{ pl: 9 }}>
              <Stack spacing={1} sx={{ width: '100%', maxWidth: 400 }}>
                <Typography variant="body2" color="text.secondary">
                  Rebalancing Threshold: {user?.rebalancingThreshold ?? 5}%
                </Typography>
                <Slider
                  value={user?.rebalancingThreshold ?? 5}
                  min={1}
                  max={20}
                  step={1}
                  marks={[
                    { value: 1, label: '1%' },
                    { value: 5, label: '5%' },
                    { value: 10, label: '10%' },
                    { value: 20, label: '20%' },
                  ]}
                  valueLabelDisplay="auto"
                  disabled={saving}
                  onChangeCommitted={(_, val) => savePreference('rebalancingThreshold', val as number)}
                  aria-label="Rebalancing Threshold"
                />
              </Stack>
            </ListItem>
          )}
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon>
              <AccountBalanceIcon color={user?.enableTaxOptimization ? 'primary' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Tax Optimization"
              secondary="Include tax-loss harvesting and tax-efficient placement in AI analysis"
            />
            <Switch
              edge="end"
              checked={user?.enableTaxOptimization ?? true}
              disabled={saving}
              onChange={(_, checked) => savePreference('enableTaxOptimization', checked)}
              slotProps={{ input: { 'aria-label': 'Tax Optimization' } }}
            />
          </ListItem>
        </List>
      </Paper>

      {/* Account Info */}
      {user && (
        <Paper sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            Account Information
          </Typography>
          <Divider />
          <List disablePadding>
            <ListItem>
              <ListItemText
                primary="Email"
                secondary={user.email}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Last Login"
                secondary={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Not available'}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Account Created"
                secondary={new Date(user.createdAt).toLocaleDateString()}
              />
            </ListItem>
          </List>
        </Paper>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)} variant="filled">{toast?.message}</Alert>
      </Snackbar>
    </Box>
  );
}
