import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Button,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Search, FileDownload, FilterList } from '@mui/icons-material';
import { format } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

export interface Transaction {
  transactionId: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  balanceAfter: number;
  checkNumber?: string;
  memo?: string;
}

interface TransactionListProps {
  accountId?: number;
  cashAccountId?: string;
  accountName?: string;
  onExport?: (transactions: Transaction[]) => void;
}

const TRANSACTION_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Deposit', label: 'Deposit' },
  { value: 'Withdrawal', label: 'Withdrawal' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'Fee', label: 'Fee' },
  { value: 'InterestEarned', label: 'Interest Earned' }
];

export const TransactionList: React.FC<TransactionListProps> = ({ 
  accountId,
  cashAccountId,
  accountName,
  onExport 
}) => {
  // State for transactions and loading
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25
  });

  // Sort state
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'date', sort: 'desc' }
  ]);

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('limit', '1000'); // Fetch all for client-side filtering
      params.append('offset', '0');

      if (startDate) {
        params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      }
      if (transactionTypeFilter) {
        params.append('transactionType', transactionTypeFilter);
      }

      const endpoint = cashAccountId 
        ? `/cash-accounts/${cashAccountId}/transactions`
        : `/accounts/${accountId}/transactions`;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [accountId, cashAccountId, startDate, endDate, transactionTypeFilter]);

  // Load transactions on mount and when filters change
  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Client-side search filtering
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;

    const query = searchQuery.toLowerCase();
    return transactions.filter(tx =>
      tx.description.toLowerCase().includes(query) ||
      tx.category.toLowerCase().includes(query) ||
      tx.memo?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueGetter: (value, row) => row.transactionDate || row.date,
      valueFormatter: (value) => {
        if (!value) return '—';
        const date = new Date(value);
        return isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy');
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.memo && (
            <Typography variant="caption" color="text.secondary">
              {params.row.memo}
            </Typography>
          )}
        </Box>
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 130
    },
    {
      field: 'checkNumber',
      headerName: 'Check #',
      width: 100,
      valueFormatter: (value) => value || '—'
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      type: 'number',
      renderCell: (params) => {
        const isPositive = params.value >= 0;
        return (
          <Typography
            variant="body2"
            sx={{
              color: isPositive ? 'success.main' : 'error.main',
              fontWeight: 600
            }}
          >
            {isPositive ? '+' : ''}
            ${Math.abs(params.value).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Typography>
        );
      }
    },
    {
      field: 'balanceAfter',
      headerName: 'Balance',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => {
        if (value === undefined || value === null) return '—';
        return `$${value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    }
  ];

  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport(filteredTransactions);
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setTransactionTypeFilter('');
    setStartDate(null);
    setEndDate(null);
  };

  const hasActiveFilters = searchQuery || transactionTypeFilter || startDate || endDate;

  return (
    <Box>
      {/* Toolbar */}
      <Toolbar
        disableGutters
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Transactions</Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Toggle filters">
            <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
              <FilterList />
            </IconButton>
          </Tooltip>
          
          {onExport && (
            <Tooltip title="Export to CSV">
              <IconButton onClick={handleExport} disabled={filteredTransactions.length === 0}>
                <FileDownload />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Toolbar>

      {/* Filter Panel */}
      {showFilters && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Filters
          </Typography>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              {/* Search */}
              <TextField
                size="small"
                placeholder="Search description or memo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />

              {/* Transaction Type Filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  label="Transaction Type"
                >
                  {TRANSACTION_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Date Range */}
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { size: 'small' } }}
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { size: 'small' } }}
                minDate={startDate || undefined}
              />

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={handleClearFilters}
                  sx={{ alignSelf: 'center' }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          </LocalizationProvider>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredTransactions}
          columns={columns}
          getRowId={(row) => row.cashTransactionId || row.transactionId}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              py: 1.5
            }
          }}
        />
      </Box>
    </Box>
  );
};
