/**
 * ConnectionsSettingsView (Wave 11)
 * 
 * Settings page for managing connected bank accounts.
 * Route: /settings/connections
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  Skeleton,
  Alert,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AccountBalance as BankIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { PlaidLinkButton, ConnectedBanksList } from '../../components/plaid';
import { getConnections, syncAllConnections } from '../../services/plaidApi';
import type { PlaidConnection } from '../../services/plaidApi';
import { useDevUserId } from '../../dev/devUserState';

export const ConnectionsSettingsView: React.FC = () => {
  const devUserId = useDevUserId();
  const userId = devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');
  
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      setError(null);
      const data = await getConnections(userId);
      setConnections(data);
    } catch (err) {
      setError('Failed to load connected accounts. Please try again.');
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncAllConnections(userId);
      await loadConnections();
    } catch (err) {
      setError('Failed to sync accounts. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkSuccess = () => {
    // Refresh the connections list after linking a new bank
    loadConnections();
  };

  const handleDisconnect = (connectionId: string) => {
    // Remove the disconnected connection from state
    setConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
  };

  const hasConnections = connections.length > 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component={RouterLink}
          to="/dashboard"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          Dashboard
        </Link>
        <Link
          component={RouterLink}
          to="/settings"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <SettingsIcon fontSize="small" />
          Settings
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <BankIcon fontSize="small" />
          Connected Accounts
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Connected Accounts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Link your bank accounts to automatically sync your balances.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasConnections && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleSyncAll}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync All'}
            </Button>
          )}
          <PlaidLinkButton
            userId={userId}
            onSuccess={handleLinkSuccess}
            buttonText="Link Bank"
            size="medium"
          />
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BankIcon color="primary" />
          <Typography variant="h6">Your Connected Banks</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={80} />
            ))}
          </Box>
        ) : (
          <ConnectedBanksList
            connections={connections}
            userId={userId}
            onRefresh={loadConnections}
            onDisconnect={handleDisconnect}
          />
        )}

        {/* Empty State */}
        {!loading && connections.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              px: 3,
            }}
          >
            <BankIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Banks Connected
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Link your bank accounts to automatically sync your checking, savings, 
              and money market balances. We use bank-level encryption to keep your data secure.
            </Typography>
            <PlaidLinkButton
              userId={userId}
              onSuccess={handleLinkSuccess}
              buttonText="Link Your First Bank"
              size="large"
            />
          </Box>
        )}
      </Paper>

      {/* Security Note */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>🔒 Security Note:</strong> We use Plaid, a trusted financial services provider, 
          to securely connect to your bank. We never store your bank login credentials, and 
          you can disconnect your accounts at any time.
        </Typography>
      </Box>

      {/* Sync Schedule Info */}
      {hasConnections && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>⏰ Automatic Sync:</strong> Your account balances are automatically 
            updated every day at 10 PM Eastern Time. You can also manually sync at any time 
            using the "Sync Now" button.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default ConnectionsSettingsView;
