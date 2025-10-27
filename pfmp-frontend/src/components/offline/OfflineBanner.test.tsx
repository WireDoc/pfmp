import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  it('renders nothing when online and not recently offline', () => {
    const { container } = render(<OfflineBanner isOffline={false} wasOffline={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders offline banner when offline', () => {
    render(<OfflineBanner isOffline={true} wasOffline={false} />);
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it('shows offline message with warning severity', () => {
    render(<OfflineBanner isOffline={true} wasOffline={false} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardWarning');
  });

  it('renders back online banner when was offline', () => {
    render(<OfflineBanner isOffline={false} wasOffline={true} />);
    expect(screen.getByText(/You're back online!/)).toBeInTheDocument();
  });

  it('shows back online message with success severity', () => {
    render(<OfflineBanner isOffline={false} wasOffline={true} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardSuccess');
  });

  it('prioritizes offline banner over back online banner', () => {
    render(<OfflineBanner isOffline={true} wasOffline={true} />);
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    expect(screen.queryByText(/You're back online!/)).not.toBeInTheDocument();
  });

  it('renders WifiOff icon when offline', () => {
    render(<OfflineBanner isOffline={true} wasOffline={false} />);
    const icon = screen.getByTestId('WifiOffIcon');
    expect(icon).toBeInTheDocument();
  });

  it('renders Wifi icon when back online', () => {
    render(<OfflineBanner isOffline={false} wasOffline={true} />);
    const icon = screen.getByTestId('WifiIcon');
    expect(icon).toBeInTheDocument();
  });
});
