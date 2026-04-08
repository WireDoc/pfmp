import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TasksView } from '../../views/dashboard/TasksView';

// Mock devUserState — must include getDevUserId for apiDashboardService
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

// Mock taskService (returns axios-shaped { data } responses)
const mockGetByUser = vi.fn();
const mockCreate = vi.fn();
const mockUpdateStatus = vi.fn();
const mockMarkAsCompleted = vi.fn();
const mockDismissTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock('../../services/api', () => ({
  taskService: {
    getByUser: (...args: unknown[]) => mockGetByUser(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    markAsCompleted: (...args: unknown[]) => mockMarkAsCompleted(...args),
    dismiss: (...args: unknown[]) => mockDismissTask(...args),
    delete: (...args: unknown[]) => mockDeleteTask(...args),
  },
}));

// TaskStatus enum values: Pending='Pending', Accepted='Accepted', InProgress='InProgress', Completed='Completed', Dismissed='Dismissed'
// TaskType enum values: Rebalancing='Rebalancing', CashOptimization='CashOptimization'
// TaskPriority enum values: Low='Low', Medium='Medium', High='High', Critical='Critical'

const sampleTasks = [
  { taskId: 1, userId: 20, type: 'CashOptimization', title: 'Move emergency fund to HYSA', description: 'Transfer $5K to high-yield savings', priority: 'High', status: 'Pending', createdDate: '2026-03-28', dueDate: '2026-04-15', progressPercentage: 0, confidenceScore: 0.85 },
  { taskId: 2, userId: 20, type: 'Rebalancing', title: 'Rebalance TSP allocation', description: 'Increase C Fund to 60%', priority: 'Medium', status: 'Pending', createdDate: '2026-03-29', dueDate: null, progressPercentage: 0, confidenceScore: 0.72 },
  { taskId: 3, userId: 20, type: 'Rebalancing', title: 'Review portfolio drift', description: 'Check asset allocation drift', priority: 'Medium', status: 'InProgress', createdDate: '2026-03-20', dueDate: null, progressPercentage: 40, confidenceScore: null },
  { taskId: 4, userId: 20, type: 'CashOptimization', title: 'Close old savings account', description: 'Low-yield account at local bank', priority: 'Low', status: 'Completed', createdDate: '2026-03-01', dueDate: null, progressPercentage: 100, confidenceScore: null },
  { taskId: 5, userId: 20, type: 'Rebalancing', title: 'Dismissed task', description: 'No longer relevant', priority: 'Low', status: 'Dismissed', createdDate: '2026-03-01', dueDate: null, progressPercentage: 0, confidenceScore: null },
];

function renderTasksView() {
  return render(
    <MemoryRouter>
      <TasksView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetByUser.mockResolvedValue({ data: sampleTasks });
  mockCreate.mockResolvedValue({ data: { taskId: 100 } });
  mockUpdateStatus.mockResolvedValue({ data: {} });
  mockMarkAsCompleted.mockResolvedValue({ data: {} });
  mockDismissTask.mockResolvedValue({ data: {} });
});

describe('TasksView', () => {
  it('renders the page heading', async () => {
    renderTasksView();
    expect(await screen.findByText('Tasks')).toBeInTheDocument();
  });

  it('loads tasks from the API', async () => {
    renderTasksView();
    await waitFor(() => {
      expect(mockGetByUser).toHaveBeenCalledWith(20);
    });
  });

  it('shows summary chips with counts', async () => {
    renderTasksView();
    await waitFor(() => {
      expect(screen.getByText('5 total')).toBeInTheDocument();
      expect(screen.getByText('2 pending')).toBeInTheDocument();
      expect(screen.getByText('1 in progress')).toBeInTheDocument();
      expect(screen.getByText('1 completed')).toBeInTheDocument();
    });
  });

  it('shows 4 status tabs', async () => {
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());

    expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /in progress/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /completed/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /dismissed/i })).toBeInTheDocument();
  });

  it('shows pending tasks by default', async () => {
    renderTasksView();
    await waitFor(() => {
      expect(screen.getByText('Move emergency fund to HYSA')).toBeInTheDocument();
      expect(screen.getByText('Rebalance TSP allocation')).toBeInTheDocument();
    });
  });

  it('does not show in-progress tasks on Pending tab', async () => {
    renderTasksView();
    await waitFor(() => {
      expect(screen.getByText('Move emergency fund to HYSA')).toBeInTheDocument();
    });
    expect(screen.queryByText('Review portfolio drift')).not.toBeInTheDocument();
  });

  it('switches to In Progress tab', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());

    const inProgressTab = screen.getByRole('tab', { name: /in progress/i });
    await user.click(inProgressTab);

    await waitFor(() => {
      expect(screen.getByText('Review portfolio drift')).toBeInTheDocument();
    });
    // Progress bar should be visible for 40%
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('switches to Completed tab', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());

    const completedTab = screen.getByRole('tab', { name: /completed/i });
    await user.click(completedTab);

    await waitFor(() => {
      expect(screen.getByText('Close old savings account')).toBeInTheDocument();
    });
  });

  it('starts a pending task (moves to In Progress)', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await screen.findByText('Move emergency fund to HYSA');

    // Click the Start button (PlayArrow icon) for the first task
    const startButtons = screen.getAllByTestId('PlayArrowIcon');
    await user.click(startButtons[0].closest('button')!);

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith(1, 'InProgress'); // taskId=1, InProgress
    });
  });

  it('completes a pending task', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await screen.findByText('Move emergency fund to HYSA');

    const checkButtons = screen.getAllByTestId('CheckCircleIcon');
    await user.click(checkButtons[0].closest('button')!);

    await waitFor(() => {
      expect(mockMarkAsCompleted).toHaveBeenCalledWith(1, { completionNotes: 'Completed via Tasks page' });
    });
  });

  it('dismisses a pending task', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await screen.findByText('Move emergency fund to HYSA');

    const cancelButtons = screen.getAllByTestId('CancelIcon');
    await user.click(cancelButtons[0].closest('button')!);

    await waitFor(() => {
      expect(mockDismissTask).toHaveBeenCalledWith(1);
    });
  });

  it('opens create task dialog', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());

    const newBtn = screen.getByRole('button', { name: /new task/i });
    await user.click(newBtn);

    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('creates a new task', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /new task/i }));

    const titleInput = screen.getByLabelText('Title');
    const descInput = screen.getByLabelText('Description');
    await user.type(titleInput, 'New test task');
    await user.type(descInput, 'Description of test task');

    // Find the Create button inside the dialog
    const dialog = screen.getByRole('dialog');
    const createBtn = within(dialog).getByRole('button', { name: /create/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 20,
          title: 'New test task',
          description: 'Description of test task',
        })
      );
    });
  }, 15000);

  it('disables create button when title is empty', async () => {
    const user = userEvent.setup();
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /new task/i }));

    const dialog = screen.getByRole('dialog');
    const createBtn = within(dialog).getByRole('button', { name: /create/i });
    expect(createBtn).toBeDisabled();
  });

  it('shows empty state for tab with no tasks', async () => {
    mockGetByUser.mockResolvedValue({ data: [] });
    renderTasksView();

    await waitFor(() => {
      expect(screen.getByText(/no pending tasks/i)).toBeInTheDocument();
    });
  });

  it('shows error alert when loading fails', async () => {
    mockGetByUser.mockRejectedValue(new Error('Network error'));
    renderTasksView();

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows New Task button', async () => {
    renderTasksView();
    await waitFor(() => expect(mockGetByUser).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
  });

  it('shows task priority and type chips', async () => {
    renderTasksView();
    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument(); // priority 3
      expect(screen.getByText('Cash Optimization')).toBeInTheDocument(); // type 4
    });
  });
});
