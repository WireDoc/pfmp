import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDisplay } from './ErrorDisplay';

describe('ErrorDisplay', () => {
  describe('inline variant', () => {
    it('renders default error message', () => {
      render(<ErrorDisplay />);
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('renders custom error message', () => {
      render(<ErrorDisplay message="Custom error message" />);
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('renders error description when provided', () => {
      render(<ErrorDisplay message="Error" description="Detailed error description" />);
      expect(screen.getByText('Detailed error description')).toBeInTheDocument();
    });

    it('renders retry button by default', () => {
      const onRetry = vi.fn();
      render(<ErrorDisplay onRetry={onRetry} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ErrorDisplay onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('does not render retry button when showRetry is false', () => {
      const onRetry = vi.fn();
      render(<ErrorDisplay onRetry={onRetry} showRetry={false} />);
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorDisplay showRetry={true} />);
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('renders error icon', () => {
      render(<ErrorDisplay />);
      const errorDisplay = screen.getByTestId('error-display');
      const icon = errorDisplay.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('banner variant', () => {
    it('renders as alert banner', () => {
      render(<ErrorDisplay variant="banner" message="Banner error" />);
      expect(screen.getByText('Banner error')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders retry button in banner', () => {
      const onRetry = vi.fn();
      render(<ErrorDisplay variant="banner" message="Error" onRetry={onRetry} />);
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when banner retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ErrorDisplay variant="banner" message="Error" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('renders description in banner variant', () => {
      render(<ErrorDisplay variant="banner" message="Error" description="Details here" />);
      expect(screen.getByText('Details here')).toBeInTheDocument();
    });

    it('does not render retry button in banner when showRetry is false', () => {
      const onRetry = vi.fn();
      render(<ErrorDisplay variant="banner" message="Error" onRetry={onRetry} showRetry={false} />);
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });
});
