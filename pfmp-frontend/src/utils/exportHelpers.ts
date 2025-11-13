/**
 * Export utilities for cash account transactions
 */

import { format } from 'date-fns';

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

/**
 * Convert transactions to CSV format and trigger download
 */
export const exportTransactionsToCSV = (
  transactions: Transaction[],
  accountName: string,
  startDate?: Date | null,
  endDate?: Date | null
): void => {
  if (transactions.length === 0) {
    console.warn('No transactions to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Date',
    'Description',
    'Category',
    'Check Number',
    'Amount',
    'Balance',
    'Memo'
  ];

  // Convert transactions to CSV rows
  const rows = transactions.map(tx => [
    format(new Date(tx.date), 'yyyy-MM-dd'),
    `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes in description
    tx.category,
    tx.checkNumber || '',
    tx.amount.toFixed(2),
    tx.balanceAfter.toFixed(2),
    tx.memo ? `"${tx.memo.replace(/"/g, '""')}"` : '' // Escape quotes in memo
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create filename
  const dateRange = startDate && endDate
    ? `_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
    : `_${format(new Date(), 'yyyy-MM-dd')}`;
  
  const filename = `${accountName.replace(/[^a-zA-Z0-9]/g, '_')}_Transactions${dateRange}.csv`;

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Modern browsers
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Format currency for display
 */
export const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string, formatString: string = 'MMM d, yyyy'): string => {
  try {
    return format(new Date(dateString), formatString);
  } catch {
    return 'Invalid date';
  }
};
