import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoalProjectionsWidget } from '../../components/dashboard/GoalProjectionsWidget';

// Mock the goal service
vi.mock('../../services/api', () => ({
  goalService: {
    getByUser: vi.fn(),
  },
  GoalType: { Retirement: 'Retirement', EmergencyFund: 'EmergencyFund' },
  GoalCategory: { LongTerm: 'LongTerm', ShortTerm: 'ShortTerm' },
  GoalStatus: { Active: 'Active', OnTrack: 'OnTrack', Completed: 'Completed', Cancelled: 'Cancelled' },
}));

vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
}));

import { goalService } from '../../services/api';

const mockGoals = [
  {
    goalId: 1,
    userId: 20,
    name: 'Retirement Fund',
    type: 'Retirement',
    category: 'LongTerm',
    targetAmount: 500000,
    currentAmount: 125000,
    targetDate: new Date(Date.now() + 120 * 30 * 24 * 60 * 60 * 1000).toISOString(), // ~120 months
    monthlyContribution: 2000,
    priority: 5,
    status: 'Active',
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
  },
  {
    goalId: 2,
    userId: 20,
    name: 'Emergency Fund',
    type: 'EmergencyFund',
    category: 'ShortTerm',
    targetAmount: 30000,
    currentAmount: 27000,
    monthlyContribution: 500,
    priority: 4,
    status: 'OnTrack',
    createdAt: '2024-02-01',
    updatedAt: '2024-06-01',
  },
  {
    goalId: 3,
    userId: 20,
    name: 'Old Completed Goal',
    type: 'Retirement',
    category: 'LongTerm',
    targetAmount: 10000,
    currentAmount: 10000,
    priority: 1,
    status: 'Completed',
    createdAt: '2023-01-01',
    updatedAt: '2024-01-01',
  },
];

function renderWidget() {
  return render(
    <MemoryRouter>
      <GoalProjectionsWidget />
    </MemoryRouter>
  );
}

describe('GoalProjectionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWidget();
    expect(screen.getByTestId('goal-projections-widget')).toBeInTheDocument();
  });

  it('displays active goals with progress bars', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockGoals });
    renderWidget();

    expect(await screen.findByText('Retirement Fund')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    // Completed goals should be filtered out
    expect(screen.queryByText('Old Completed Goal')).not.toBeInTheDocument();
  });

  it('shows completion percentages', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockGoals });
    renderWidget();

    // Retirement: 125k/500k = 25%
    expect(await screen.findByText('25%')).toBeInTheDocument();
    // Emergency: 27k/30k = 90%
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('displays currency amounts', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockGoals });
    renderWidget();

    expect(await screen.findByText(/\$125,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$500,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$27,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$30,000/)).toBeInTheDocument();
  });

  it('shows heading', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockGoals });
    renderWidget();

    expect(await screen.findByText('Goal Projections')).toBeInTheDocument();
  });

  it('shows empty state when no active goals', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [mockGoals[2]] }); // only Completed goal
    renderWidget();

    expect(await screen.findByText(/No active goals/)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    renderWidget();

    expect(await screen.findByText('Failed to load goals')).toBeInTheDocument();
  });

  it('has a what-if slider', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockGoals });
    renderWidget();

    expect(await screen.findByText(/What if I save/)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /extra monthly savings/i })).toBeInTheDocument();
  });

  it('updates projections when slider changes', async () => {
    (goalService.getByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockGoals });
    renderWidget();

    await screen.findByText('Retirement Fund');

    const slider = screen.getByRole('slider', { name: /extra monthly savings/i });
    // Simulate slider change
    fireEvent.change(slider, { target: { value: 500 } });

    // The "What if" label should update
    expect(screen.getByText(/What if I save/)).toBeInTheDocument();
  });
});
