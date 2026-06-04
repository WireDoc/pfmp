import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnomalyAlertsCard from '../../../../views/dashboard/spending/AnomalyAlertsCard';

vi.mock('../../../../services/spendingApi', () => ({
  listAnomalies: vi.fn(),
  dismissAnomaly: vi.fn(),
}));

import { listAnomalies, dismissAnomaly } from '../../../../services/spendingApi';

const mockList = listAnomalies as ReturnType<typeof vi.fn>;
const mockDismiss = dismissAnomaly as ReturnType<typeof vi.fn>;

describe('AnomalyAlertsCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders High severity chip when deviation >= 4× IQR', async () => {
    mockList.mockResolvedValue([
      {
        anomalyId: 1, userId: 20, cashTransactionId: 100,
        plaidPrimaryCategory: 'FOOD_AND_DRINK', amount: 400, categoryMedian: 80,
        categoryIqr: 10, deviationMultiple: 32, detectedAt: '2026-05-29',
        dismissed: false,
      },
    ]);
    render(<AnomalyAlertsCard userId={20} />);
    await waitFor(() => expect(screen.getByText(/food and drink/i)).toBeInTheDocument());
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('$400.00')).toBeInTheDocument();
    expect(screen.getByText(/32\.0× IQR/)).toBeInTheDocument();
  });

  it('renders Medium severity chip when deviation < 4× IQR', async () => {
    mockList.mockResolvedValue([
      {
        anomalyId: 2, userId: 20, cashTransactionId: 101,
        plaidPrimaryCategory: 'TRANSPORTATION', amount: 90, categoryMedian: 30,
        categoryIqr: 25, deviationMultiple: 2.4, detectedAt: '2026-05-28',
        dismissed: false,
      },
    ]);
    render(<AnomalyAlertsCard userId={20} />);
    await waitFor(() => expect(screen.getByText('Medium')).toBeInTheDocument());
  });

  it('shows success state when there are no anomalies', async () => {
    mockList.mockResolvedValue([]);
    render(<AnomalyAlertsCard userId={20} />);
    await waitFor(() => expect(screen.getByText(/No anomalies right now/i)).toBeInTheDocument());
  });

  it('calls dismiss on the trash icon', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([
      {
        anomalyId: 7, userId: 20, cashTransactionId: 200,
        plaidPrimaryCategory: 'TRAVEL', amount: 1200, categoryMedian: 100,
        categoryIqr: 50, deviationMultiple: 22, detectedAt: '2026-05-30',
        dismissed: false,
      },
    ]);
    mockDismiss.mockResolvedValue(undefined);
    render(<AnomalyAlertsCard userId={20} />);
    await waitFor(() => expect(screen.getByText('$1,200.00')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Dismiss anomaly/i }));
    expect(mockDismiss).toHaveBeenCalledWith(7);
  });
});
