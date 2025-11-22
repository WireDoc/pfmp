import React from 'react';
import { Chip } from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  AccountBalance,
  CallSplit,
  Autorenew,
  SwapHoriz,
  Receipt,
  CompareArrows,
  Savings,
  Balance,
} from '@mui/icons-material';
import type { TransactionType } from '../../types/investmentTransactions';
import { getTransactionTypeColor, getTransactionTypeIcon, formatTransactionType } from '../../services/investmentTransactionsApi';

interface TransactionTypeChipProps {
  type: TransactionType;
  size?: 'small' | 'medium';
}

const ICON_MAP: Record<string, React.ReactElement> = {
  TrendingUp: <TrendingUp fontSize="small" />,
  TrendingDown: <TrendingDown fontSize="small" />,
  AttachMoney: <AttachMoney fontSize="small" />,
  AccountBalance: <AccountBalance fontSize="small" />,
  CallSplit: <CallSplit fontSize="small" />,
  Autorenew: <Autorenew fontSize="small" />,
  SwapHoriz: <SwapHoriz fontSize="small" />,
  Receipt: <Receipt fontSize="small" />,
  CompareArrows: <CompareArrows fontSize="small" />,
  Savings: <Savings fontSize="small" />,
  Balance: <Balance fontSize="small" />,
};

export const TransactionTypeChip: React.FC<TransactionTypeChipProps> = ({ type, size = 'small' }) => {
  const color = getTransactionTypeColor(type);
  const iconName = getTransactionTypeIcon(type);
  const label = formatTransactionType(type);
  const icon = ICON_MAP[iconName] || ICON_MAP.Receipt;

  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      size={size}
      sx={{
        fontWeight: 500,
        '& .MuiChip-icon': {
          marginLeft: '8px',
        },
      }}
    />
  );
};
