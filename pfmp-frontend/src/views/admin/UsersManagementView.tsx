/**
 * Wave 26 Phase C — minimal admin users page (locked decision 5B).
 *
 * Lists every PFMP user with activate/deactivate. Promote/demote and
 * chat-cost columns are deliberately deferred. The backend gates the whole
 * controller with the AdminOnly policy, so non-admins get 403s here — the
 * nav link is likewise hidden for them.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useAuth } from '../../contexts/auth/useAuth';
import { authFetch } from '../../services/authToken';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5052/api';

interface AdminUserRow {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  isTestAccount: boolean;
  bypassAuthentication: boolean;
  isActive: boolean;
  isAdmin: boolean;
  lastLoginAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function UsersManagementView() {
  const { realUserId } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const resp = await authFetch(`${API_BASE}/admin/users`);
      if (!resp.ok) {
        setError(resp.status === 403 ? 'Admin access required.' : `Failed to load users (${resp.status})`);
        setUsers([]);
        return;
      }
      setUsers(await resp.json() as AdminUserRow[]);
    } catch {
      setError('Could not reach the API.');
      setUsers([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setActive = async (userId: number, isActive: boolean) => {
    setBusyUserId(userId);
    setError(null);
    try {
      const resp = await authFetch(`${API_BASE}/admin/users/${userId}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!resp.ok) {
        let message = `Update failed (${resp.status})`;
        try {
          const body = await resp.json() as { message?: string };
          if (body?.message) message = body.message;
        } catch { /* non-JSON body */ }
        setError(message);
        return;
      }
      await load();
    } catch {
      setError('Could not reach the API.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }} data-testid="users-management-view">
      <Typography variant="h5" component="h1" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Deactivated users fail token resolution on their next request. You cannot deactivate your own account.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {users === null && <CircularProgress size={28} />}

      {users !== null && (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Flags</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId} hover>
                  <TableCell>{u.userId}</TableCell>
                  <TableCell>{`${u.firstName} ${u.lastName}`.trim() || '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {u.isAdmin && <Chip label="Admin" color="primary" size="small" />}
                      {u.isTestAccount && <Chip label="Test" size="small" />}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                  <TableCell>{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive ? 'Active' : 'Inactive'}
                      color={u.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      color={u.isActive ? 'warning' : 'success'}
                      disabled={busyUserId !== null || u.userId === realUserId}
                      title={u.userId === realUserId ? 'You cannot deactivate your own account' : undefined}
                      onClick={() => void setActive(u.userId, !u.isActive)}
                    >
                      {busyUserId === u.userId ? 'Saving…' : u.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
