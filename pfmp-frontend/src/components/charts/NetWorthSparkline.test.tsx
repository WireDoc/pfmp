import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NetWorthSparkline } from './NetWorthSparkline';

describe('NetWorthSparkline', () => {
  it('renders without crashing', () => {
    const values = [100000, 102000, 101000, 103000, 105000];
    render(<NetWorthSparkline values={values} />);
    expect(screen.getByTestId('net-worth-sparkline')).toBeInTheDocument();
  });

  it('renders with empty values array', () => {
    render(<NetWorthSparkline values={[]} />);
    expect(screen.getByTestId('net-worth-sparkline')).toBeInTheDocument();
  });

  it('renders with single value', () => {
    render(<NetWorthSparkline values={[100000]} />);
    expect(screen.getByTestId('net-worth-sparkline')).toBeInTheDocument();
  });

  it('applies custom height and width', () => {
    const values = [100000, 102000, 103000];
    render(<NetWorthSparkline values={values} height={80} width={300} />);
    
    const container = screen.getByTestId('net-worth-sparkline');
    expect(container).toHaveStyle({ height: '80px', width: '300px' });
  });

  it('uses default dimensions when not specified', () => {
    const values = [100000, 102000, 103000];
    render(<NetWorthSparkline values={values} />);
    
    const container = screen.getByTestId('net-worth-sparkline');
    expect(container).toHaveStyle({ height: '60px', width: '200px' });
  });

  it('renders with custom labels', () => {
    const values = [100000, 102000, 103000];
    const labels = ['Jan 1', 'Jan 2', 'Jan 3'];
    render(<NetWorthSparkline values={values} labels={labels} />);
    
    expect(screen.getByTestId('net-worth-sparkline')).toBeInTheDocument();
  });

  it('handles large value arrays', () => {
    // Simulate 30 days of data
    const values = Array.from({ length: 30 }, (_, i) => 100000 + i * 1000);
    render(<NetWorthSparkline values={values} />);
    
    expect(screen.getByTestId('net-worth-sparkline')).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    const values = [100000, 102000, 103000];
    render(<NetWorthSparkline values={values} color="#ff0000" />);
    
    expect(screen.getByTestId('net-worth-sparkline')).toBeInTheDocument();
  });
});
