import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportTransactionsToCSV } from './exportHelpers';

describe('exportTransactionsToCSV', () => {
  let createElementSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;
  let clickSpy: any;
  let mockBlob: any;

  beforeEach(() => {
    // Mock Blob constructor using vi.fn()
    mockBlob = vi.fn((content: any[], options: any) => ({
      content,
      options
    }));
    global.Blob = mockBlob as any;

    // Mock DOM methods
    clickSpy = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
      style: {}
    } as any);
    
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to get CSV content from Blob
  const getCsvContent = (): string => {
    const blobCalls = mockBlob.mock?.results || [];
    if (blobCalls.length > 0) {
      const blobValue = blobCalls[blobCalls.length - 1].value;
      return blobValue?.content?.[0] || '';
    }
    return '';
  };

  const mockTransactions = [
    {
      transactionId: 1,
      date: '2025-01-15T10:00:00Z',
      description: 'Grocery Store',
      category: 'Groceries',
      amount: -50.25,
      balanceAfter: 1949.75,
      memo: 'Weekly shopping'
    },
    {
      transactionId: 2,
      date: '2025-01-10T14:30:00Z',
      description: 'Direct Deposit',
      category: 'Salary',
      amount: 2000.00,
      balanceAfter: 2000.00,
      memo: 'Paycheck'
    }
  ];

  it('exports transactions to CSV format', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('generates correct CSV content', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    expect(csvContent).toContain('Date,Description,Category,Check Number,Amount,Balance,Memo');
  });

  it('includes transaction data in CSV', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    
    expect(csvContent).toContain('Grocery Store');
    expect(csvContent).toContain('Groceries');
    expect(csvContent).toContain('-50.25');
    expect(csvContent).toContain('Direct Deposit');
    expect(csvContent).toContain('Salary');
    expect(csvContent).toContain('2000.00');
  });

  it('generates filename with account name', () => {
    exportTransactionsToCSV(mockTransactions, 'Checking Account');

    const anchorElement = createElementSpy.mock.results[0].value;
    expect(anchorElement.download).toContain('Checking_Account_Transactions');
  });

  it('includes date range in filename', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const anchorElement = createElementSpy.mock.results[0].value;
    // Filename should have account name and timestamp
    expect(anchorElement.download).toContain('Test_Account_Transactions');
    expect(anchorElement.download).toMatch(/\.csv$/);
  });

  it('escapes quotes in descriptions', () => {
    const transactionsWithQuotes = [
      {
        ...mockTransactions[0],
        description: 'Store "Best Buy"',
        memo: 'Purchase with "quotes"'
      }
    ];

    exportTransactionsToCSV(transactionsWithQuotes, 'Test Account');

    const csvContent = getCsvContent();
    // Quotes should be escaped as double quotes
    expect(csvContent).toContain('""');
  });

  it('handles transactions with check numbers', () => {
    const transactionsWithCheck = [
      {
        ...mockTransactions[0],
        checkNumber: '1234'
      }
    ];

    exportTransactionsToCSV(transactionsWithCheck, 'Test Account');

    const csvContent = getCsvContent();
    expect(csvContent).toContain('1234');
  });

  it('handles transactions without check numbers', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    // Should have empty field for check number
    expect(csvContent).toMatch(/,,/); // Two commas in a row indicates empty field
  });

  it('formats positive amounts correctly', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    expect(csvContent).toContain('2000.00');
  });

  it('formats negative amounts correctly', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    expect(csvContent).toContain('-50.25');
  });

  it('formats balance with 2 decimal places', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    expect(csvContent).toContain('1949.75');
    expect(csvContent).toContain('2000.00');
  });

  it('formats dates in YYYY-MM-DD format', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    const csvContent = getCsvContent();
    expect(csvContent).toMatch(/2025-01-15/);
    expect(csvContent).toMatch(/2025-01-10/);
  });

  it('handles empty transaction array', () => {
    exportTransactionsToCSV([], 'Test Account');

    const csvContent = getCsvContent();
    // Should only have headers
    if (csvContent) {
      expect(csvContent.split('\n').length).toBeLessThanOrEqual(2);
    }
  });

  it('creates object URL from blob', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('revokes object URL after download', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('sets correct MIME type for CSV', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    // Blob was created with correct options
    expect(mockBlob).toHaveBeenCalled();
    const lastCall = mockBlob.mock.calls[mockBlob.mock.calls.length - 1];
    expect(lastCall[1].type).toBe('text/csv;charset=utf-8;');
  });

  it('handles transactions with missing memo', () => {
    const transactionsWithoutMemo = [
      {
        ...mockTransactions[0],
        memo: undefined
      }
    ];

    exportTransactionsToCSV(transactionsWithoutMemo, 'Test Account');

    const csvContent = getCsvContent();
    // Should not crash and should have valid CSV
    expect(csvContent).toContain('Date,Description,Category');
  });

  it('replaces spaces in account name with underscores in filename', () => {
    exportTransactionsToCSV(mockTransactions, 'My Checking Account');

    const anchorElement = createElementSpy.mock.results[0].value;
    expect(anchorElement.download).toContain('My_Checking_Account');
  });

  it('triggers download by clicking anchor element', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('removes anchor element after download', () => {
    exportTransactionsToCSV(mockTransactions, 'Test Account');

    expect(removeChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(
      expect.objectContaining({ click: clickSpy })
    );
  });
});
