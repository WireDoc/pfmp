import { getDevUserId } from '../dev/devUserState';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

export interface UserNote {
  userNoteId: number;
  entityType: string;
  entityId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserNoteRequest {
  userId: number;
  entityType: string;
  entityId: string;
  content: string;
  isPinned?: boolean;
}

export interface UpdateUserNoteRequest {
  content?: string;
  isPinned?: boolean;
}

export const userNotesService = {
  async getNotesForEntity(entityType: string, entityId: string): Promise<UserNote[]> {
    const userId = getDevUserId();
    const res = await fetch(`${API_BASE}/usernotes/entity/${entityType}/${entityId}?userId=${userId}`);
    if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
    return res.json();
  },

  async getAllUserNotes(): Promise<UserNote[]> {
    const userId = getDevUserId();
    const res = await fetch(`${API_BASE}/usernotes/user/${userId}`);
    if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
    return res.json();
  },

  async createNote(entityType: string, entityId: string, content: string, isPinned = false): Promise<UserNote> {
    const userId = getDevUserId();
    const res = await fetch(`${API_BASE}/usernotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, entityType, entityId, content, isPinned }),
    });
    if (!res.ok) throw new Error(`Failed to create note: ${res.status}`);
    return res.json();
  },

  async updateNote(noteId: number, request: UpdateUserNoteRequest): Promise<UserNote> {
    const res = await fetch(`${API_BASE}/usernotes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`Failed to update note: ${res.status}`);
    return res.json();
  },

  async deleteNote(noteId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/usernotes/${noteId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete note: ${res.status}`);
  },
};
