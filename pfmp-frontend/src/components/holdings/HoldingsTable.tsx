import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Box, Chip, Typography } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Holding } from '../../types/holdings';

interface HoldingsTableProps {
  holdings: Holding[];
  selectedHoldingId?: number;
  onSelect?: (holding: Holding) => void;
  onEdit: (holding: Holding) => void;
  onDelete: (holdingId: number) => void;
}

export function HoldingsTable({ holdings, selectedHoldingId, onSelect, onEdit, onDelete }: HoldingsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  const columns: GridColDef<Holding>[] = [
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'assetType',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value),
    },
    {
      field: 'averageCostBasis',
      headerName: 'Avg Cost',
      width: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'currentPrice',
      headerName: 'Price',
      width: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'currentValue',
      headerName: 'Value',
      width: 130,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'unrealizedGainLoss',
      headerName: 'Gain/Loss',
      width: 130,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
      renderCell: (params) => {
        const value = params.value as number;
        const color = value >= 0 ? 'success.main' : 'error.main';
        return (
          <Typography variant="body2" color={color} fontWeight="bold">
            {formatCurrency(value)}
          </Typography>
        );
      },
    },
    {
      field: 'unrealizedGainLossPercentage',
      headerName: 'Gain/Loss %',
      width: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatPercentage(value),
      renderCell: (params) => {
        const value = params.value as number | null;
        if (value === null) return <Typography variant="body2">N/A</Typography>;
        const color = value >= 0 ? 'success.main' : 'error.main';
        return (
          <Typography variant="body2" color={color} fontWeight="bold">
            {formatPercentage(value)}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => onEdit(params.row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => onDelete(params.row.holdingId)}
          showInMenu={false}
        />,
      ],
    },
  ];

  if (holdings.length === 0) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          p: 8,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No holdings yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click "Add Holding" to get started tracking your investments
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={holdings}
        columns={columns}
        getRowId={(row) => row.holdingId}
        onRowClick={(params: GridRowParams<Holding>) => {
          if (onSelect) {
            onSelect(params.row);
          }
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
          },
          sorting: {
            sortModel: [{ field: 'currentValue', sort: 'desc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        autoHeight
        sx={{
          '& .MuiDataGrid-row': {
            cursor: onSelect ? 'pointer' : 'default',
            '&.selected-row': {
              backgroundColor: 'action.selected',
            },
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: onSelect ? 'action.hover' : undefined,
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
        }}
        getRowClassName={(params) => 
          params.row.holdingId === selectedHoldingId ? 'selected-row' : ''
        }
      />
    </Box>
  );
}
