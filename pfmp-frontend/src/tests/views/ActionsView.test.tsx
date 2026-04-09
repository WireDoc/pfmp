import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActionsView } from '../../views/dashboard/ActionsView';

// Mock devUserState
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

// Mock services
const mockGetAlertsByUser = vi.fn();
const mockAlertMarkAsRead = vi.fn();
const mockAlertDismiss = vi.fn();
const mockAlertUndismiss = vi.fn();
const mockAdviceGetForUser = vi.fn();
const mockAdviceAccept = vi.fn();
const mockAdviceDismiss = vi.fn();
const mockAdviceGenerateFromAlert = vi.fn();
const mockTaskGetByUser = vi.fn();
const mockTaskCreate = vi.fn();
const mockTaskUpdateStatus = vi.fn();
const mockTaskMarkAsCompleted = vi.fn();
const mockTaskDismiss = vi.fn();
const mockTaskUpdateProgress = vi.fn();

vi.mock('../../services/api', () => ({
  alertsService: {
    getByUser: (...args: unknown[]) => mockGetAlertsByUser(...args),
    markAsRead: (...args: unknown[]) => mockAlertMarkAsRead(...args),
    dismiss: (...args: unknown[]) => mockAlertDismiss(...args),
    undismiss: (...args: unknown[]) => mockAlertUndismiss(...args),
  },
  adviceService: {
    getForUser: (...args: unknown[]) => mockAdviceGetForUser(...args),
    accept: (...args: unknown[]) => mockAdviceAccept(...args),
    dismiss: (...args: unknown[]) => mockAdviceDismiss(...args),
    generateFromAlert: (...args: unknown[]) => mockAdviceGenerateFromAlert(...args),
  },
  taskService: {
    getByUser: (...args: unknown[]) => mockTaskGetByUser(...args),
    create: (...args: unknown[]) => mockTaskCreate(...args),
    updateStatus: (...args: unknown[]) => mockTaskUpdateStatus(...args),
    markAsCompleted: (...args: unknown[]) => mockTaskMarkAsCompleted(...args),
    dismiss: (...args: unknown[]) => mockTaskDismiss(...args),
    updateProgress: (...args: unknown[]) => mockTaskUpdateProgress(...args),
    delete: vi.fn(),
  },
}));

const sampleAlerts = [
  {
    alertId: 378,
    userId: 20,
    title: 'Emergency fund below target',
    message: 'Your emergency fund is at 60% of target',
    severity: 'High',
    category: 'Cashflow',
    isActionable: true,
    portfolioImpactScore: null,
    createdAt: '2026-03-28T10:00:00Z',
    isRead: false,
    isDismissed: false,
    expiresAt: null,
    actionUrl: null,
  },
  {
    alertId: 379,
    userId: 20,
    title: 'TSP contribution limit approaching',
    message: 'You are within 10% of annual limit',
    severity: 'Medium',
    category: 'Planning',
    isActionable: true,
    portfolioImpactScore: null,
    createdAt: '2026-03-29T10:00:00Z',
    isRead: true,
    isDismissed: false,
    expiresAt: null,
    actionUrl: null,
  },
  {
    alertId: 380,
    userId: 20,
    title: 'Old dismissed alert',
    message: 'No longer relevant',
    severity: 'Low',
    category: 'General',
    isActionable: false,
    portfolioImpactScore: null,
    createdAt: '2026-03-20T10:00:00Z',
    isRead: true,
    isDismissed: true,
    expiresAt: null,
    actionUrl: null,
  },
];

const sampleAdvice = [
  {
    adviceId: 14,
    userId: 20,
    theme: 'Cashflow',
    status: 'Proposed',
    consensusText: 'Move $2K to high-yield savings',
    confidenceScore: 88,
    sourceAlertId: 378,
    linkedTaskId: null,
    createdAt: '2026-03-28T12:00:00Z',
    updatedAt: '2026-03-28T12:00:00Z',
  },
  {
    adviceId: 15,
    userId: 20,
    theme: 'Planning',
    status: 'Accepted',
    consensusText: 'Increase TSP contribution by 2%',
    confidenceScore: 92,
    sourceAlertId: 379,
    linkedTaskId: 10,
    createdAt: '2026-03-29T12:00:00Z',
    updatedAt: '2026-03-30T12:00:00Z',
  },
  {
    adviceId: 16,
    userId: 20,
    theme: 'General',
    status: 'Dismissed',
    consensusText: 'Review insurance coverage',
    confidenceScore: 70,
    sourceAlertId: null,
    linkedTaskId: null,
    createdAt: '2026-03-25T12:00:00Z',
    updatedAt: '2026-03-26T12:00:00Z',
  },
];

