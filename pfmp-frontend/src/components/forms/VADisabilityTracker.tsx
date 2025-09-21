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
} from '@mui/material';
import {
  Add,
  Edit,
  LocalHospital,
  AttachMoney,
  TrendingUp,
} from '@mui/icons-material';
import { incomeSourceService, userService } from '../../services/api';

interface VADisabilityTrackerProps {
  userId: number;
  onUpdate?: () => void;
}

interface VADisabilityData {
  totalMonthlyAmount: number;
  combinedRating: number;
  isReceiving: boolean;
  incomeSources: any[];
  estimatedAnnualAmount: number;
  nextPaymentDate: string | null;
}

interface IncomeSourceForm {
  sourceName: string;
  amount: number;
  frequency: string;
  category: string;
  description: string;
  isTaxable: boolean;
  isActive: boolean;
}

const VA_DISABILITY_RATES = {
  10: 165.14,
  20: 327.99,
  30: 508.05,
  40: 731.86,
  50: 1041.82,
  60: 1319.65,
  70: 1663.06,
  80: 1933.15,
  90: 2172.39,
  100: 3737.85,
} as const;

const FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Annual', label: 'Annual' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'OneTime', label: 'One Time' },
];

export const VADisabilityTracker: React.FC<VADisabilityTrackerProps> = ({ userId, onUpdate }) => {
  const [vaData, setVAData] = useState<VADisabilityData | null>(null);
  const [userVAInfo, setUserVAInfo] = useState<{ percentage: number; monthlyAmount: number } | null>(null);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [sourceForm, setSourceForm] = useState<IncomeSourceForm>({
    sourceName: '',
    amount: 0,
    frequency: 'Monthly',
    category: 'DisabilityBenefits',
    description: '',
    isTaxable: false,
    isActive: true,
  });

  const [userUpdateForm, setUserUpdateForm] = useState({
    vaDisabilityPercentage: '',
    vaDisabilityMonthlyAmount: '',
  });

  useEffect(() => {
    loadVADisabilityData();
  }, [userId]);

  const loadVADisabilityData = async () => {
    try {
      setLoading(true);
      
      // Load VA disability info
      const vaInfoResponse = await incomeSourceService.getVADisabilityInfo(userId);
      setVAData(vaInfoResponse.data);
      
      // Load user VA information from user profile
      const userResponse = await userService.getById(userId);
      const userData = userResponse.data;
      
      if (userData.vaDisabilityPercentage || userData.vaDisabilityMonthlyAmount) {
        setUserVAInfo({
          percentage: userData.vaDisabilityPercentage || 0,
          monthlyAmount: userData.vaDisabilityMonthlyAmount || 0,
        });
        
        setUserUpdateForm({
          vaDisabilityPercentage: userData.vaDisabilityPercentage?.toString() || '',
          vaDisabilityMonthlyAmount: userData.vaDisabilityMonthlyAmount?.toString() || '',
        });
      }
      
    } catch (err) {
      setError('Failed to load VA disability data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncomeSource = async () => {
    if (!sourceForm.sourceName || !sourceForm.amount) {
      setError('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const newSource = {
        userId,
        sourceName: sourceForm.sourceName,
        amount: sourceForm.amount,
        frequency: sourceForm.frequency,
        category: sourceForm.category,
        description: sourceForm.description,
        isTaxable: sourceForm.isTaxable,
        isActive: sourceForm.isActive,
        nextPaymentDate: calculateNextPaymentDate(sourceForm.frequency),
      };
      
      await incomeSourceService.create(newSource);
      
      setSuccess(true);
      setShowAddDialog(false);
      resetForm();
      if (onUpdate) onUpdate();
      
      await loadVADisabilityData();
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to create income source');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateIncomeSource = async () => {
    if (!editingSource || !sourceForm.sourceName || !sourceForm.amount) {
      setError('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const updatedSource = {
        ...editingSource,
        sourceName: sourceForm.sourceName,
        amount: sourceForm.amount,
        frequency: sourceForm.frequency,
        category: sourceForm.category,
        description: sourceForm.description,
        isTaxable: sourceForm.isTaxable,
        isActive: sourceForm.isActive,
        nextPaymentDate: calculateNextPaymentDate(sourceForm.frequency),
        updatedAt: new Date().toISOString(),
      };
      
      await incomeSourceService.update(editingSource.incomeSourceId, updatedSource);
      
      setSuccess(true);
      setEditingSource(null);
      resetForm();
      if (onUpdate) onUpdate();
      
      await loadVADisabilityData();
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to update income source');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserVAInfo = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const userResponse = await userService.getById(userId);
      const userData = userResponse.data;
      
      const updatedUser = {
        ...userData,
        vaDisabilityPercentage: userUpdateForm.vaDisabilityPercentage 
          ? parseInt(userUpdateForm.vaDisabilityPercentage) 
          : null,
        vaDisabilityMonthlyAmount: userUpdateForm.vaDisabilityMonthlyAmount 
          ? parseFloat(userUpdateForm.vaDisabilityMonthlyAmount) 
          : null,
        updatedAt: new Date().toISOString(),
      };
      
      await userService.update(userId, updatedUser);
      
      setSuccess(true);
      if (onUpdate) onUpdate();
      
      await loadVADisabilityData();
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError('Failed to update user VA information');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const calculateNextPaymentDate = (frequency: string): string => {
    const now = new Date();
    switch (frequency) {
      case 'Monthly':
        // VA typically pays on the 1st of the month
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth.toISOString();
      case 'Annual':
        const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        return nextYear.toISOString();
      case 'Quarterly':
        const nextQuarter = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        return nextQuarter.toISOString();
      default:
        return now.toISOString();
    }
  };

  const startEditing = (source: any) => {
    setEditingSource(source);
    setSourceForm({
      sourceName: source.sourceName,
      amount: source.amount,
      frequency: source.frequency,
      category: source.category,
      description: source.description || '',
      isTaxable: source.isTaxable,
      isActive: source.isActive,
    });
  };

  const resetForm = () => {
    setSourceForm({
      sourceName: '',
      amount: 0,
      frequency: 'Monthly',
      category: 'DisabilityBenefits',
      description: '',
      isTaxable: false,
      isActive: true,
    });
  };

  const getDisabilityRateForPercentage = (percentage: number): number => {
    return VA_DISABILITY_RATES[percentage as keyof typeof VA_DISABILITY_RATES] || 0;
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
        title="VA Disability Benefits Tracker"
        subheader={userVAInfo ? `${userVAInfo.percentage}% Rating | $${userVAInfo.monthlyAmount}/month` : 'No VA information on file'}
        avatar={<LocalHospital color="primary" />}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          >
            Add Income
          </Button>
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
            VA disability information updated successfully!
          </Alert>
        )}

        {/* User VA Information Update */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Update Your VA Disability Information:
          </Typography>
          <Grid container spacing={2} alignItems="end">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Disability Rating</InputLabel>
                <Select
                  value={userUpdateForm.vaDisabilityPercentage}
                  onChange={(e) => {
                    const percentage = e.target.value;
                    const expectedAmount = getDisabilityRateForPercentage(parseInt(percentage));
                    setUserUpdateForm(prev => ({ 
                      ...prev, 
                      vaDisabilityPercentage: percentage,
                      vaDisabilityMonthlyAmount: expectedAmount > 0 ? expectedAmount.toString() : prev.vaDisabilityMonthlyAmount,
                    }));
                  }}
                  label="Disability Rating"
                >
                  <MenuItem value="">None</MenuItem>
                  {Object.keys(VA_DISABILITY_RATES).map((rating) => (
                    <MenuItem key={rating} value={rating}>
                      {rating}%
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Monthly Amount"
                type="number"
                value={userUpdateForm.vaDisabilityMonthlyAmount}
                onChange={(e) => setUserUpdateForm(prev => ({ ...prev, vaDisabilityMonthlyAmount: e.target.value }))}
                InputProps={{
                  startAdornment: '$',
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              {userUpdateForm.vaDisabilityPercentage && (
                <Typography variant="body2" color="text.secondary">
                  Expected: ${getDisabilityRateForPercentage(parseInt(userUpdateForm.vaDisabilityPercentage))}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleUpdateUserVAInfo}
                disabled={saving}
                sx={{ height: '100%' }}
              >
                Update Profile
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* VA Disability Summary */}
        {vaData && (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              VA Disability Summary:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center" p={2} bgcolor="primary.50" borderRadius={1}>
                  <Typography variant="h4" color="primary">
                    ${vaData.totalMonthlyAmount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Amount
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center" p={2} bgcolor="success.50" borderRadius={1}>
                  <Typography variant="h4" color="success.main">
                    ${vaData.estimatedAnnualAmount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Annual Amount
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center" p={2} bgcolor="info.50" borderRadius={1}>
                  <Typography variant="h4" color="info.main">
                    {vaData.combinedRating}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Combined Rating
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center" p={2} bgcolor="warning.50" borderRadius={1}>
                  <Typography variant="h6" color="warning.main">
                    {vaData.nextPaymentDate 
                      ? new Date(vaData.nextPaymentDate).toLocaleDateString()
                      : 'TBD'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Next Payment
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Income Sources Table */}
        <Typography variant="subtitle1" gutterBottom>
          VA-Related Income Sources:
        </Typography>
        
        {!vaData?.incomeSources || vaData.incomeSources.length === 0 ? (
          <Alert severity="info">
            No VA-related income sources found. Add your VA disability compensation and other benefits!
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Income Source</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Next Payment</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vaData.incomeSources.map((source) => (
                  <TableRow key={source.incomeSourceId}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {source.sourceName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {source.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <AttachMoney />
                        <Typography fontWeight="bold">
                          ${source.amount.toLocaleString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{source.frequency}</TableCell>
                    <TableCell>
                      <Chip
                        label={source.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={source.isActive ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {source.nextPaymentDate 
                        ? new Date(source.nextPaymentDate).toLocaleDateString()
                        : 'TBD'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => startEditing(source)}
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

        {/* Disability Rating Reference */}
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            2024 VA Disability Compensation Rates:
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(VA_DISABILITY_RATES).map(([rating, amount]) => (
              <Grid item xs={6} sm={3} key={rating}>
                <Box 
                  p={1} 
                  border={1} 
                  borderColor="grey.300" 
                  borderRadius={1}
                  bgcolor={userVAInfo?.percentage === parseInt(rating) ? 'primary.50' : 'transparent'}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {rating}%: ${amount}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            * Rates for veteran without spouse or dependents. Additional compensation may apply.
          </Typography>
        </Box>

        {/* Add/Edit Dialog */}
        <Dialog 
          open={showAddDialog || editingSource !== null} 
          onClose={() => {
            setShowAddDialog(false);
            setEditingSource(null);
            resetForm();
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingSource ? 'Edit Income Source' : 'Add New Income Source'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Income Source Name"
                  value={sourceForm.sourceName}
                  onChange={(e) => setSourceForm(prev => ({ ...prev, sourceName: e.target.value }))}
                  placeholder="e.g., VA Disability Compensation, Chapter 31 VR&E"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={sourceForm.amount}
                  onChange={(e) => setSourceForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={sourceForm.frequency}
                    onChange={(e) => setSourceForm(prev => ({ ...prev, frequency: e.target.value }))}
                    label="Frequency"
                  >
                    {FREQUENCY_OPTIONS.map((freq) => (
                      <MenuItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={sourceForm.description}
                  onChange={(e) => setSourceForm(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={2}
                  placeholder="Additional details about this income source"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={sourceForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setSourceForm(prev => ({ 
                      ...prev, 
                      isActive: e.target.value === 'active' 
                    }))}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowAddDialog(false);
                setEditingSource(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={editingSource ? handleUpdateIncomeSource : handleCreateIncomeSource}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Saving...' : (editingSource ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};