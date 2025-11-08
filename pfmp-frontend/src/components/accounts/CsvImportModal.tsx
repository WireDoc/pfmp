/**
 * CSV Import Modal for Cash Accounts
 * 
 * Allows users to bulk import cash accounts from a CSV file
 * Features: file upload, preview table, validation, error reporting
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface Props {
  open: boolean;
  userId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface CsvImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  importedAccountIds: string[];
}

interface CsvPreviewRow {
  institution: string;
  nickname: string;
  accountType: string;
  balance: string;
  interestRateApr: string;
  purpose: string;
  isEmergencyFund: string;
}

export function CsvImportModal({ open, userId, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    parsePreview(selectedFile);
  };

  const parsePreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setError('CSV file is empty or has no data rows');
        setPreview([]);
        return;
      }

      // Parse first 5 data rows for preview (skip header)
      const previewRows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return {
          institution: values[0] || '',
          nickname: values[1] || '',
          accountType: values[2] || '',
          balance: values[3] || '',
          interestRateApr: values[4] || '',
          purpose: values[5] || '',
          isEmergencyFund: values[6] || '',
        };
      });

      setPreview(previewRows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';
      const response = await fetch(`${API_BASE_URL}/cashaccounts/import?userId=${userId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${errorText}`);
      }

      const result: CsvImportResult = await response.json();
      setResult(result);

      if (result.errorCount === 0) {
        // All rows imported successfully
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (err) {
      console.error('CSV import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import CSV file');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setPreview([]);
      setResult(null);
      setError(null);
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    const template = `Institution,Nickname,AccountType,Balance,InterestRateApr,Purpose,IsEmergencyFund
Chase,Primary Checking,checking,5000.00,0.01,Monthly transactions,false
Ally Bank,High Yield Savings,savings,15000.00,4.35,Emergency fund,true
Navy Federal,Vacation Fund,savings,3000.00,2.5,Vacation savings,false`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash-accounts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Cash Accounts from CSV</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Instructions */}
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              Upload a CSV file with your cash accounts. Required columns: <strong>Institution</strong>, <strong>AccountType</strong>, <strong>Balance</strong>
            </Typography>
            <Link
              component="button"
              variant="body2"
              onClick={handleDownloadTemplate}
              sx={{ mt: 1 }}
            >
              Download Template CSV
            </Link>
          </Alert>

          {/* File Upload */}
          {!result && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={importing}
                fullWidth
              >
                {file ? file.name : 'Choose CSV File'}
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>

              {file && (
                <Typography variant="caption" color="text.secondary">
                  File size: {(file.size / 1024).toFixed(2)} KB
                </Typography>
              )}
            </Box>
          )}

          {/* Preview Table */}
          {preview.length > 0 && !result && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Preview (first {preview.length} rows):
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Institution</TableCell>
                      <TableCell>Nickname</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.institution}</TableCell>
                        <TableCell>{row.nickname || '—'}</TableCell>
                        <TableCell>{row.accountType}</TableCell>
                        <TableCell align="right">${row.balance}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Import Progress */}
          {importing && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Importing accounts...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" icon={<ErrorIcon />}>
              {error}
            </Alert>
          )}

          {/* Import Result */}
          {result && (
            <Box>
              {result.errorCount === 0 ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <Typography variant="body2" gutterBottom>
                    Successfully imported <strong>{result.successCount}</strong> account{result.successCount !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="caption">
                    Refreshing dashboard...
                  </Typography>
                </Alert>
              ) : (
                <>
                  <Alert severity="warning">
                    <Typography variant="body2" gutterBottom>
                      Imported <strong>{result.successCount}</strong> of <strong>{result.totalRows}</strong> accounts
                    </Typography>
                    <Typography variant="caption">
                      {result.errorCount} row{result.errorCount !== 1 ? 's' : ''} had errors
                    </Typography>
                  </Alert>

                  {result.errors.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Errors:
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Row</TableCell>
                              <TableCell>Field</TableCell>
                              <TableCell>Message</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result.errors.map((err, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{err.row}</TableCell>
                                <TableCell>{err.field}</TableCell>
                                <TableCell>{err.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!file || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
