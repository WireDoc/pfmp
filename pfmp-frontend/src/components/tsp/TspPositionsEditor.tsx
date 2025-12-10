import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

/**
 * Position data structure for the editor
 */
export interface TspPositionInput {
  fundCode: string;
  contributionPercent?: number;
  units?: number;
}

/**
 * Props for the TspPositionsEditor component
 */
interface TspPositionsEditorProps {
  /** Initial positions to display */
  positions: TspPositionInput[];
  /** Callback when positions are saved */
  onSave: (positions: TspPositionInput[], contributionRate: number) => Promise<void>;
  /** Initial contribution rate */
  contributionRate?: number;
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Read-only mode - hides save button and disables editing */
  readOnly?: boolean;
  /** Show contribution percent column (for allocation editing) */
  showContributionPercent?: boolean;
  /** Show units column */
  showUnits?: boolean;
  /** Title override */
  title?: string;
}

// TSP Fund names for display
const TSP_FUND_NAMES: Record<string, string> = {
  G: 'G Fund (Government Securities)',
  F: 'F Fund (Fixed Income)',
  C: 'C Fund (Common Stock)',
  S: 'S Fund (Small Cap)',
  I: 'I Fund (International)',
  'L-INCOME': 'L Income',
  L2030: 'L 2030',
  L2035: 'L 2035',
  L2040: 'L 2040',
  L2045: 'L 2045',
  L2050: 'L 2050',
  L2055: 'L 2055',
  L2060: 'L 2060',
  L2065: 'L 2065',
  L2070: 'L 2070',
  L2075: 'L 2075',
};

// All available fund codes
const ALL_FUND_CODES = [
  'G', 'F', 'C', 'S', 'I',
  'L-INCOME', 'L2030', 'L2035', 'L2040', 'L2045', 'L2050', 'L2055', 'L2060', 'L2065', 'L2070', 'L2075',
];

function parseNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * TspPositionsEditor - Reusable component for editing TSP fund positions
 * Can be used in onboarding, TSP detail page, or other contexts
 */
export const TspPositionsEditor: React.FC<TspPositionsEditorProps> = ({
  positions: initialPositions,
  onSave,
  contributionRate: initialContributionRate = 0,
  loading = false,
  readOnly = false,
  showContributionPercent = true,
  showUnits = true,
  title = 'TSP Fund Positions',
}) => {
  const [positions, setPositions] = useState<TspPositionInput[]>(initialPositions);
  const [contributionRate, setContributionRate] = useState(initialContributionRate);
  const [fundToAdd, setFundToAdd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selected fund codes (those with data)
  const selectedFundCodes = useMemo(() => {
    return positions.map(p => p.fundCode);
  }, [positions]);

  // Available funds to add
  const availableFunds = useMemo(() => {
    return ALL_FUND_CODES.filter(code => !selectedFundCodes.includes(code));
  }, [selectedFundCodes]);

  // Total contribution percent validation
  const totalContributionPercent = useMemo(() => {
    return positions.reduce((sum, p) => sum + (p.contributionPercent ?? 0), 0);
  }, [positions]);

  const isContributionValid = Math.abs(totalContributionPercent - 100) < 0.01 || totalContributionPercent === 0;

  // Update a position field
  const updatePosition = useCallback((fundCode: string, field: 'contributionPercent' | 'units', value: number | undefined) => {
    setPositions(prev => prev.map(p => 
      p.fundCode === fundCode ? { ...p, [field]: value } : p
    ));
    setSuccess(false);
  }, []);

  // Add a fund
  const handleAddFund = useCallback(() => {
    if (!fundToAdd || selectedFundCodes.includes(fundToAdd)) return;
    setPositions(prev => [...prev, { fundCode: fundToAdd, contributionPercent: undefined, units: undefined }]);
    setFundToAdd('');
    setSuccess(false);
  }, [fundToAdd, selectedFundCodes]);

  // Remove a fund
  const handleRemoveFund = useCallback((fundCode: string) => {
    setPositions(prev => prev.filter(p => p.fundCode !== fundCode));
    setSuccess(false);
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await onSave(positions, contributionRate);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to save TSP positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save positions');
    } finally {
      setSaving(false);
    }
  }, [positions, contributionRate, onSave]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{title}</Typography>
        {showContributionPercent && !readOnly && (
          <Chip
            label={`Total: ${totalContributionPercent.toFixed(1)}%`}
            color={isContributionValid ? 'success' : 'error'}
            variant="outlined"
          />
        )}
      </Box>
      <Divider />

      <Box p={2}>
        {/* Contribution Rate */}
        {!readOnly && (
          <Box mb={3}>
            <TextField
              type="number"
              label="Your Contribution Rate (%)"
              value={contributionRate || ''}
              onChange={(e) => {
                setContributionRate(parseNumber(e.target.value) ?? 0);
                setSuccess(false);
              }}
              inputProps={{ min: 0, max: 100, step: 0.5 }}
              size="small"
              sx={{ width: 200 }}
              disabled={readOnly}
              helperText="Percentage of salary you contribute to TSP"
            />
          </Box>
        )}

        {/* Add Fund */}
        {!readOnly && availableFunds.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                select
                label="Add Fund"
                value={fundToAdd}
                onChange={(e) => setFundToAdd(e.target.value)}
                fullWidth
                size="small"
              >
                {availableFunds.map(code => (
                  <MenuItem key={code} value={code}>
                    {TSP_FUND_NAMES[code] ?? code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddFund}
                disabled={!fundToAdd}
                fullWidth
              >
                Add
              </Button>
            </Grid>
          </Grid>
        )}

        {/* Positions Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fund</TableCell>
                {showContributionPercent && <TableCell align="right">Contribution %</TableCell>}
                {showUnits && <TableCell align="right">Units</TableCell>}
                {!readOnly && <TableCell align="center" width={50}>Remove</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" variant="body2">
                      No funds selected. Use the dropdown above to add funds.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                positions.map(pos => (
                  <TableRow key={pos.fundCode}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {TSP_FUND_NAMES[pos.fundCode] ?? pos.fundCode}
                      </Typography>
                    </TableCell>
                    {showContributionPercent && (
                      <TableCell align="right">
                        {readOnly ? (
                          <Typography>{pos.contributionPercent?.toFixed(1) ?? '—'}%</Typography>
                        ) : (
                          <TextField
                            type="number"
                            value={pos.contributionPercent ?? ''}
                            onChange={(e) => updatePosition(pos.fundCode, 'contributionPercent', parseNumber(e.target.value))}
                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                            size="small"
                            sx={{ width: 100 }}
                          />
                        )}
                      </TableCell>
                    )}
                    {showUnits && (
                      <TableCell align="right">
                        {readOnly ? (
                          <Typography>{pos.units?.toFixed(4) ?? '—'}</Typography>
                        ) : (
                          <TextField
                            type="number"
                            value={pos.units ?? ''}
                            onChange={(e) => updatePosition(pos.fundCode, 'units', parseNumber(e.target.value))}
                            inputProps={{ min: 0, step: 0.0001 }}
                            size="small"
                            sx={{ width: 120 }}
                          />
                        )}
                      </TableCell>
                    )}
                    {!readOnly && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveFund(pos.fundCode)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Validation Warning */}
        {showContributionPercent && !isContributionValid && totalContributionPercent > 0 && !readOnly && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Contribution percentages should total 100%. Currently: {totalContributionPercent.toFixed(1)}%
          </Alert>
        )}

        {/* Error / Success */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Positions saved successfully!
          </Alert>
        )}

        {/* Save Button */}
        {!readOnly && (
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Positions'}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TspPositionsEditor;
