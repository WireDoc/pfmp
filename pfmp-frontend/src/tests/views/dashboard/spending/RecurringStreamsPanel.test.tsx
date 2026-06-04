import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecurringStreamsPanel from '../../../../views/dashboard/spending/RecurringStreamsPanel';

vi.mock('../../../../services/spendingApi', () => ({
  listRecurringStreams: vi.fn(),
  dismissRecurringStream: vi.fn(),
}));

import { listRecurringStreams, dismissRecurringStream } from '../../../../services/spendingApi';

const mockList = listRecurringStreams as ReturnType<typeof vi.fn>;
const mockDismiss = dismissRecurringStream as ReturnType<typeof vi.fn>;

const sampleStreams = [
  {
    streamId: 1, userId: 20, source: 'PlaidRecurring', plaidStreamId: 'p1',
    merchantName: 'Netflix', description: null, direction: 'Outflow',
    averageAmount: 15.49, lastAmount: 15.49, frequency: 'Monthly',
    lastDate: '2026-05-15', nextExpectedDate: '2026-06-15', isActive: true,
    status: 'Mature', confidenceScore: 1, plaidCategory: null, plaidCategoryDetailed: null,
    dateCreated: '2026-01-01', dateUpdated: '2026-05-15',
  },
  {
    streamId: 2, userId: 20, source: 'Heuristic', plaidStreamId: null,
    merchantName: 'GS-13 Direct Deposit', description: null, direction: 'Inflow',
    averageAmount: 5538.46, lastAmount: 5538.46, frequency: 'Biweekly',
    lastDate: '2026-05-20', nextExpectedDate: '2026-06-03', isActive: true,
    status: 'Mature', confidenceScore: 0.95, plaidCategory: null, plaidCategoryDetailed: null,
    dateCreated: '2026-03-01', dateUpdated: '2026-05-20',
  },
];

describe('RecurringStreamsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders outflow streams by default with Plaid/Heuristic source chips', async () => {
    mockList.mockResolvedValue(sampleStreams);
    render(<RecurringStreamsPanel userId={20} />);
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument());
    expect(screen.getByText('-$15.49')).toBeInTheDocument();
    expect(screen.getByText('Plaid')).toBeInTheDocument();
    // Inflows tab not selected; deposit shouldn't be visible
    expect(screen.queryByText('GS-13 Direct Deposit')).not.toBeInTheDocument();
  });

  it('switches to inflows tab and shows the deposit', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(sampleStreams);
    render(<RecurringStreamsPanel userId={20} />);
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Inflows/i }));
    expect(screen.getByText('GS-13 Direct Deposit')).toBeInTheDocument();
    expect(screen.getByText('+$5,538.46')).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('shows empty-state message when no streams in the selected direction', async () => {
    mockList.mockResolvedValue([sampleStreams[0]]);
    const user = userEvent.setup();
    render(<RecurringStreamsPanel userId={20} />);
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Inflows/i }));
    expect(screen.getByText(/No recurring inflows detected yet/i)).toBeInTheDocument();
  });

  it('calls dismiss on the trash icon', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([sampleStreams[0]]);
    mockDismiss.mockResolvedValue(undefined);
    render(<RecurringStreamsPanel userId={20} />);
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Dismiss Netflix/i }));
    expect(mockDismiss).toHaveBeenCalledWith(1);
  });
});
