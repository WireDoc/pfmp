import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UpcomingObligationsWidget } from '../../components/dashboard/UpcomingObligationsWidget';

const mockObligationsData = {
  obligations: [
    {
      id: 1,
      name: 'Home Renovation',
      type: 'home',
      targetDate: '2026-12-15T00:00:00Z',
      estimatedCost: 25000,
      fundsAllocated: 10000,
      fundingProgressPct: 40.0,
      fundingStatus: 'InProgress',
      isCritical: false,
    },
    {
      id: 2,
      name: "Child's College Fund",
      type: 'education',
      targetDate: '2030-08-01T00:00:00Z',
      estimatedCost: 80000,
      fundsAllocated: 15000,
      fundingProgressPct: 18.8,
      fundingStatus: 'InProgress',
      isCritical: true,
    },
  ],
  total: 2,
};

vi.mock('../../services/dashboard/overviewApi', () => ({
  fetchUpcomingObligations: vi.fn(),
}));

import { fetchUpcomingObligations } from '../../services/dashboard/overviewApi';
const mockFetchObligations = vi.mocked(fetchUpcomingObligations);

function renderWidget() {
  return render(
    <MemoryRouter>
      <UpcomingObligationsWidget />
    </MemoryRouter>,
  );
}

describe('UpcomingObligationsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockFetchObligations.mockReturnValue(new Promise(() => {}));
    renderWidget();
    expect(screen.getByTestId('obligations-loading')).toBeInTheDocument();
  });

  it('renders obligation names', async () => {
    mockFetchObligations.mockResolvedValue(mockObligationsData);
    renderWidget();
    expect(await screen.findByText('Home Renovation')).toBeInTheDocument();
    expect(screen.getByText("Child's College Fund")).toBeInTheDocument();
  });

  it('shows Critical chip for critical obligations', async () => {
    mockFetchObligations.mockResolvedValue(mockObligationsData);
    renderWidget();
    await screen.findByText("Child's College Fund");
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('shows funding progress percentages', async () => {
    mockFetchObligations.mockResolvedValue(mockObligationsData);
    renderWidget();
    await screen.findByText('Home Renovation');
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('18.8%')).toBeInTheDocument();
  });

  it('shows heading', async () => {
    mockFetchObligations.mockResolvedValue(mockObligationsData);
    renderWidget();
    expect(await screen.findByText('Upcoming Obligations')).toBeInTheDocument();
  });

  it('shows empty state when no obligations', async () => {
    mockFetchObligations.mockResolvedValue({ obligations: [], total: 0 });
    renderWidget();
    expect(await screen.findByText('No upcoming obligations')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockFetchObligations.mockRejectedValue(new Error('Network error'));
    renderWidget();
    expect(await screen.findByText('Unable to load obligations')).toBeInTheDocument();
  });
});
