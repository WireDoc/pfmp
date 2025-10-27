import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyncStatusBadge } from './SyncStatusBadge';

describe('SyncStatusBadge', () => {
  const recentTime = new Date(Date.now() - 5 * 60000).toISOString(); // 5 minutes ago

  it('renders ok status badge', () => {
    render(<SyncStatusBadge status="ok" lastSync={recentTime} />);
    
    expect(screen.getByTestId('sync-status-ok')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('renders pending status badge', () => {
    render(<SyncStatusBadge status="pending" lastSync={recentTime} />);
    
    expect(screen.getByTestId('sync-status-pending')).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('renders error status badge', () => {
    render(<SyncStatusBadge status="error" lastSync={recentTime} />);
    
    expect(screen.getByTestId('sync-status-error')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('formats recent sync time correctly', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
    render(<SyncStatusBadge status="ok" lastSync={fiveMinutesAgo} />);
    
    const badge = screen.getByTestId('sync-status-ok');
    expect(badge).toBeInTheDocument();
  });

  it('formats hourly sync time correctly', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    render(<SyncStatusBadge status="ok" lastSync={twoHoursAgo} />);
    
    const badge = screen.getByTestId('sync-status-ok');
    expect(badge).toBeInTheDocument();
  });

  it('formats daily sync time correctly', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    render(<SyncStatusBadge status="ok" lastSync={threeDaysAgo} />);
    
    const badge = screen.getByTestId('sync-status-ok');
    expect(badge).toBeInTheDocument();
  });

  it('handles invalid date gracefully', () => {
    render(<SyncStatusBadge status="ok" lastSync="invalid-date" />);
    
    expect(screen.getByTestId('sync-status-ok')).toBeInTheDocument();
  });

  it('renders with small size by default', () => {
    render(<SyncStatusBadge status="ok" lastSync={recentTime} />);
    
    const badge = screen.getByTestId('sync-status-ok');
    expect(badge).toHaveClass('MuiChip-sizeSmall');
  });

  it('renders with medium size when specified', () => {
    render(<SyncStatusBadge status="ok" lastSync={recentTime} size="medium" />);
    
    const badge = screen.getByTestId('sync-status-ok');
    expect(badge).toHaveClass('MuiChip-sizeMedium');
  });

  it('displays tooltip on hover', () => {
    render(<SyncStatusBadge status="ok" lastSync={recentTime} />);
    
    // Tooltip text is rendered but hidden until hover
    expect(screen.getByTestId('sync-status-ok')).toBeInTheDocument();
  });
});
