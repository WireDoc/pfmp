import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface Props {
  /**
   * Array of net worth values over time (typically 30 days)
   * Most recent value should be last in the array
   */
  values: number[];
  /**
   * Optional labels for data points (e.g., dates)
   * If not provided, will use index as label
   */
  labels?: string[];
  /**
   * Color for the line (defaults to theme primary color)
   */
  color?: string;
  /**
   * Height of the sparkline in pixels
   */
  height?: number;
  /**
   * Width of the sparkline in pixels
   */
  width?: number;
}

/**
 * NetWorthSparkline - Compact trend visualization for net worth over time
 * 
 * Displays a minimal line chart without axes or grid, optimized for
 * showing trends at a glance (typically 30-day net worth history).
 */
export const NetWorthSparkline: React.FC<Props> = ({
  values,
  labels,
  color = '#1976d2',
  height = 60,
  width = 200,
}) => {
  // Generate default labels if not provided
  const chartLabels = labels ?? values.map((_, i) => `Day ${i + 1}`);

  // Determine color based on trend (positive = green, negative = red, neutral = blue)
  const firstValue = values[0] ?? 0;
  const lastValue = values[values.length - 1] ?? 0;
  const trendColor = lastValue > firstValue ? '#2e7d32' : lastValue < firstValue ? '#d32f2f' : color;

  const data = {
    labels: chartLabels,
    datasets: [
      {
        data: values,
        borderColor: trendColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0, // Hide data points for minimal look
        pointHoverRadius: 4, // Show point on hover
        pointHoverBackgroundColor: trendColor,
        tension: 0.3, // Smooth curve
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return '';
            return `Net Worth: $${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false, // Hide x-axis for sparkline
      },
      y: {
        display: false, // Hide y-axis for sparkline
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div style={{ width, height }} data-testid="net-worth-sparkline">
      <Line data={data} options={options} />
    </div>
  );
};
