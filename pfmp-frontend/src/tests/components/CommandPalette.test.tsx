import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from '../../components/CommandPalette';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPalette() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <CommandPalette />
    </MemoryRouter>
  );
}

describe('CommandPalette', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens when Ctrl+K is pressed', () => {
    renderPalette();
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('closes when Escape is pressed', async () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    // MUI Dialog closes via transition — verify the input disappears
    await vi.waitFor(() => {
      expect(screen.queryByPlaceholderText('Type a command or search...')).not.toBeInTheDocument();
    });
  });

  it('shows all commands when no query is entered', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    // "Actions" appears as both category header and nav item
    expect(screen.getAllByText('Actions').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // "Accounts" appears as both nav item and action item
    expect(screen.getAllByText('Accounts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('filters commands based on search query', async () => {
    const user = userEvent.setup();
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByPlaceholderText('Type a command or search...');
    await user.type(input, 'tsp');

    expect(screen.getByText('Thrift Savings Plan')).toBeInTheDocument();
    expect(screen.getByText('Update TSP')).toBeInTheDocument();
    // Unrelated commands should be filtered out
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
  });

  it('shows no results message for unmatched query', async () => {
    const user = userEvent.setup();
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByPlaceholderText('Type a command or search...');
    await user.type(input, 'xyznonexistent');

    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it('navigates on click', async () => {
    const user = userEvent.setup();
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const insightsItem = screen.getByText('Insights');
    await user.click(insightsItem);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/insights');
  });

  it('navigates on Enter key', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByPlaceholderText('Type a command or search...');
    // First item is Dashboard — press Enter to select it
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('supports arrow key navigation', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByPlaceholderText('Type a command or search...');
    // Press down arrow to select second item (Accounts)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/accounts');
  });

  it('searches by keywords', async () => {
    const user = userEvent.setup();
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByPlaceholderText('Type a command or search...');
    await user.type(input, 'retirement');

    // TSP has 'retirement' keyword
    expect(screen.getByText('Thrift Savings Plan')).toBeInTheDocument();
  });

  it('displays category headers', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    // "Actions" category header + "Actions" nav item
    expect(screen.getAllByText('Actions').length).toBeGreaterThanOrEqual(2);
  });

  it('shows Esc chip in search field', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByText('Esc')).toBeInTheDocument();
  });
});
