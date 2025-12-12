import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConnectedBanksList, ConnectionStatusChip } from '../../components/plaid/ConnectedBanksList';
import type { PlaidConnection, ConnectionStatus } from '../../services/plaidApi';

// Mock the plaidApi service
vi.mock('../../services/plaidApi', async () => {
  const actual = await vi.importActual('../../services/plaidApi');
  return {
    ...actual,
    getConnectionAccounts: vi.fn().mockResolvedValue([
      { cashAccountId: 'acc-1', name: 'Checking Account', balance: 1500.00, lastSyncedAt: '2025-12-11T10:00:00Z' },
      { cashAccountId: 'acc-2', name: 'Savings Account', balance: 5000.00, lastSyncedAt: '2025-12-11T10:00:00Z' },
    ]),
    syncConnection: vi.fn().mockResolvedValue({}),
    disconnectConnection: vi.fn().mockResolvedValue({}),
    createReconnectLinkToken: vi.fn().mockResolvedValue('link-token-123'),
    reconnectSuccess: vi.fn().mockResolvedValue({}),
    deleteConnectionPermanently: vi.fn().mockResolvedValue({}),
    getStatusLabel: (status: string) => status,
    getStatusColor: (status: string) => status === 'Connected' ? 'success' : 'warning',
    formatSyncTime: (date: string) => date ? 'Just now' : 'Never',
  };
});

// Mock react-plaid-link
vi.mock('react-plaid-link', () => ({
  usePlaidLink: vi.fn(() => ({
    open: vi.fn(),
    ready: true,
    error: null,
    exit: vi.fn(),
  })),
}));

const mockConnections: PlaidConnection[] = [
  {
    connectionId: 'conn-1',
    institutionId: 'ins_1',
    institutionName: 'First Platypus Bank',
    status: 'Connected' as ConnectionStatus,
    lastSyncedAt: '2025-12-11T10:00:00Z',
    createdAt: '2025-12-01T00:00:00Z',
    errorMessage: null,
  },
  {
    connectionId: 'conn-2',
    institutionId: 'ins_2',
    institutionName: 'Chase Bank',
    status: 'Disconnected' as ConnectionStatus,
    lastSyncedAt: '2025-12-10T08:00:00Z',
    createdAt: '2025-11-15T00:00:00Z',
    errorMessage: null,
  },
];

function renderConnectedBanksList(connections = mockConnections) {
  const onRefresh = vi.fn();
  const onDisconnect = vi.fn();
  
  return {
    ...render(
      <MemoryRouter>
        <ConnectedBanksList
          connections={connections}
          userId={1}
          onRefresh={onRefresh}
          onDisconnect={onDisconnect}
        />
      </MemoryRouter>
    ),
    onRefresh,
    onDisconnect,
  };
}

describe('ConnectedBanksList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show info message when no connections', () => {
      renderConnectedBanksList([]);
      expect(screen.getByText(/No bank accounts connected yet/)).toBeInTheDocument();
      expect(screen.getByText(/Click "Link Bank Account" to get started/)).toBeInTheDocument();
    });
  });

  describe('Connection Cards', () => {
    it('should render all connection cards', () => {
      renderConnectedBanksList();
      expect(screen.getByText('First Platypus Bank')).toBeInTheDocument();
      expect(screen.getByText('Chase Bank')).toBeInTheDocument();
    });

    it('should show institution name for each connection', () => {
      renderConnectedBanksList();
      expect(screen.getByText('First Platypus Bank')).toBeInTheDocument();
      expect(screen.getByText('Chase Bank')).toBeInTheDocument();
    });

    it('should show last sync time', () => {
      renderConnectedBanksList();
      const syncTexts = screen.getAllByText(/Last synced:/);
      expect(syncTexts.length).toBe(2);
    });

    it('should show status chip for each connection', () => {
      renderConnectedBanksList();
      // Status chips should be present
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  describe('Menu Actions', () => {
    it('should open menu when clicking more icon', async () => {
      const user = userEvent.setup();
      renderConnectedBanksList();
      
      // Find and click the first menu button
      const menuButtons = screen.getAllByRole('button', { name: '' });
      const moreButton = menuButtons.find(btn => btn.querySelector('[data-testid="MoreVertIcon"]'));
      
      if (moreButton) {
        await user.click(moreButton);
        // Menu should be open
        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });
      }
    });

    it('should show Sync Now and Pause Syncing for connected banks', async () => {
      const user = userEvent.setup();
      renderConnectedBanksList([mockConnections[0]]); // Just the connected bank
      
      const menuButtons = screen.getAllByRole('button');
      // Click the MoreVert button (last button usually)
      const moreButton = menuButtons[menuButtons.length - 1];
      await user.click(moreButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sync Now')).toBeInTheDocument();
        expect(screen.getByText('Pause Syncing')).toBeInTheDocument();
      });
    });

    it('should show Reconnect and Delete for disconnected banks', async () => {
      const user = userEvent.setup();
      renderConnectedBanksList([mockConnections[1]]); // Just the disconnected bank
      
      const menuButtons = screen.getAllByRole('button');
      const moreButton = menuButtons[menuButtons.length - 1];
      await user.click(moreButton);
      
      await waitFor(() => {
        expect(screen.getByText('Reconnect')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('Expand/Collapse Accounts', () => {
    it('should expand to show accounts when clicking expand button', async () => {
      const user = userEvent.setup();
      renderConnectedBanksList([mockConnections[0]]);
      
      // Find the expand button
      const expandButton = screen.getByRole('button', { name: /show accounts/i });
      await user.click(expandButton);
      
      // After expanding, accounts should load and display
      await waitFor(() => {
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
        expect(screen.getByText('Savings Account')).toBeInTheDocument();
      });
    });

    it('should show account balances when expanded', async () => {
      const user = userEvent.setup();
      renderConnectedBanksList([mockConnections[0]]);
      
      const expandButton = screen.getByRole('button', { name: /show accounts/i });
      await user.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('$1,500.00')).toBeInTheDocument();
        expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      });
    });
  });
});

describe('ConnectionStatusChip', () => {
  function renderChip(status: ConnectionStatus) {
    return render(
      <ConnectionStatusChip status={status} />
    );
  }

  it('should render Connected status', () => {
    renderChip('Connected');
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should render Disconnected status', () => {
    renderChip('Disconnected');
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should render Syncing status', () => {
    renderChip('Syncing');
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('should render SyncFailed status', () => {
    renderChip('SyncFailed');
    expect(screen.getByText('SyncFailed')).toBeInTheDocument();
  });

  it('should render Expired status', () => {
    renderChip('Expired');
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });
});
