import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HealthScoreWidget } from '../../components/dashboard/HealthScoreWidget';

const mockHealthData = {
  overallScore: 72,
  grade: 'Good',
  breakdown: {
    emergencyFund: { score: 80, weight: 20, monthsCovered: 4.8 },
    debtToIncome: { score: 90, weight: 20, dtiPercent: 15.2 },
    savingsRate: { score: 60, weight: 20, ratePercent: 12.0 },
    insuranceCoverage: { score: 50, weight: 15, policiesCount: 4, adequateCount: 2 },
    diversification: { score: 75, weight: 15, assetClassCount: 3 },
    goalProgress: { score: 40, weight: 10, goalsCount: 2 },
  },
  computedAt: '2026-04-09T12:00:00Z',
};

vi.mock('../../services/dashboard/overviewApi', () => ({
  fetchHealthScore: vi.fn(),
}));

import { fetchHealthScore } from '../../services/dashboard/overviewApi';
const mockFetchHealthScore = vi.mocked(fetchHealthScore);

function renderWidget() {
  return render(
    <MemoryRouter>
      <HealthScoreWidget />
    </MemoryRouter>,
  );
}

describe('HealthScoreWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockFetchHealthScore.mockReturnValue(new Promise(() => {})); // never resolves
    renderWidget();
    expect(screen.getByTestId('health-score-loading')).toBeInTheDocument();
  });

  it('renders score and grade after loading', async () => {
    mockFetchHealthScore.mockResolvedValue(mockHealthData);
    renderWidget();
    expect(await screen.findByText('72')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders all 6 breakdown categories', async () => {
    mockFetchHealthScore.mockResolvedValue(mockHealthData);
    renderWidget();
    await screen.findByText('72');
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Debt-to-Income')).toBeInTheDocument();
    expect(screen.getByText('Savings Rate')).toBeInTheDocument();
    expect(screen.getByText('Insurance')).toBeInTheDocument();
    expect(screen.getByText('Diversification')).toBeInTheDocument();
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
  });

  it('shows the heading', async () => {
    mockFetchHealthScore.mockResolvedValue(mockHealthData);
    renderWidget();
    expect(await screen.findByText('Financial Health Score')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockFetchHealthScore.mockRejectedValue(new Error('Network error'));
    renderWidget();
    expect(await screen.findByText('Unable to load health score')).toBeInTheDocument();
  });
});
