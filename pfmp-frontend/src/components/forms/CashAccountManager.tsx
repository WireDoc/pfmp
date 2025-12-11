import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Add,
  Edit,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import type { Account } from '../../services/api';
import { PlaidLinkButton } from '../plaid';
import { AccountType, AccountCategory, accountService } from '../../services/api';

interface CashAccountManagerProps {
  userId: number;
  onUpdate?: () => void;
}

interface CashOptimizationData {
  accounts: Account[];
  totalCash: number;
  averageAPR: number;
  bestAPRAccount: Account | null;
  recommendations: string[];
}

export const CashAccountManager: React.FC<CashAccountManagerProps> = ({ userId, onUpdate }) => {
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [optimizationData, setOptimizationData] = useState<CashOptimizationData | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    accountType: 'Savings' as AccountType,
    institution: '',
    currentBalance: '',
    interestRate: '',
    isEmergencyFund: false,
  });

  const CASH_ACCOUNT_TYPES = [
    { value: 'Checking', label: 'Checking Account' },
    { value: 'Savings', label: 'Savings Account' },
    { value: 'MoneyMarket', label: 'Money Market Account' },
    { value: 'CertificateOfDeposit', label: 'Certificate of Deposit (CD)' },
  ];

  const loadCashAccounts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all accounts for the user
      const accountsResponse = await accountService.getByUser(userId);
      const allAccounts = accountsResponse.data;
      
      // Filter for cash accounts
      const cashAccountTypes = ['Checking', 'Savings', 'MoneyMarket', 'CertificateOfDeposit'];
      const cashAccounts = allAccounts.filter(
        (account: Account) => cashAccountTypes.includes(account.accountType)
      );
      
      setCashAccounts(cashAccounts);
      
      // Load cash optimization data
      try {
        const optimizationResponse = await accountService.getCashOptimization(userId);
        setOptimizationData(optimizationResponse.data);
      } catch {
        // If optimization endpoint fails, calculate basic data locally
        const totalCash = cashAccounts.reduce((sum: number, acc: Account) => sum + acc.currentBalance, 0);
        const accountsWithAPR = cashAccounts.filter((acc: Account) => acc.interestRate && acc.interestRate > 0);
        const averageAPR = accountsWithAPR.length > 0 
          ? accountsWithAPR.reduce((sum: number, acc: Account) => sum + (acc.interestRate || 0), 0) / accountsWithAPR.length
          : 0;
        const bestAPRAccount = cashAccounts.reduce((best: Account | null, current: Account) => {
          if (!best || (current.interestRate || 0) > (best.interestRate || 0)) {
            return current;
          }
          return best;
        }, null);
        
        setOptimizationData({
          accounts: cashAccounts,
          totalCash,
          averageAPR,
          bestAPRAccount,
          recommendations: generateBasicRecommendations(cashAccounts, totalCash, bestAPRAccount),
        });
      }
      
    } catch (err) {
      setError('Failed to load cash accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCashAccounts();
  }, [loadCashAccounts]);

  const generateBasicRecommendations = (accounts: Account[], totalCash: number, bestAPRAccount: Account | null): string[] => {
    const recommendations = [];
    
    if (accounts.length === 0) {
      recommendations.push('Consider opening a high-yield savings account for your cash reserves.');
    }
    
    if (bestAPRAccount && bestAPRAccount.interestRate && bestAPRAccount.interestRate < 3.0) {
      recommendations.push('Consider looking for higher-yield savings accounts (3%+ APR) to maximize your cash returns.');
    }
    
    const emergencyFunds = accounts.filter(acc => acc.isEmergencyFund);
    if (emergencyFunds.length === 0 && totalCash > 5000) {
      recommendations.push('Consider designating one of your savings accounts as an emergency fund.');
    }
    
    const lowBalanceAccounts = accounts.filter(acc => acc.currentBalance < 100);
    if (lowBalanceAccounts.length > 2) {
      recommendations.push('Consider consolidating accounts with low balances to reduce complexity.');
    }
    
    return recommendations;
  };

  const handleCreateAccount = async () => {
    if (!accountForm.accountName || !accountForm.currentBalance) {
      setError('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const newAccount = {
        userId,
        accountName: accountForm.accountName,
        accountType: accountForm.accountType,
        category: 'Cash' as AccountCategory,
        institution: accountForm.institution,
        currentBalance: parseFloat(accountForm.currentBalance) || 0,
        interestRate: parseFloat(accountForm.interestRate) || 0,
        hasAPIIntegration: false,
        isEmergencyFund: accountForm.isEmergencyFund,
      };
      
      await accountService.create(newAccount);
      
      setSuccess(true);
      setShowAddDialog(false);
      resetForm();
      if (onUpdate) onUpdate();
      
      await loadCashAccounts();
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to create account');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !accountForm.accountName || !accountForm.currentBalance) {
      setError('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const updatedAccount = {
        ...editingAccount,
        accountName: accountForm.accountName,
        accountType: accountForm.accountType,
        institution: accountForm.institution,
        currentBalance: parseFloat(accountForm.currentBalance) || 0,
        interestRate: parseFloat(accountForm.interestRate) || 0,
        isEmergencyFund: accountForm.isEmergencyFund,
        updatedAt: new Date().toISOString(),
      };
      
      await accountService.update(editingAccount.accountId, updatedAccount);
      
      setSuccess(true);
      setEditingAccount(null);
      resetForm();
      if (onUpdate) onUpdate();
      
      await loadCashAccounts();
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to update account');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (account: Account) => {
    setEditingAccount(account);
    setAccountForm({
      accountName: account.accountName,
      accountType: account.accountType as AccountType,
      institution: account.institution || '',
      currentBalance: account.currentBalance.toString(),
      interestRate: account.interestRate?.toString() || '',
      isEmergencyFund: account.isEmergencyFund,
    });
  };

  const resetForm = () => {
    setAccountForm({
      accountName: '',
      accountType: 'Savings',
      institution: '',
      currentBalance: '',
      interestRate: '',
      isEmergencyFund: false,
    });
  };

  const getAPRColor = (apr: number) => {
    if (apr >= 4.0) return 'success';
    if (apr >= 2.0) return 'warning';
    return 'error';
  };

  const getAPRIcon = (apr: number) => {
    if (apr >= 4.0) return <TrendingUp color="success" />;
    if (apr >= 2.0) return <TrendingUp color="warning" />;
    return <TrendingDown color="error" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Cash Account Manager"
        subheader={`${cashAccounts.length} accounts | Total: $${optimizationData?.totalCash?.toLocaleString() || '0'}`}
        action={
          <Box display="flex" gap={1} alignItems="center">
            <PlaidLinkButton 
              variant="outlined"
              size="medium"
              buttonText="Link Bank"
              onSuccess={() => {
                loadCashAccounts();
                if (onUpdate) onUpdate();
              }} 
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              Add Manual
            </Button>
          </Box>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Cash account updated successfully!
          </Alert>
        )}

        {/* Optimization Summary */}
        {optimizationData && (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Cash Optimization Summary:
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box textAlign="center" p={2} bgcolor="primary.50" borderRadius={1}>
                  <Typography variant="h4" color="primary">
                    ${optimizationData?.totalCash?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cash
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box textAlign="center" p={2} bgcolor="success.50" borderRadius={1}>
                  <Typography variant="h4" color="success.main">
                    {optimizationData?.averageAPR?.toFixed(2) || '0'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average APR
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box textAlign="center" p={2} bgcolor="info.50" borderRadius={1}>
                  <Typography variant="h4" color="info.main">
                    {optimizationData?.bestAPRAccount?.interestRate?.toFixed(2) || '0'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Best APR
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Recommendations */}
        {optimizationData?.recommendations && optimizationData.recommendations.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Recommendations:
            </Typography>
            {optimizationData.recommendations.map((rec, index) => (
              <Alert key={index} severity="info" sx={{ mb: 1 }}>
                {rec}
              </Alert>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Accounts Table */}
        <Typography variant="subtitle1" gutterBottom>
          Your Cash Accounts:
        </Typography>
        
        {cashAccounts.length === 0 ? (
          <Alert severity="info">
            No cash accounts found. Add your first cash account to get started!
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="right">APR</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashAccounts.map((account) => (
                  <TableRow key={account.accountId}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {account.accountName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {account.institution}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {CASH_ACCOUNT_TYPES.find(t => t.value === account.accountType)?.label || account.accountType}
                    </TableCell>
                    <TableCell align="right">
                      ${account.currentBalance.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        {getAPRIcon(account.interestRate || 0)}
                        <Typography
                          color={`${getAPRColor(account.interestRate || 0)}.main`}
                          fontWeight="bold"
                        >
                          {account.interestRate?.toFixed(2) || '0.00'}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {account.isEmergencyFund && (
                        <Chip
                          label="Emergency Fund"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => startEditing(account)}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Dialog */}
        <Dialog 
          open={showAddDialog || editingAccount !== null} 
          onClose={() => {
            setShowAddDialog(false);
            setEditingAccount(null);
            resetForm();
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingAccount ? 'Edit Cash Account' : 'Add New Cash Account'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Account Name"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, accountName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={accountForm.accountType}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, accountType: e.target.value as AccountType }))}
                    label="Account Type"
                  >
                    {CASH_ACCOUNT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Institution"
                  value={accountForm.institution}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, institution: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Current Balance"
                  type="number"
                  value={accountForm.currentBalance}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, currentBalance: e.target.value }))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  inputProps={{
                    min: 0,
                    step: 0.01,
                  }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Interest Rate (APR)"
                  type="number"
                  value={accountForm.interestRate}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, interestRate: e.target.value }))}
                  InputProps={{
                    endAdornment: '%',
                  }}
                  inputProps={{
                    min: 0,
                    max: 20,
                    step: 0.01,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl>
                  <Select
                    value={accountForm.isEmergencyFund ? 'yes' : 'no'}
                    onChange={(e) => setAccountForm(prev => ({ 
                      ...prev, 
                      isEmergencyFund: e.target.value === 'yes' 
                    }))}
                  >
                    <MenuItem value="no">Regular Cash Account</MenuItem>
                    <MenuItem value="yes">Emergency Fund Account</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowAddDialog(false);
                setEditingAccount(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={editingAccount ? handleUpdateAccount : handleCreateAccount}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Saving...' : (editingAccount ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};