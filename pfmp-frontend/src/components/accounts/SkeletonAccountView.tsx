import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PlaylistAdd as SetupIcon,
} from '@mui/icons-material';
import { updateAccountBalance, type AccountResponse } from '../../services/accountsApi';

interface SkeletonAccountViewProps {
  account: AccountResponse;
  onBalanceUpdated: (updatedAccount: AccountResponse) => void;
  onSetupClick: () => void;
}

export function SkeletonAccountView({ account, onBalanceUpdated, onSetupClick }: SkeletonAccountViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBalance, setEditedBalance] = useState(account.currentBalance.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditClick = () => {
    setEditedBalance(account.currentBalance.toString());
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBalance(account.currentBalance.toString());
    setError(null);
  };

  const handleSaveBalance = async () => {
    const newBalance = parseFloat(editedBalance);
    
    if (isNaN(newBalance) || newBalance < 0) {
      setError('Please enter a valid positive number');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const updatedAccount = await updateAccountBalance(account.accountId, newBalance);
      onBalanceUpdated(updatedAccount);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to update balance');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) {
      handleSaveBalance();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Box>
      {/* Setup Prompt Card */}
      <Card sx={{ mb: 3, bgcolor: 'info.light', borderLeft: 4, borderColor: 'info.main' }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Complete Your Account Setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This account currently shows only a total balance. To unlock detailed analytics, 
                performance tracking, and tax insights, complete the setup wizard to add your holdings breakdown.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<SetupIcon />}
                onClick={onSetupClick}
                size="large"
              >
                Complete Setup Wizard
              </Button>
              <Typography variant="caption" color="text.secondary">
                Optional - You can continue using the account with just the balance
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Current Balance Card */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Balance
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {isEditing ? (
            <>
              <TextField
                value={editedBalance}
                onChange={(e) => setEditedBalance(e.target.value)}
                onKeyDown={handleKeyPress}
                label="Balance"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                disabled={saving}
                autoFocus
                sx={{ width: 200 }}
              />
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSaveBalance}
                disabled={saving}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h4" color="primary.main">
                ${account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
                size="small"
              >
                Edit Balance
              </Button>
            </>
          )}
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> This account is in setup mode. You can edit the balance manually until 
            you complete the setup wizard. Once you add your holdings breakdown, the balance will be 
            calculated automatically from your holdings.
          </Typography>
        </Alert>
      </Paper>

      {/* Features Available After Setup */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Unlock These Features
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Complete the setup wizard to access:
        </Typography>
        <Stack spacing={1} sx={{ pl: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • <strong>Performance Analytics</strong> - Track returns over time
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Tax Insights</strong> - Capital gains/losses, tax lot tracking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Risk Analysis</strong> - Volatility, max drawdown, correlations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Allocation Charts</strong> - By asset type, sector, market cap
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Holdings Management</strong> - Add, edit, delete individual holdings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Transaction History</strong> - Track buys, sells, dividends
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
