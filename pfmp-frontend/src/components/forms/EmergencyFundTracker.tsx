import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  LinearProgress,
  Chip,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import type { Account, Goal } from '../../services/api';
import { accountService, goalService, userService } from '../../services/api';

interface EmergencyFundTrackerProps {
  userId: number;
  onUpdate?: () => void;
}

interface EmergencyFundData {
  goal: Goal | null;
  emergencyAccounts: Account[];
  totalEmergencyFunds: number;
  monthlyExpenses: number;
  monthsCovered: number;
  recommendedTarget: number;
  status: 'insufficient' | 'adequate' | 'excellent';
}

export const EmergencyFundTracker: React.FC<EmergencyFundTrackerProps> = ({ userId, onUpdate }) => {
  const [data, setData] = useState<EmergencyFundData | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [updateAmount, setUpdateAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState(6);
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadEmergencyFundData();
  }, [userId]);

  const loadEmergencyFundData = async () => {
    try {
      setLoading(true);
      
      // Load emergency fund goal status
      const goalResponse = await goalService.getEmergencyFundStatus(userId);
      const emergencyData = goalResponse.data;
      
      // Load all accounts to find emergency fund accounts
      const accountsResponse = await accountService.getByUser(userId);
      const emergencyAccounts = accountsResponse.data.filter(
        (account: Account) => account.isEmergencyFund
      );
      
      // Load user summary for additional context
      const userSummary = await userService.getSummary(userId);
      const summaryData = userSummary.data;
      
      const totalEmergencyFunds = emergencyAccounts.reduce(
        (sum: number, account: Account) => sum + account.currentBalance, 
        0
      );
      
      // Estimate monthly expenses if not available (could be improved with actual expense tracking)
      const estimatedMonthlyExpenses = summaryData.estimatedMonthlyExpenses || 
        (summaryData.totalMonthlyIncome * 0.7); // Assume 70% of income for expenses
      
      const monthsCovered = estimatedMonthlyExpenses > 0 ? 
        totalEmergencyFunds / estimatedMonthlyExpenses : 0;
      
      let status: 'insufficient' | 'adequate' | 'excellent';
      if (monthsCovered < 3) {
        status = 'insufficient';
      } else if (monthsCovered < 6) {
        status = 'adequate';
      } else {
        status = 'excellent';
      }
      
      setData({
        goal: emergencyData.goal || null,
        emergencyAccounts,
        totalEmergencyFunds,
        monthlyExpenses: estimatedMonthlyExpenses,
        monthsCovered,
        recommendedTarget: targetMonths * estimatedMonthlyExpenses,
        status,
      });
      
      if (emergencyAccounts.length > 0) {
        setSelectedAccountId(emergencyAccounts[0].accountId);
      }
      
      setMonthlyExpenses(estimatedMonthlyExpenses.toString());
      
    } catch (err) {
      setError('Failed to load emergency fund data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedAccountId || !updateAmount) {
      setError('Please select an account and enter an amount');
      return;
    }
    
    const amount = parseFloat(updateAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid positive amount');
      return;
    }
    
    setUpdating(true);
    setError(null);
    
    try {
      // Get current account data
      const accountResponse = await accountService.getById(selectedAccountId as number);
      const account = accountResponse.data;
      
      // Update account balance
      const updatedAccount = {
        ...account,
        currentBalance: amount,
        updatedAt: new Date().toISOString(),
      };
      
      await accountService.update(selectedAccountId as number, updatedAccount);
      
      // If there's an emergency fund goal, update its progress
      if (data?.goal) {
        const newTotalFunds = data.emergencyAccounts
          .filter(acc => acc.accountId !== selectedAccountId)
          .reduce((sum, acc) => sum + acc.currentBalance, 0) + amount;
          
        await goalService.updateProgress(data.goal.goalId, newTotalFunds);
      }
      
      setSuccess(true);
      setUpdateAmount('');
      if (onUpdate) onUpdate();
      
      // Reload data to reflect changes
      await loadEmergencyFundData();
      
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to update emergency fund balance');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateEmergencyGoal = async () => {
    if (!data) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      const expenses = parseFloat(monthlyExpenses) || data.monthlyExpenses;
      const targetAmount = targetMonths * expenses;
      
      const newGoal = {
        userId,
        name: 'Emergency Fund',
        description: `${targetMonths} months of expenses emergency fund`,
        type: 'EmergencyFund' as const,
        category: 'ShortTerm' as const,
        targetAmount,
        currentAmount: data.totalEmergencyFunds,
        priority: 1,
        status: 'Active' as const,
        monthlyContribution: targetAmount > data.totalEmergencyFunds ? 
          (targetAmount - data.totalEmergencyFunds) / 12 : 0, // Suggest 12-month timeline
      };
      
      await goalService.create(newGoal);
      
      setSuccess(true);
      if (onUpdate) onUpdate();
      
      // Reload data
      await loadEmergencyFundData();
      
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to create emergency fund goal');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'insufficient': return 'error';
      case 'adequate': return 'warning';
      case 'excellent': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'insufficient': return <Warning />;
      case 'adequate': return <TrendingUp />;
      case 'excellent': return <CheckCircle />;
      default: return <AccountBalance />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">Failed to load emergency fund data</Alert>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = data.recommendedTarget > 0 ? 
    Math.min((data.totalEmergencyFunds / data.recommendedTarget) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader
        title="Emergency Fund Tracker"
        subheader={`${data.monthsCovered.toFixed(1)} months of expenses covered`}
        action={
          <Chip
            icon={getStatusIcon(data.status)}
            label={data.status.charAt(0).toUpperCase() + data.status.slice(1)}
            color={getStatusColor(data.status) as any}
            variant="outlined"
          />
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
            Emergency fund updated successfully!
          </Alert>
        )}

        {/* Progress Overview */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">
              Current: ${data.totalEmergencyFunds.toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Target: ${data.recommendedTarget.toLocaleString()}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ height: 8, borderRadius: 4 }}
            color={getStatusColor(data.status) as any}
          />
          <Typography variant="caption" display="block" mt={1}>
            {progressPercentage.toFixed(1)}% of target reached
          </Typography>
        </Box>

        {/* Account Balances */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Emergency Fund Accounts:
          </Typography>
          {data.emergencyAccounts.length === 0 ? (
            <Alert severity="warning">
              No accounts marked as emergency funds. Consider marking your savings accounts as emergency funds.
            </Alert>
          ) : (
            <Grid container spacing={1}>
              {data.emergencyAccounts.map((account) => (
                <Grid size={{ xs: 12, sm: 6 }} key={account.accountId}>
                  <Box
                    border={1}
                    borderColor="grey.300"
                    borderRadius={1}
                    p={2}
                    bgcolor={selectedAccountId === account.accountId ? 'action.selected' : 'transparent'}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {account.accountName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {account.institution}
                    </Typography>
                    <Typography variant="h6">
                      ${account.currentBalance.toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Update Balance */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Update Account Balance:
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Account</InputLabel>
                <Select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value as number)}
                  label="Account"
                  disabled={data.emergencyAccounts.length === 0}
                >
                  {data.emergencyAccounts.map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId}>
                      {account.accountName} - ${account.currentBalance.toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="New Balance"
                type="number"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                InputProps={{
                  startAdornment: '$',
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleUpdateBalance}
                disabled={updating || !selectedAccountId || !updateAmount}
                startIcon={updating ? <CircularProgress size={20} /> : null}
                sx={{ height: '100%' }}
              >
                Update
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Goal Management */}
        {!data.goal && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Create Emergency Fund Goal:
              </Typography>
              <Grid container spacing={2} alignItems="end">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Monthly Expenses"
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    InputProps={{
                      startAdornment: '$',
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Target Months"
                    type="number"
                    value={targetMonths}
                    onChange={(e) => setTargetMonths(Number(e.target.value))}
                    inputProps={{
                      min: 1,
                      max: 12,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Target: ${((parseFloat(monthlyExpenses) || 0) * targetMonths).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleCreateEmergencyGoal}
                    disabled={updating}
                  >
                    Create Goal
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        {/* Recommendations */}
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Recommendations:
          </Typography>
          {data.status === 'insufficient' && (
            <Alert severity="error" sx={{ mb: 1 }}>
              <strong>Critical:</strong> Your emergency fund covers less than 3 months of expenses. 
              Consider prioritizing building this fund before other investments.
            </Alert>
          )}
          {data.status === 'adequate' && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <strong>Good progress:</strong> You have 3-6 months covered. 
              Consider building to 6-12 months for better security.
            </Alert>
          )}
          {data.status === 'excellent' && (
            <Alert severity="success" sx={{ mb: 1 }}>
              <strong>Excellent:</strong> You have strong emergency fund coverage! 
              Consider investing excess cash for higher returns.
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};