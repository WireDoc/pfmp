import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

describe('EmptyState', () => {
  it('renders with icon, title, and description', () => {
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No accounts yet"
        description="Connect your first account to get started"
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
    expect(screen.getByText('Connect your first account to get started')).toBeInTheDocument();
  });

  it('renders without action buttons', () => {
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No data"
        description="Check back later"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders with primary action button', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No accounts"
        description="Add your first account"
        action={{ label: 'Add Account', onClick: handleClick }}
      />
    );

    const button = screen.getByRole('button', { name: 'Add Account' });
    expect(button).toBeInTheDocument();
  });

  it('calls primary action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No accounts"
        description="Add your first account"
        action={{ label: 'Add Account', onClick: handleClick }}
      />
    );

    const button = screen.getByRole('button', { name: 'Add Account' });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with both primary and secondary actions', () => {
    const handlePrimary = vi.fn();
    const handleSecondary = vi.fn();
    
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No accounts"
        description="Add your first account"
        action={{ label: 'Add Account', onClick: handlePrimary }}
        secondaryAction={{ label: 'Learn More', onClick: handleSecondary }}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
  });

  it('calls secondary action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const handlePrimary = vi.fn();
    const handleSecondary = vi.fn();
    
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No accounts"
        description="Add your first account"
        action={{ label: 'Add Account', onClick: handlePrimary }}
        secondaryAction={{ label: 'Learn More', onClick: handleSecondary }}
      />
    );

    const secondaryButton = screen.getByRole('button', { name: 'Learn More' });
    await user.click(secondaryButton);
    
    expect(handleSecondary).toHaveBeenCalledTimes(1);
    expect(handlePrimary).not.toHaveBeenCalled();
  });

  it('renders with secondary action only', () => {
    const handleSecondary = vi.fn();
    
    render(
      <EmptyState
        icon={AccountBalanceIcon}
        title="No accounts"
        description="Add your first account"
        secondaryAction={{ label: 'Learn More', onClick: handleSecondary }}
      />
    );

    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
  });
});