const sampleTasks = [
  {
    taskId: 1,
    userId: 20,
    type: 'CashOptimization',
    title: 'Move emergency fund to HYSA',
    description: 'Transfer $5K to high-yield savings',
    priority: 'High',
    status: 'Pending',
    createdDate: '2026-03-28',
    dueDate: '2026-04-15',
    progressPercentage: 0,
    confidenceScore: 0.85,
  },
  {
    taskId: 2,
    userId: 20,
    type: 'Rebalancing',
    title: 'Rebalance TSP allocation',
    description: 'Increase C Fund to 60%',
    priority: 'Medium',
    status: 'InProgress',
    createdDate: '2026-03-29',
    dueDate: null,
    progressPercentage: 40,
    confidenceScore: null,
  },
  {
    taskId: 3,
    userId: 20,
    type: 'Rebalancing',
    title: 'Close old savings account',
    description: 'Low-yield account',
    priority: 'Low',
    status: 'Completed',
    createdDate: '2026-03-01',
    dueDate: null,
    progressPercentage: 100,
    confidenceScore: null,
  },
];

function renderActionsView(initialRoute = '/dashboard/actions') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ActionsView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAlertsByUser.mockResolvedValue({ data: sampleAlerts });
  mockAlertMarkAsRead.mockResolvedValue({ data: {} });
  mockAlertDismiss.mockResolvedValue({ data: {} });
  mockAlertUndismiss.mockResolvedValue({ data: {} });
  mockAdviceGetForUser.mockResolvedValue({ data: sampleAdvice });
  mockAdviceAccept.mockResolvedValue({ data: { ...sampleAdvice[0], status: 'Accepted' } });
  mockAdviceDismiss.mockResolvedValue({ data: { ...sampleAdvice[0], status: 'Dismissed' } });
  mockAdviceGenerateFromAlert.mockResolvedValue({ data: sampleAdvice[0] });
  mockTaskGetByUser.mockResolvedValue({ data: sampleTasks });
  mockTaskCreate.mockResolvedValue({ data: { taskId: 100 } });
  mockTaskUpdateStatus.mockResolvedValue({ data: {} });
  mockTaskMarkAsCompleted.mockResolvedValue({ data: {} });
  mockTaskDismiss.mockResolvedValue({ data: {} });
  mockTaskUpdateProgress.mockResolvedValue({ data: {} });
});

