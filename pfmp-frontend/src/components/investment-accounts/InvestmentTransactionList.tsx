import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Toolbar,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Search, FileDownload, FilterListOff, Add, Edit, Delete } from '@mui/icons-material';
import { format } from 'date-fns';
import { TransactionTypeChip } from './TransactionTypeChip';
import { InvestmentTransactionForm } from './InvestmentTransactionForm';
import {
  fetchInvestmentTransactions,
  deleteTransaction,
  type FetchTransactionsParams,
} from '../../services/investmentTransactionsApi';
import type { InvestmentTransaction, TransactionType } from '../../types/investmentTransactions';

interface InvestmentTransactionListProps {
  accountId: number;
  onAddTransaction?: () => void;
  onEditTransaction?: (transaction: InvestmentTransaction) => void;
}

export const InvestmentTransactionList: React.FC<InvestmentTransactionListProps> = ({
  accountId,
  onEditTransaction,
}) => {
  // Data state
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<InvestmentTransaction | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionType | ''>('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  // Sort state
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'transactionDate', sort: 'desc' },
  ]);

  // Extract unique symbols from transactions
  const uniqueSymbols = React.useMemo(() => {
    const symbols = new Set(transactions.map((t) => t.symbol).filter((s): s is string => !!s));
    return Array.from(symbols).sort();
  }, [transactions]);

  // Fetch transactions
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: FetchTransactionsParams = {
        accountId,
      };

      if (startDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
      }
      if (endDate) {
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }
      if (transactionTypeFilter) {
        params.transactionType = transactionTypeFilter;
      }

      const data = await fetchInvestmentTransactions(params);
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [accountId, startDate, endDate, transactionTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter transactions client-side (for search and symbol)
  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.notes?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.symbol?.toLowerCase().includes(query)
      );
    }

    if (symbolFilter) {
      filtered = filtered.filter((t) => t.symbol === symbolFilter);
    }

    return filtered;
  }, [transactions, searchQuery, symbolFilter]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setTransactionTypeFilter('');
    setSymbolFilter('');
    setStartDate(null);
    setEndDate(null);
  };

  // CSV Export
  const handleExport = () => {
    const headers = [
      'Date',
      'Settlement Date',
      'Type',
      'Symbol',
      'Quantity',
      'Price',
      'Amount',
      'Fee',
      'Notes',
    ];

    const csvData = filteredTransactions.map((t) => [
      format(new Date(t.transactionDate), 'yyyy-MM-dd'),
      format(new Date(t.settlementDate), 'yyyy-MM-dd'),
      t.transactionType,
      t.symbol || '',
      t.quantity?.toString() || '',
      t.price?.toString() || '',
      t.amount.toString(),
      t.fee?.toString() || '',
      t.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-account-${accountId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // DataGrid columns
  const columns: GridColDef<InvestmentTransaction>[] = [
    {
      field: 'transactionDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (value) => new Date(value),
      valueFormatter: (value) => format(value, 'MMM dd, yyyy'),
    },
    {
      field: 'transactionType',
      headerName: 'Type',
      width: 180,
      renderCell: (params) => (
        <TransactionTypeChip type={(params.value?.toUpperCase() || 'OTHER') as TransactionType} />
      ),
    },
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 100,
      valueGetter: (value) => value || '-',
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 120,
      type: 'number',
      valueFormatter: (value) => {
        if (!value) return '-';
        return Number(value).toFixed(4);
      },
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      type: 'number',
      valueFormatter: (value) => {
        if (!value) return '-';
        return `$${Number(value).toFixed(2)}`;
      },
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 140,
      type: 'number',
      valueFormatter: (value) => {
        const num = Number(value);
        const formatted = Math.abs(num).toFixed(2);
        return num >= 0 ? `$${formatted}` : `-$${formatted}`;
      },
      cellClassName: (params) => {
        return params.value >= 0 ? 'amount-positive' : 'amount-negative';
      },
    },
    {
      field: 'fee',
      headerName: 'Fee',
      width: 100,
      type: 'number',
      valueFormatter: (value) => {
        if (!value) return '-';
        return `$${Number(value).toFixed(2)}`;
      },
    },
    {
      field: 'settlementDate',
      headerName: 'Settlement',
      width: 120,
      valueGetter: (value) => new Date(value),
      valueFormatter: (value) => format(value, 'MMM dd, yyyy'),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      width: 250,
      flex: 1,
      valueGetter: (value) => value || '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit Transaction">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditTransaction(params.row);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Transaction">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTransaction(params.row);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Handle add transaction
  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setFormOpen(true);
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction: InvestmentTransaction) => {
    if (onEditTransaction) {
      onEditTransaction(transaction);
    } else {
      setSelectedTransaction(transaction);
      setFormOpen(true);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transaction: InvestmentTransaction) => {
    if (window.confirm(`Delete transaction: ${transaction.transactionType} ${transaction.symbol}?`)) {
      try {
        await deleteTransaction(transaction.transactionId);
        fetchData();
      } catch (err) {
        console.error('Error deleting transaction:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      }
    }
  };

  // Handle form close
  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedTransaction(null);
  };

  // Handle form success (refresh data)
  const handleFormSuccess = () => {
    fetchData();
  };

  // Get unique holdings from transactions for form
  const holdings = React.useMemo(() => {
    const symbolMap = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.symbol && !symbolMap.has(t.symbol)) {
        symbolMap.set(t.symbol, t.holdingId || 0);
      }
    });
    return Array.from(symbolMap.entries()).map(([symbol, holdingId]) => ({
      symbol,
      holdingId,
    }));
  }, [transactions]);

  // Available transaction types for filter
  const transactionTypeOptions: { value: TransactionType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'BUY', label: 'Buy' },
    { value: 'SELL', label: 'Sell' },
    { value: 'DIVIDEND', label: 'Dividend' },
    { value: 'DIVIDEND_REINVEST', label: 'Dividend Reinvest' },
    { value: 'CAPITAL_GAINS', label: 'Capital Gains' },
    { value: 'INTEREST', label: 'Interest' },
    { value: 'SPLIT', label: 'Stock Split' },
    { value: 'SPINOFF', label: 'Spinoff' },
    { value: 'CRYPTO_STAKING', label: 'Staking Reward' },
    { value: 'CRYPTO_SWAP', label: 'Crypto Swap' },
  ];

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 2 }}>
        {/* Toolbar with filters */}
        <Toolbar disableGutters sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, minWidth: 150 }}>
            Transactions
          </Typography>

          {/* Search */}
          <TextField
            placeholder="Search notes, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />,
            }}
          />

          {/* Transaction Type Filter */}
          <TextField
            select
            label="Type"
            value={transactionTypeFilter}
            onChange={(e) => setTransactionTypeFilter(e.target.value as TransactionType | '')}
            size="small"
            sx={{ minWidth: 180 }}
          >
            {transactionTypeOptions.map((option) => (
              <MenuItem key={option.value || 'all'} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Symbol Filter */}
          {uniqueSymbols.length > 0 && (
            <TextField
              select
              label="Symbol"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Symbols</MenuItem>
              {uniqueSymbols.map((symbol) => (
                <MenuItem key={symbol} value={symbol}>
                  {symbol}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Date Range */}
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />

          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(date) => setEndDate(date)}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />

          {/* Clear Filters */}
          <Tooltip title="Clear Filters">
            <IconButton onClick={handleClearFilters} size="small">
              <FilterListOff />
            </IconButton>
          </Tooltip>

          {/* Export */}
          <Tooltip title="Export to CSV">
            <IconButton onClick={handleExport} size="small" disabled={filteredTransactions.length === 0}>
              <FileDownload />
            </IconButton>
          </Tooltip>

          {/* Add Transaction */}
          <Tooltip title="Add Transaction">
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={handleAddTransaction}
              sx={{ ml: 1 }}
            >
              Add
            </Button>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          {/* Transaction count */}
          <Typography variant="body2" color="text.secondary">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </Typography>
        </Toolbar>

        {/* DataGrid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredTransactions}
            columns={columns}
            getRowId={(row) => row.transactionId}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            pageSizeOptions={[25, 50, 100]}
            loading={loading}
            disableRowSelectionOnClick
            sx={{
              '& .amount-positive': {
                color: 'success.main',
                fontWeight: 500,
              },
              '& .amount-negative': {
                color: 'error.main',
                fontWeight: 500,
              },
            }}
          />
        </Box>

        {/* Transaction Form Modal */}
        <InvestmentTransactionForm
          open={formOpen}
          accountId={accountId}
          transaction={selectedTransaction}
          holdings={holdings}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </Paper>
    </LocalizationProvider>
  );
};
