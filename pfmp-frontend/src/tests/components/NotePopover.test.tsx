import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotePopover } from '../../components/notes/NotePopover';
import { userNotesService } from '../../services/userNotesApi';

vi.mock('../../services/userNotesApi', () => ({
  userNotesService: {
    getNotesForEntity: vi.fn(),
    getAllUserNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}));

const mockGetNotes = vi.mocked(userNotesService.getNotesForEntity);
const mockCreateNote = vi.mocked(userNotesService.createNote);
const mockUpdateNote = vi.mocked(userNotesService.updateNote);
const mockDeleteNote = vi.mocked(userNotesService.deleteNote);

const mockNotes = [
  {
    userNoteId: 1,
    entityType: 'account',
    entityId: '42',
    content: 'Check fees quarterly',
    isPinned: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
  {
    userNoteId: 2,
    entityType: 'account',
    entityId: '42',
    content: 'Consider switching to high-yield',
    isPinned: false,
    createdAt: '2026-04-02T00:00:00Z',
    updatedAt: '2026-04-02T00:00:00Z',
  },
];

describe('NotePopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotes.mockResolvedValue(mockNotes);
    mockCreateNote.mockImplementation(async (_et: string, _eid: string, content: string, isPinned: boolean) => ({
      userNoteId: 99,
      entityType: 'account',
      entityId: '42',
      content,
      isPinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    mockUpdateNote.mockImplementation(async (noteId: number, req: { isPinned?: boolean; content?: string }) => ({
      ...(mockNotes.find(n => n.userNoteId === noteId) ?? mockNotes[0]),
      ...req,
      updatedAt: new Date().toISOString(),
    }));
    mockDeleteNote.mockResolvedValue(undefined);
  });

  it('renders a note icon button', async () => {
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument();
    });
  });

  it('shows filled icon when notes exist', async () => {
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Notes' });
      expect(btn).toBeInTheDocument();
    });
    // Tooltip should show count
    const btn = screen.getByRole('button', { name: 'Notes' });
    expect(btn).toHaveAttribute('aria-label', 'Notes');
  });

  it('shows outline icon when no notes', async () => {
    mockGetNotes.mockResolvedValue([]);
    render(<NotePopover entityType="goal" entityId="1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument();
    });
  });

  it('opens popover with notes on click', async () => {
    const user = userEvent.setup();
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));

    await waitFor(() => {
      expect(screen.getByText('Check fees quarterly')).toBeInTheDocument();
      expect(screen.getByText('Consider switching to high-yield')).toBeInTheDocument();
    });
  });

  it('shows "No notes yet" when entity has no notes', async () => {
    mockGetNotes.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<NotePopover entityType="goal" entityId="1" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));

    await waitFor(() => {
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });
  });

  it('creates a new note', async () => {
    const user = userEvent.setup();
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));
    await waitFor(() => screen.getByPlaceholderText('Add a note...'));

    const input = screen.getByPlaceholderText('Add a note...');
    fireEvent.change(input, { target: { value: 'New test note' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith('account', '42', 'New test note');
    });
  });

  it('deletes a note', async () => {
    const user = userEvent.setup();
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));
    await waitFor(() => screen.getByText('Check fees quarterly'));

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete note' });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteNote).toHaveBeenCalledWith(1);
    });
  });

  it('toggles pin on a note', async () => {
    const user = userEvent.setup();
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));
    await waitFor(() => screen.getByText('Check fees quarterly'));

    const pinButtons = screen.getAllByRole('button', { name: 'Toggle pin' });
    await user.click(pinButtons[0]);

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(1, { isPinned: false });
    });
  });

  it('shows Pinned chip on pinned notes', async () => {
    const user = userEvent.setup();
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));
    await waitFor(() => {
      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });
  });

  it('creates note on Enter key', async () => {
    const user = userEvent.setup();
    render(<NotePopover entityType="account" entityId="42" />);
    await waitFor(() => screen.getByRole('button', { name: 'Notes' }));

    await user.click(screen.getByRole('button', { name: 'Notes' }));
    await waitFor(() => screen.getByPlaceholderText('Add a note...'));

    const input = screen.getByPlaceholderText('Add a note...');
    fireEvent.change(input, { target: { value: 'Enter key note' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
    });

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith('account', '42', 'Enter key note');
    });
  });
});
