import { Chip, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PendingIcon from '@mui/icons-material/Pending';
import type { AutoSaveStatus } from '../hooks/useAutoSaveForm';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  isDirty: boolean;
  error: unknown;
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffSeconds = Math.round((now - date.getTime()) / 1000);
  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AutoSaveIndicator({ status, lastSavedAt, isDirty, error }: AutoSaveIndicatorProps) {
  if (status === 'error') {
    const message = error instanceof Error ? error.message : 'We couldn’t save your updates. Please retry.';
    return (
      <Chip
        icon={<ErrorOutlineIcon sx={{ color: '#c62828 !important' }} />}
        label={message}
        color="error"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600, maxWidth: '100%' }}
      />
    );
  }

  if (status === 'saving') {
    return (
      <Chip
        icon={<CircularProgress size={14} sx={{ color: '#1565c0 !important' }} />}
        label="Saving…"
        color="primary"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  }

  if (status === 'saved') {
    return (
      <Chip
        icon={<CheckCircleIcon sx={{ color: '#2e7d32 !important' }} />}
        label={lastSavedAt ? `Saved ${formatTimestamp(lastSavedAt)}` : 'Saved'}
        color="success"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  }

  if (isDirty) {
    return (
      <Chip
        icon={<PendingIcon sx={{ color: '#ef6c00 !important' }} />}
        label="Unsaved changes"
        color="warning"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CheckCircleIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
      <Typography variant="caption" sx={{ fontWeight: 600, color: '#2e7d32' }}>
        All changes synced
      </Typography>
    </Stack>
  );
}

export default AutoSaveIndicator;