describe('ActionsView', () => {
  /* ------------------------------------------------------------ */
  /*  Top-level tabs                                                */
  /* ------------------------------------------------------------ */
  it('renders the Actions heading', async () => {
    renderActionsView();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders 3 top-level tabs', () => {
    renderActionsView();
    expect(screen.getByRole('tab', { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /advice/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
  });

  it('defaults to Alerts tab', async () => {
    renderActionsView();
    await waitFor(() => {
      expect(mockGetAlertsByUser).toHaveBeenCalledWith(20, { isActive: true });
    });
  });

  it('opens Advice tab via ?tab=advice', async () => {
    renderActionsView('/dashboard/actions?tab=advice');
    await waitFor(() => {
      expect(mockAdviceGetForUser).toHaveBeenCalledWith(20);
    });
  });

  it('opens Tasks tab via ?tab=tasks', async () => {
    renderActionsView('/dashboard/actions?tab=tasks');
    await waitFor(() => {
      expect(mockTaskGetByUser).toHaveBeenCalledWith(20);
    });
  });

  /* ------------------------------------------------------------ */
  /*  Alerts Tab                                                    */
  /* ------------------------------------------------------------ */
  describe('Alerts tab', () => {
    it('shows alert cards', async () => {
      renderActionsView();
      expect(await screen.findByText('Emergency fund below target')).toBeInTheDocument();
      expect(screen.getByText('TSP contribution limit approaching')).toBeInTheDocument();
    });

    it('shows alert count chip', async () => {
      renderActionsView();
      await waitFor(() => {
        expect(screen.getByText('3 alerts')).toBeInTheDocument();
      });
    });

    it('shows severity and category chips', async () => {
      renderActionsView();
      await waitFor(() => {
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Cashflow')).toBeInTheDocument();
      });
    });

    it('shows Get AI Advice button for actionable alerts', async () => {
      renderActionsView();
      // Alert 378 has no linked advice and is actionable
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[0]] });

      renderActionsView();
      await waitFor(() => {
        expect(screen.getAllByText('Get AI Advice').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows linked advice chip when advice exists for alert', async () => {
      renderActionsView();
      // Alert 378 has advice 14 (Proposed) linked via sourceAlertId
      await waitFor(() => {
        expect(screen.getByText('Advice generated')).toBeInTheDocument();
      });
    });

    it('calls generateFromAlert when Get AI Advice is clicked', async () => {
      // Setup: alert with no linked advice
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[0]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });

      const user = userEvent.setup();
      renderActionsView();

      const btn = await screen.findByRole('button', { name: /get ai advice/i });
      await user.click(btn);

      await waitFor(() => {
        expect(mockAdviceGenerateFromAlert).toHaveBeenCalledWith(378);
      });
    });

    it('shows filter toggle buttons', async () => {
      renderActionsView();
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^active$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^read$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^dismissed$/i })).toBeInTheDocument();
    });

    it('shows empty state when no alerts', async () => {
      mockGetAlertsByUser.mockResolvedValue({ data: [] });
      renderActionsView();
      await waitFor(() => {
        expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
      });
    });

    it('shows error alert on fetch failure', async () => {
      mockGetAlertsByUser.mockRejectedValue(new Error('Network error'));
      renderActionsView();
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('shows mark-as-read button for unread, non-dismissed alerts', async () => {
      // Alert 378: isRead=false, isDismissed=false → should show mark-as-read
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[0]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      renderActionsView();
      expect(await screen.findByRole('button', { name: /mark as read/i })).toBeInTheDocument();
    });

    it('does not show mark-as-read button for already-read alerts', async () => {
      // Alert 379: isRead=true → should NOT show mark-as-read
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[1]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      renderActionsView();
      await waitFor(() => {
        expect(screen.getByText('TSP contribution limit approaching')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
    });

    it('calls markAsRead when mark-as-read button is clicked', async () => {
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[0]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      const user = userEvent.setup();
      renderActionsView();

      const btn = await screen.findByRole('button', { name: /mark as read/i });
      await user.click(btn);

      await waitFor(() => {
        expect(mockAlertMarkAsRead).toHaveBeenCalledWith(378);
      });
    });

    it('shows dismiss button for non-dismissed alerts', async () => {
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[0]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      renderActionsView();
      expect(await screen.findByRole('button', { name: /dismiss alert/i })).toBeInTheDocument();
    });

    it('calls dismiss when dismiss button is clicked', async () => {
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[0]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      const user = userEvent.setup();
      renderActionsView();

      const btn = await screen.findByRole('button', { name: /dismiss alert/i });
      await user.click(btn);

      await waitFor(() => {
        expect(mockAlertDismiss).toHaveBeenCalledWith(378);
      });
    });

    it('shows restore button for dismissed alerts', async () => {
      // Switch to "Dismissed" filter, then check for Restore button
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[2]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      const user = userEvent.setup();
      renderActionsView();

      // Click "Dismissed" filter toggle
      const dismissedFilter = await screen.findByRole('button', { name: /^dismissed$/i });
      await user.click(dismissedFilter);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
      });
    });

    it('calls undismiss when Restore button is clicked', async () => {
      mockGetAlertsByUser.mockResolvedValue({ data: [sampleAlerts[2]] });
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      const user = userEvent.setup();
      renderActionsView();

      const dismissedFilter = await screen.findByRole('button', { name: /^dismissed$/i });
      await user.click(dismissedFilter);

      const restoreBtn = await screen.findByRole('button', { name: /restore/i });
      await user.click(restoreBtn);

      await waitFor(() => {
        expect(mockAlertUndismiss).toHaveBeenCalledWith(380);
      });
    });
  });

  /* ------------------------------------------------------------ */
  /*  Advice Tab                                                    */
  /* ------------------------------------------------------------ */
  describe('Advice tab', () => {
    async function switchToAdvice() {
      const user = userEvent.setup();
      renderActionsView();
      await user.click(screen.getByRole('tab', { name: /advice/i }));
    }

    it('shows advice items', async () => {
      await switchToAdvice();
      expect(await screen.findByText('Move $2K to high-yield savings')).toBeInTheDocument();
      expect(screen.getByText('Increase TSP contribution by 2%')).toBeInTheDocument();
    });

    it('shows advice count chip', async () => {
      await switchToAdvice();
      await waitFor(() => {
        expect(screen.getByText('3 items')).toBeInTheDocument();
      });
    });

    it('shows Accept and Dismiss buttons for Proposed advice', async () => {
      await switchToAdvice();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accept$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^dismiss$/i })).toBeInTheDocument();
      });
    });

    it('calls accept when Accept is clicked', async () => {
      const user = userEvent.setup();
      await switchToAdvice();
      const acceptBtn = await screen.findByRole('button', { name: /^accept$/i });
      await user.click(acceptBtn);

      await waitFor(() => {
        expect(mockAdviceAccept).toHaveBeenCalledWith(14);
      });
    });

    it('calls dismiss when Dismiss is clicked', async () => {
      const user = userEvent.setup();
      await switchToAdvice();
      const dismissBtn = await screen.findByRole('button', { name: /^dismiss$/i });
      await user.click(dismissBtn);

      await waitFor(() => {
        expect(mockAdviceDismiss).toHaveBeenCalledWith(14);
      });
    });

    it('shows linked task chip for Accepted advice', async () => {
      await switchToAdvice();
      await waitFor(() => {
        expect(screen.getByText('Task #10 created')).toBeInTheDocument();
      });
    });

    it('shows Dismissed chip for dismissed advice', async () => {
      await switchToAdvice();
      await waitFor(() => {
        const chips = screen.getAllByText('Dismissed');
        expect(chips.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows confidence scores', async () => {
      await switchToAdvice();
      await waitFor(() => {
        expect(screen.getByText('Confidence 88%')).toBeInTheDocument();
      });
    });

    it('shows empty state when no advice', async () => {
      mockAdviceGetForUser.mockResolvedValue({ data: [] });
      const user = userEvent.setup();
      renderActionsView();
      await user.click(screen.getByRole('tab', { name: /advice/i }));
      await waitFor(() => {
        expect(screen.getByText(/no advice generated yet/i)).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------ */
  /*  Tasks Tab                                                     */
  /* ------------------------------------------------------------ */
  describe('Tasks tab', () => {
    async function switchToTasks() {
      const user = userEvent.setup();
      renderActionsView();
      await user.click(screen.getByRole('tab', { name: /^tasks$/i }));
    }

    it('shows task summary chips', async () => {
      await switchToTasks();
      await waitFor(() => {
        expect(screen.getByText('3 total')).toBeInTheDocument();
        expect(screen.getByText('1 pending')).toBeInTheDocument();
      });
    });

    it('shows pending tasks by default', async () => {
      await switchToTasks();
      expect(await screen.findByText('Move emergency fund to HYSA')).toBeInTheDocument();
    });

    it('switches to In Progress tab', async () => {
      const user = userEvent.setup();
      await switchToTasks();
      await waitFor(() => expect(mockTaskGetByUser).toHaveBeenCalled());

      const inProgressTab = screen.getByRole('tab', { name: /in progress/i });
      await user.click(inProgressTab);

      await waitFor(() => {
        expect(screen.getByText('Rebalance TSP allocation')).toBeInTheDocument();
      });
    });

    it('completes a pending task', async () => {
      const user = userEvent.setup();
      await switchToTasks();
      await screen.findByText('Move emergency fund to HYSA');

      const checkButtons = screen.getAllByTestId('CheckCircleIcon');
      await user.click(checkButtons[0].closest('button')!);

      await waitFor(() => {
        expect(mockTaskMarkAsCompleted).toHaveBeenCalledWith(1, {
          completionNotes: 'Completed via Actions page',
        });
      });
    });

    it('opens and submits create task dialog', async () => {
      const user = userEvent.setup();
      await switchToTasks();
      await waitFor(() => expect(mockTaskGetByUser).toHaveBeenCalled());

      await user.click(screen.getByRole('button', { name: /new task/i }));
      expect(screen.getByText('Create New Task')).toBeInTheDocument();

      await user.type(screen.getByLabelText('Title'), 'Test task');
      await user.type(screen.getByLabelText('Description'), 'Test description');

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(mockTaskCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 20,
            title: 'Test task',
            description: 'Test description',
          }),
        );
      });
    }, 15000);

    it('shows empty state when no tasks', async () => {
      mockTaskGetByUser.mockResolvedValue({ data: [] });
      const user = userEvent.setup();
      renderActionsView();
      await user.click(screen.getByRole('tab', { name: /^tasks$/i }));
      await waitFor(() => {
        expect(screen.getByText(/no pending tasks/i)).toBeInTheDocument();
      });
    });

    it('shows New Task button', async () => {
      await switchToTasks();
      await waitFor(() => expect(mockTaskGetByUser).toHaveBeenCalled());
      expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
    });

    it('shows progress slider for in-progress tasks', async () => {
      const user = userEvent.setup();
      await switchToTasks();
      await waitFor(() => expect(mockTaskGetByUser).toHaveBeenCalled());

      // Switch to In Progress tab
      const inProgressTab = screen.getByRole('tab', { name: /in progress/i });
      await user.click(inProgressTab);

      await waitFor(() => {
        expect(screen.getByText('Rebalance TSP allocation')).toBeInTheDocument();
      });

      // Should have a slider (aria-label="Task progress")
      expect(screen.getByRole('slider', { name: /task progress/i })).toBeInTheDocument();
    });
  });
});
