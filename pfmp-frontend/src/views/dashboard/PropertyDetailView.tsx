/**
 * Property Detail View
 * Displays full property details, value history, and linked mortgage info
 * Wave 12.5 - Phase 4 Task 4.5
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Link,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Home as HomeIcon,
  Sync as SyncIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import {
  fetchProperty,
  deleteProperty,
  refreshValuation,
  updateValuationSettings,
  fetchProviderEstimates,
  type PropertyDetailDto,
  type PropertyValueHistoryDto,
  type ProviderEstimateDto,
} from '../../api/properties';
import EditPropertyDialog from '../../components/properties/EditPropertyDialog';
import UpdateValueDialog from '../../components/properties/UpdateValueDialog';
import { MenuItem, TextField, Stack } from '@mui/material';

/** Display metadata for the provider picker. Values match the backend ids. */
const PROVIDER_OPTIONS = [
  { value: '', label: 'Default (RentCast AVM)', hint: 'Uses the global default provider' },
  { value: 'rentcast', label: 'RentCast AVM', hint: 'Comps-based estimate from public records + listings' },
  { value: 'fhfa-hpi', label: 'FHFA index (anchored)', hint: 'Your anchor value appreciated by your state’s FHFA house-price index' },
  { value: 'manual', label: 'Manual', hint: 'You set the value; auto-refresh never overwrites it' },
] as const;

