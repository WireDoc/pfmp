import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QuickActionsBar } from '../../components/dashboard/QuickActionsBar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderWidget() {
  return render(
    <MemoryRouter>
      <QuickActionsBar />
    </MemoryRouter>,
  );
}

describe('QuickActionsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Quick Actions heading', () => {
    renderWidget();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders all 4 action buttons', () => {
    renderWidget();
    expect(screen.getByText('Run AI Analysis')).toBeInTheDocument();
    expect(screen.getByText('Add Account')).toBeInTheDocument();
    expect(screen.getByText('View Expenses')).toBeInTheDocument();
    expect(screen.getByText('Update TSP')).toBeInTheDocument();
  });

  it('navigates to insights on Run AI Analysis click', async () => {
    renderWidget();
    await userEvent.click(screen.getByText('Run AI Analysis'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/insights');
  });

  it('navigates to accounts on Add Account click', async () => {
    renderWidget();
    await userEvent.click(screen.getByText('Add Account'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/accounts');
  });

  it('navigates to profile expenses tab on View Expenses click', async () => {
    renderWidget();
    await userEvent.click(screen.getByText('View Expenses'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/profile?tab=expenses');
  });

  it('navigates to TSP on Update TSP click', async () => {
    renderWidget();
    await userEvent.click(screen.getByText('Update TSP'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/tsp');
  });

  it('has the quick-actions-bar test id', () => {
    renderWidget();
    expect(screen.getByTestId('quick-actions-bar')).toBeInTheDocument();
  });
});
