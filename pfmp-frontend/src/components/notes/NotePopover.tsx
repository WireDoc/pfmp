import { useState, useEffect } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import NoteIcon from '@mui/icons-material/StickyNote2';
import NoteOutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { userNotesService, type UserNote } from '../../services/userNotesApi';

interface NotePopoverProps {
  entityType: string;
  entityId: string;
}

export function NotePopover({ entityType, entityId }: NotePopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  const open = Boolean(anchorEl);
  const hasNotes = notes.length > 0;

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await userNotesService.getNotesForEntity(entityType, entityId);
      setNotes(data);
    } catch {
      // Silently fail on fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pre-fetch note count to show filled/outline icon
    userNotesService.getNotesForEntity(entityType, entityId)
      .then(setNotes)
      .catch(() => {});
  }, [entityType, entityId]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    fetchNotes();
  };

  const handleClose = () => {
    setAnchorEl(null);
    setNewContent('');
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const note = await userNotesService.createNote(entityType, entityId, newContent.trim());
      setNotes(prev => [note, ...prev]);
      setNewContent('');
    } catch {
      // Failed to save
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    try {
      await userNotesService.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.userNoteId !== noteId));
    } catch {
      // Failed to delete
    }
  };

  const handleTogglePin = async (note: UserNote) => {
    try {
      const updated = await userNotesService.updateNote(note.userNoteId, { isPinned: !note.isPinned });
      setNotes(prev =>
        prev.map(n => (n.userNoteId === updated.userNoteId ? updated : n))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch {
      // Failed to update
    }
  };

  return (
    <Box component="span" onClick={e => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
      <Tooltip title={hasNotes ? `${notes.length} note${notes.length !== 1 ? 's' : ''}` : 'Add note'}>
        <IconButton
          size="small"
          onClick={handleOpen}
          aria-label="Notes"
          sx={{ color: hasNotes ? 'primary.main' : 'text.secondary' }}
        >
          {hasNotes ? <NoteIcon fontSize="small" /> : <NoteOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 320, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>Notes</Typography>

          {/* Add note form */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Add a note..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
              multiline
              maxRows={3}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAdd}
              disabled={!newContent.trim() || saving}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {saving ? <CircularProgress size={16} /> : 'Add'}
            </Button>
          </Stack>

          {/* Notes list */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
              No notes yet
            </Typography>
          ) : (
            <Stack spacing={1}>
              {notes.map(note => (
                <Box
                  key={note.userNoteId}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    position: 'relative',
                  }}
                >
                  <Typography variant="body2" sx={{ pr: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {note.content}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Typography>
                    <Box>
                      {note.isPinned && <Chip label="Pinned" size="small" sx={{ mr: 0.5, height: 20 }} />}
                      <IconButton size="small" onClick={() => handleTogglePin(note)} aria-label="Toggle pin">
                        {note.isPinned ? <PushPinIcon sx={{ fontSize: 16 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(note.userNoteId)} aria-label="Delete note">
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Popover>
    </Box>
  );
}
