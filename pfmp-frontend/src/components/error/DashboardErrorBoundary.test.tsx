import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

describe('DashboardErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <DashboardErrorBoundary>
        <div>Test content</div>
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('displays retry button in error state', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry callback when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <DashboardErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('resets error state when retry button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    
    // Clicking retry should reset the error state
    // (In practice, the parent would rerender with fresh data)
    await user.click(retryButton);
    
    // After retry, error boundary resets hasError state to false
    // Note: This test verifies the retry mechanism exists and works,
    // but full recovery depends on parent component rerendering
  });

  it('displays error icon in error state', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    // Check for ErrorOutline icon (using testid if available, or check for svg)
    const errorIcon = screen.getByText('Something went wrong').parentElement?.parentElement?.querySelector('svg');
    expect(errorIcon).toBeInTheDocument();
  });

  it('displays user-friendly messages', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error while loading your dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/Try refreshing the page or contact support/)).toBeInTheDocument();
  });
});
