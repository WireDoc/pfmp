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
  Breadcrumbs,
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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Home as HomeIcon, Sync as SyncIcon } from '@mui/icons-material';
import { fetchProperty, type PropertyDetailDto, type PropertyValueHistoryDto } from '../../api/properties';

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
  return `${value.toFixed(1)}%`;
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

  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await fetchProperty(propertyId);
        setProperty(data);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [propertyId]);

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
        <Alert severity="error">{error || 'Property not found'}</Alert>
      </Box>
    );
  }

  const equityPct = property.estimatedValue > 0
    ? (property.equity / property.estimatedValue) * 100
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">{property.propertyName}</Typography>
      </Breadcrumbs>

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
            <SummaryRow label="Rental Income" value={formatCurrency(property.monthlyRentalIncome)} />
            <SummaryRow label="Other Expenses" value={formatCurrency(property.monthlyExpenses)} />
            <SummaryRow
              label="Net Cash Flow"
              value={formatCurrency(property.monthlyCashFlow)}
              highlight
            />
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
              <Grid container spacing={2}>
                {property.street && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <SummaryRow label="Street" value={property.street} />
                  </Grid>
                )}
                {property.city && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <SummaryRow label="City" value={property.city} />
                  </Grid>
                )}
                {property.state && (
                  <Grid size={{ xs: 6, sm: 1.5 }}>
                    <SummaryRow label="State" value={property.state} />
                  </Grid>
                )}
                {property.postalCode && (
                  <Grid size={{ xs: 6, sm: 1.5 }}>
                    <SummaryRow label="ZIP" value={property.postalCode} />
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

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
    </Box>
  );
}

export default PropertyDetailView;