const providerLabel = (id: string | null): string => {
  const match = PROVIDER_OPTIONS.find(o => o.value === (id ?? ''));
  return match ? match.label : (id ?? 'Default');
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '—';
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatPercent = (value: number): string => {
  // Use up to 2 decimal places, but strip unnecessary trailing zeros
  const fixed = value.toFixed(2).replace(/\.?0+$/, '');
  return `${fixed}%`;
};

// ============================================================================
// Sub-Components
// ============================================================================

interface SummaryRowProps {
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}

function SummaryRow({ label, value, highlight }: SummaryRowProps) {
  return (
    <Box display="flex" justifyContent="space-between" mb={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={highlight ? 600 : 400} color={highlight ? 'primary' : 'text.primary'}>
        {value}
      </Typography>
    </Box>
  );
}

interface ValueHistoryTableProps {
  history: PropertyValueHistoryDto[];
}

function ValueHistoryTable({ history }: ValueHistoryTableProps) {
  if (!history || history.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        No value history available
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell align="right">Estimated Value</TableCell>
            <TableCell align="right">Mortgage Balance</TableCell>
            <TableCell align="right">Equity</TableCell>
            <TableCell>Source</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.historyId}>
              <TableCell>{formatDate(entry.recordedAt)}</TableCell>
              <TableCell align="right">{formatCurrency(entry.estimatedValue)}</TableCell>
              <TableCell align="right">{formatCurrency(entry.mortgageBalance)}</TableCell>
              <TableCell align="right">{formatCurrency(entry.equity)}</TableCell>
              <TableCell>{entry.source || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PropertyDetailView() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [updateValueOpen, setUpdateValueOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; severity: 'success' | 'error' | 'warning' } | null>(null);

  // Valuation provider selection (Wave 25 follow-on)
  const [providerChoice, setProviderChoice] = useState<string>('');
  const [anchorValue, setAnchorValue] = useState<string>('');
  const [anchorDate, setAnchorDate] = useState<string>('');
  const [savingProvider, setSavingProvider] = useState(false);
  const [estimates, setEstimates] = useState<ProviderEstimateDto[] | null>(null);
  const [loadingEstimates, setLoadingEstimates] = useState(false);

  const loadProperty = async () => {
    if (!propertyId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchProperty(propertyId);
      setProperty(data);
      setProviderChoice(data.preferredValuationProvider ?? '');
      setAnchorValue(data.valuationAnchorValue != null ? String(data.valuationAnchorValue) : '');
      setAnchorDate(data.valuationAnchorDate ? data.valuationAnchorDate.slice(0, 10) : '');
    } catch (err: unknown) {
      console.error('Error fetching property:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? 'Property not found' : 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const handleDelete = async () => {
    if (!propertyId) return;
    setDeleting(true);
    try {
      await deleteProperty(propertyId);
      navigate('/dashboard');
    } catch {
      setActionMsg({ text: 'Failed to delete property', severity: 'error' });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!propertyId) return;
    if (providerChoice === 'fhfa-hpi' && (!anchorValue || Number(anchorValue) <= 0 || !anchorDate)) {
      setActionMsg({ text: 'The FHFA index provider needs an anchor value and its as-of date.', severity: 'warning' });
      return;
    }
    setSavingProvider(true);
    setActionMsg(null);
    try {
      const result = await updateValuationSettings(propertyId, {
        preferredValuationProvider: providerChoice || null,
        valuationAnchorValue: anchorValue ? Number(anchorValue) : undefined,
        valuationAnchorDate: anchorDate || undefined,
      });
      setActionMsg({ text: result.message ?? 'Valuation settings updated', severity: 'success' });
      setEstimates(null); // stale after a provider change
      await loadProperty();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionMsg({ text: msg ?? 'Failed to update valuation settings', severity: 'error' });
    } finally {
      setSavingProvider(false);
    }
  };

  const handleCompareEstimates = async () => {
    if (!propertyId) return;
    setLoadingEstimates(true);
    try {
      setEstimates(await fetchProviderEstimates(propertyId));
    } catch {
      setActionMsg({ text: 'Failed to fetch provider estimates', severity: 'error' });
    } finally {
      setLoadingEstimates(false);
    }
  };

  const handleRefreshValuation = async () => {
    if (!propertyId) return;
    setRefreshing(true);
    setActionMsg(null);
    try {
      const result = await refreshValuation(propertyId);
      if (result.success) {
        setActionMsg({ text: `Valuation updated: ${result.source || 'AVM'} — $${result.estimatedValue?.toLocaleString() ?? '—'}`, severity: 'success' });
        await loadProperty();
      } else {
        setActionMsg({ text: result.message || 'Valuation not available for this property', severity: 'warning' });
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setActionMsg({ text: 'Valuation was refreshed recently. Please wait 24 hours between refreshes.', severity: 'warning' });
      } else {
        setActionMsg({ text: 'Failed to refresh valuation', severity: 'error' });
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Property not found'}</Alert>
        <Link component="button" variant="body2" onClick={() => navigate('/dashboard')}>
          &larr; Back to Dashboard
        </Link>
      </Box>
    );
  }

  const equityPct = property.estimatedValue > 0
    ? (property.equity / property.estimatedValue) * 100
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Action Messages */}
      {actionMsg && (
        <Alert severity={actionMsg.severity} sx={{ mb: 2 }} onClose={() => setActionMsg(null)}>
          {actionMsg.text}
        </Alert>
      )}

      {/* Property Header */}
      <Box display="flex" alignItems="flex-start" gap={2} mb={3}>
        <HomeIcon sx={{ fontSize: 40, color: 'action.active' }} />
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            {property.propertyName}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {property.address || 'No address provided'}
            </Typography>
            <Chip label={property.propertyType} size="small" variant="outlined" />
            <Chip label={property.occupancy} size="small" variant="outlined" />
            {property.isPlaidLinked && (
              <Chip
                icon={<SyncIcon />}
                label="Plaid Linked"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        {/* Action Buttons */}
        <Box display="flex" gap={1} alignItems="flex-start" flexShrink={0}>
          <Tooltip title="Update Value">
            <IconButton size="small" onClick={() => setUpdateValueOpen(true)}>
              <AttachMoneyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Valuation">
            <span>
              <IconButton size="small" onClick={handleRefreshValuation} disabled={refreshing}>
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit Property">
            <IconButton size="small" onClick={() => setEditOpen(true)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Property">
            <IconButton size="small" color="error" onClick={() => setDeleteConfirmOpen(true)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Property Summary */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Property Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <SummaryRow label="Estimated Value" value={formatCurrency(property.estimatedValue)} />
            <SummaryRow label="Mortgage Balance" value={formatCurrency(property.mortgageBalance)} />
            <SummaryRow label="Equity" value={formatCurrency(property.equity)} highlight />
            <SummaryRow label="Equity %" value={formatPercent(equityPct)} highlight />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Monthly Cash Flow
            </Typography>
            <SummaryRow label="Mortgage Payment" value={formatCurrency(property.monthlyMortgagePayment)} />
            {property.monthlyPropertyTax != null && (
              <SummaryRow
                label="Property Tax"
                value={`${formatCurrency(property.monthlyPropertyTax)}/${property.propertyTaxFrequency === 'annual' ? 'yr' : 'mo'}`}
              />
            )}
            {property.monthlyInsurance != null && (
              <SummaryRow
                label="Insurance"
                value={`${formatCurrency(property.monthlyInsurance)}/${property.insuranceFrequency === 'annual' ? 'yr' : 'mo'}`}
              />
            )}
            <SummaryRow label="Rental Income" value={formatCurrency(property.monthlyRentalIncome)} />
            <SummaryRow label="Other Expenses" value={formatCurrency(property.monthlyExpenses)} />
            <SummaryRow
              label="Net Cash Flow"
              value={formatCurrency(property.monthlyCashFlow)}
              highlight
            />

            {/* Mortgage Details (manual entry fields) */}
            {(property.interestRate != null || property.mortgageTerm != null || property.lienholder || property.estimatedPayoffDate) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom color="text.secondary">
                  Mortgage Details
                </Typography>
                {property.lienholder && (
                  <SummaryRow label="Lienholder" value={property.lienholder} />
                )}
                {property.interestRate != null && (
                  <SummaryRow label="Interest Rate" value={formatPercent(property.interestRate)} />
                )}
                {property.mortgageTerm != null && (
                  <SummaryRow label="Mortgage Term" value={`${property.mortgageTerm} years`} />
                )}
                {property.estimatedPayoffDate && (
                  <SummaryRow label="Est. Payoff" value={new Date(property.estimatedPayoffDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} />
                )}
              </>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Mortgage Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Linked Mortgage
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {property.linkedMortgage ? (
              <>
                <SummaryRow label="Lender" value={property.linkedMortgage.lender || '—'} />
                <SummaryRow label="Current Balance" value={formatCurrency(property.linkedMortgage.currentBalance)} />
                <SummaryRow
                  label="Interest Rate"
                  value={property.linkedMortgage.interestRate != null
                    ? formatPercent(property.linkedMortgage.interestRate)
                    : '—'
                  }
                />
                <SummaryRow label="Minimum Payment" value={formatCurrency(property.linkedMortgage.minimumPayment)} />
                <SummaryRow
                  label="Next Payment Due"
                  value={formatDate(property.linkedMortgage.nextPaymentDueDate)}
                />
              </>
            ) : (
              <Typography color="text.secondary">
                No mortgage linked to this property
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Additional Details
            </Typography>
            <SummaryRow label="Has HELOC" value={property.hasHeloc ? 'Yes' : 'No'} />
            <SummaryRow label="Data Source" value={property.source} />
            <SummaryRow label="Last Updated" value={formatDate(property.updatedAt)} />
            {property.lastSyncedAt && (
              <SummaryRow label="Last Synced" value={formatDate(property.lastSyncedAt)} />
            )}
          </Paper>
        </Grid>

        {/* Full Width - Address Details */}
        {(property.street || property.city || property.state || property.postalCode) && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Address Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2">
                {[property.street, property.city, [property.state, property.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Full Width - Purpose / Notes */}
        {property.purpose && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {property.purpose}
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Full Width - Valuation (source, provider picker, compare) */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Valuation
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {property.valuationSource ? (
              <>
                <SummaryRow label="Source" value={providerLabel(property.valuationSource)} />
                {property.valuationConfidence != null && (
                  <SummaryRow label="Confidence" value={`${(property.valuationConfidence * 100).toFixed(1)}%`} />
                )}
                {property.valuationLow != null && property.valuationHigh != null && (
                  <SummaryRow
                    label="Value Range"
                    value={`${formatCurrency(property.valuationLow)} – ${formatCurrency(property.valuationHigh)}`}
                  />
                )}
                <SummaryRow label="Last Valuation" value={formatDate(property.lastValuationAt)} />
              </>
            ) : (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {property.addressValidated
                  ? 'No automated valuation yet. Click the refresh button above to request one.'
                  : 'Add a complete address to enable automated valuation.'}
              </Typography>
            )}

            {/* Provider picker — which source drives EstimatedValue (and net worth) */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Value source
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              The selected source writes this property's stored value — that number is what flows into your
              net worth. Others are shown for comparison only.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              <TextField
                select
                size="small"
                label="Provider"
                value={providerChoice}
                onChange={(e) => setProviderChoice(e.target.value)}
                sx={{ minWidth: 260 }}
                helperText={PROVIDER_OPTIONS.find(o => o.value === providerChoice)?.hint}
              >
                {PROVIDER_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
              {providerChoice === 'fhfa-hpi' && (
                <>
                  <TextField
                    size="small"
                    label="Anchor value ($)"
                    type="number"
                    value={anchorValue}
                    onChange={(e) => setAnchorValue(e.target.value)}
                    helperText="A valuation you trust (lender, appraisal)"
                    sx={{ maxWidth: 200 }}
                  />
                  <TextField
                    size="small"
                    label="Anchor as-of date"
                    type="date"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ maxWidth: 200 }}
                  />
                </>
              )}
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveProvider}
                disabled={savingProvider}
                sx={{ mt: 0.25 }}
              >
                {savingProvider ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCompareEstimates}
                disabled={loadingEstimates}
                sx={{ mt: 0.25 }}
              >
                {loadingEstimates ? 'Comparing…' : 'Compare estimates'}
              </Button>
            </Stack>

            {estimates && (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Provider</TableCell>
                      <TableCell align="right">Estimate</TableCell>
                      <TableCell align="right">Range</TableCell>
                      <TableCell align="right">Confidence</TableCell>
                      <TableCell>Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estimates.map(e => (
                      <TableRow key={e.provider} selected={e.isActive}>
                        <TableCell>
                          {providerLabel(e.provider)}
                          {e.isActive && <Chip size="small" label="active" color="primary" sx={{ ml: 1, height: 18 }} />}
                        </TableCell>
                        <TableCell align="right">{e.estimatedValue != null ? formatCurrency(e.estimatedValue) : '—'}</TableCell>
                        <TableCell align="right">
                          {e.lowEstimate != null && e.highEstimate != null
                            ? `${formatCurrency(e.lowEstimate)} – ${formatCurrency(e.highEstimate)}`
                            : '—'}
                        </TableCell>
                        <TableCell align="right">{e.confidence != null ? `${(e.confidence * 100).toFixed(0)}%` : '—'}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{e.note ?? ''}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Full Width - Value History */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Value History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ValueHistoryTable history={property.valueHistory || []} />
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <EditPropertyDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        property={property}
        onUpdated={loadProperty}
      />

      <UpdateValueDialog
        open={updateValueOpen}
        onClose={() => setUpdateValueOpen(false)}
        propertyId={property.propertyId}
        currentValue={property.estimatedValue}
        onUpdated={loadProperty}
      />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{property.propertyName}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PropertyDetailView;
