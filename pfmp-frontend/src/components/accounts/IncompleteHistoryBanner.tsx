import { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  HistoryEdu as HistoryIcon,
} from '@mui/icons-material';
import {
  fetchTransactionHistoryStatus,
  type TransactionHistoryStatus,
} from '../../api/portfolioAnalytics';
import { AddOpeningBalancesDialog } from './AddOpeningBalancesDialog';

interface IncompleteHistoryBannerProps {
  accountId: number;
  onBalancesAdded?: () => void;
}

/**
 * Banner that displays when an investment account has incomplete transaction history.
 * Prompts the user to add opening balances for accurate performance calculations.
 */
export function IncompleteHistoryBanner({
  accountId,
  onBalancesAdded,
}: IncompleteHistoryBannerProps) {
  const [status, setStatus] = useState<TransactionHistoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        const result = await fetchTransactionHistoryStatus(accountId);
        setStatus(result);
      } catch (err) {
        console.error('Error checking transaction history status:', err);
        // Don't show banner if we can't determine status
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [accountId]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleBalancesAdded = async () => {
    setDialogOpen(false);
    // Refresh status
    try {
      const result = await fetchTransactionHistoryStatus(accountId);
      setStatus(result);
    } catch (err) {
      console.error('Error refreshing status:', err);
    }
    onBalancesAdded?.();
  };

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Don't render if history is complete or no status
  if (!status || status.isComplete) {
    return null;
  }

  // Don't render if dismissed for this session
  if (dismissed) {
    return null;
  }

  return (
    <>
      <Collapse in={!dismissed}>
        <Alert
          severity="info"
          icon={<HistoryIcon />}
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                onClick={handleOpenDialog}
                disabled={status.holdingsNeedingBalance.length === 0}
              >
                Add Opening Balances
              </Button>
              <IconButton
                aria-label="dismiss"
                color="inherit"
                size="small"
                onClick={() => setDismissed(true)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <AlertTitle>Incomplete Transaction History</AlertTitle>
          {status.message}
          {status.holdingsNeedingBalance.length > 0 && (
            <Box component="span" sx={{ ml: 1 }}>
              ({status.holdingsNeedingBalance.length} holding
              {status.holdingsNeedingBalance.length !== 1 ? 's' : ''} need
              {status.holdingsNeedingBalance.length === 1 ? 's' : ''} opening
              balances)
            </Box>
          )}
        </Alert>
      </Collapse>

      <AddOpeningBalancesDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        accountId={accountId}
        holdings={status.holdingsNeedingBalance}
        onSuccess={handleBalancesAdded}
      />
    </>
  );
}
