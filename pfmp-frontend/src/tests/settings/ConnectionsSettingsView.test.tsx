import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConnectionsSettingsView } from '../../views/settings/ConnectionsSettingsView';
import type { PlaidConnection, ConnectionStatus } from '../../services/plaidApi';

// Mock the plaidApi service
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
];

vi.mock('../../services/plaidApi', () => ({
  getConnections: vi.fn().mockResolvedValue([]),
  syncAllConnections: vi.fn().mockResolvedValue({}),
  getStatusLabel: (status: string) => status,
  getStatusColor: (status: string) => 'success',
  formatSyncTime: (date: string) => 'Just now',
}));

// Mock Plaid components
vi.mock('../../components/plaid', () => ({
  PlaidLinkButton: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess} data-testid="plaid-link-button">Link Bank Account</button>
  ),
  ConnectedBanksList: ({ connections }: { connections: PlaidConnection[] }) => (
    <div data-testid="connected-banks-list">
      {connections.map((c) => (
        <div key={c.connectionId}>{c.institutionName}</div>
      ))}
    </div>
  ),
}));

// Mock devUserState
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: vi.fn(() => 1),
}));

function renderConnectionsSettingsView() {
  return render(
    <MemoryRouter>
      <ConnectionsSettingsView />
    </MemoryRouter>
  );
}

describe('ConnectionsSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout', () => {
    it('should render the page title', async () => {
      renderConnectionsSettingsView();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Connected Accounts' })).toBeInTheDocument();
      });
    });

    it('should render breadcrumb navigation', async () => {
      renderConnectionsSettingsView();
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should render Link Bank Account button', async () => {
      renderConnectionsSettingsView();
      await waitFor(() => {
        expect(screen.getByTestId('plaid-link-button')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton while loading', () => {
      renderConnectionsSettingsView();
      // Initially loading, should show skeleton
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no connections', async () => {
      const { getConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockResolvedValue([]);
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getByTestId('connected-banks-list')).toBeInTheDocument();
      });
    });
  });

  describe('With Connections', () => {
    it('should display connected banks', async () => {
      const { getConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockResolvedValue(mockConnections);
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getByText('First Platypus Bank')).toBeInTheDocument();
      });
    });

    it('should show Sync All button when connections exist', async () => {
      const { getConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockResolvedValue(mockConnections);
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync all/i })).toBeInTheDocument();
      });
    });
  });

  describe('Sync All', () => {
    it('should call syncAllConnections when clicking Sync All', async () => {
      const user = userEvent.setup();
      const { getConnections, syncAllConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockResolvedValue(mockConnections);
      vi.mocked(syncAllConnections).mockResolvedValue({});
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync all/i })).toBeInTheDocument();
      });
      
      const syncButton = screen.getByRole('button', { name: /sync all/i });
      await user.click(syncButton);
      
      await waitFor(() => {
        expect(syncAllConnections).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on load failure', async () => {
      const { getConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockRejectedValue(new Error('Network error'));
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load connected accounts/)).toBeInTheDocument();
      });
    });

    it('should show error message on sync failure', async () => {
      const user = userEvent.setup();
      const { getConnections, syncAllConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockResolvedValue(mockConnections);
      vi.mocked(syncAllConnections).mockRejectedValue(new Error('Sync failed'));
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync all/i })).toBeInTheDocument();
      });
      
      const syncButton = screen.getByRole('button', { name: /sync all/i });
      await user.click(syncButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to sync accounts/)).toBeInTheDocument();
      });
    });
  });

  describe('Link Success', () => {
    it('should refresh connections after linking a new bank', async () => {
      const user = userEvent.setup();
      const { getConnections } = await import('../../services/plaidApi');
      vi.mocked(getConnections).mockResolvedValue([]);
      
      renderConnectionsSettingsView();
      
      await waitFor(() => {
        expect(screen.getAllByTestId('plaid-link-button')).toHaveLength(2);
      });
      
      // Initial load
      expect(getConnections).toHaveBeenCalledTimes(1);
      
      // Simulate link success - use the first button (header)
      const linkButtons = screen.getAllByTestId('plaid-link-button');
      await user.click(linkButtons[0]);
      
      // Should refresh connections
      await waitFor(() => {
        expect(getConnections).toHaveBeenCalledTimes(2);
      });
    });
  });
});
