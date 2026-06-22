/**
 * Wave 24 — Chatbot API client. Talks to /api/chat on the backend.
 *
 * The streaming-message path bypasses axios because we need fetch's
 * ReadableStream to consume the SSE response token-by-token. All other
 * endpoints go through the shared apiClient.
 */
import apiClient from './api';

// ----- Types matching the C# DTOs in ChatController.cs / IChatService.cs -----

export interface ConversationListItem {
  conversationId: number;
  title: string | null;
  startedAt: string;     // ISO 8601
  lastMessageAt: string;
  archivedAt: string | null;
  messageCount: number;
  totalCost: number;
  totalTokensUsed: number;
}

export type ReasoningEffort = 'Minimal' | 'Low' | 'Medium' | 'High' | 'XHigh';

export interface ChatMessageDto {
  messageId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sentAt: string;
  modelUsed: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  cost: number | null;
  reasoningEffort: ReasoningEffort | null;
}

export interface ConversationDetail {
  conversationId: number;
  title: string | null;
  startedAt: string;
  lastMessageAt: string;
  archivedAt: string | null;
  conversationSummary: string | null;
  totalCost: number;
  totalTokensUsed: number;
  messageCount: number;
  messages: ChatMessageDto[];
}

export interface ChatCostSummary {
  monthToDateCost: number;
  monthToDateMessages: number;
  billingPeriodStart: string;
}

export interface ContextSnapshotInfo {
  snapshotDate: string;
  estimatedTokens: number;
  createdAt: string;
  updatedAt: string;
  hashPrefix: string;
  contentLength: number;
}

/** SSE event shapes from POST /chat/conversations/{id}/messages/stream */
export type ChatStreamEvent =
  | { type: 'delta'; delta: string; final: null }
  | { type: 'final'; delta: null; final: ChatStreamFinal }
  | { type: 'error'; delta: string; final: null };

export interface ChatStreamFinal {
  assistantMessageId: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  cost: number;
  modelUsed: string;
  reasoningEffortUsed: ReasoningEffort | null;
}

// ----- Conversation CRUD -----

export async function listConversations(userId: number, includeArchived = false): Promise<ConversationListItem[]> {
  const resp = await apiClient.get<ConversationListItem[]>('/chat/conversations', {
    params: { userId, includeArchived },
  });
  return resp.data;
}

export async function getConversation(conversationId: number, userId: number): Promise<ConversationDetail> {
  const resp = await apiClient.get<ConversationDetail>(`/chat/conversations/${conversationId}`, {
    params: { userId },
  });
  return resp.data;
}

export async function createConversation(userId: number, title?: string | null): Promise<ConversationDetail> {
  const resp = await apiClient.post<ConversationDetail>('/chat/conversations', { userId, title: title ?? null });
  return resp.data;
}

export async function renameConversation(conversationId: number, userId: number, title: string): Promise<void> {
  await apiClient.patch(`/chat/conversations/${conversationId}/title`, { userId, title });
}

export async function archiveConversation(conversationId: number, userId: number): Promise<void> {
  await apiClient.post(`/chat/conversations/${conversationId}/archive`, null, { params: { userId } });
}

export async function unarchiveConversation(conversationId: number, userId: number): Promise<void> {
  await apiClient.post(`/chat/conversations/${conversationId}/unarchive`, null, { params: { userId } });
}

// ----- Snapshot + cost -----

export async function getSnapshotInfo(userId: number): Promise<ContextSnapshotInfo> {
  const resp = await apiClient.get<ContextSnapshotInfo>('/chat/snapshot', { params: { userId } });
  return resp.data;
}

export async function rebuildSnapshot(userId: number): Promise<ContextSnapshotInfo> {
  const resp = await apiClient.post<ContextSnapshotInfo>('/chat/snapshot/rebuild', null, { params: { userId } });
  return resp.data;
}

export async function getMonthlyCost(userId: number): Promise<ChatCostSummary> {
  const resp = await apiClient.get<ChatCostSummary>('/chat/cost/monthly', { params: { userId } });
  return resp.data;
}

// ----- Streaming -----

/**
 * Streams the assistant's response. Calls `onDelta` for each text chunk and
 * `onFinal` exactly once with usage info. Throws on HTTP error.
 *
 * Uses fetch + ReadableStream so we can incrementally render. The backend
 * emits SSE: lines of `data: {json}\n\n` plus a trailing `data: [DONE]`.
 */
export async function streamChatMessage(opts: {
  conversationId: number;
  userId: number;
  message: string;
  deepThink: boolean;
  onDelta: (delta: string) => void;
  onFinal: (final: ChatStreamFinal) => void;
  onError?: (err: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5052/api';
  const url = `${base}/chat/conversations/${opts.conversationId}/messages/stream`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ userId: opts.userId, message: opts.message, deepThink: opts.deepThink }),
    signal: opts.signal,
  });

  if (!resp.ok || !resp.body) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Chat stream failed (${resp.status}): ${txt || resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by `\n\n`; split + keep trailing partial in buffer.
      let sepIdx = buffer.indexOf('\n\n');
      while (sepIdx !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        sepIdx = buffer.indexOf('\n\n');

        for (const line of rawEvent.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const event = JSON.parse(data) as ChatStreamEvent;
            if (event.type === 'delta' && event.delta) opts.onDelta(event.delta);
            else if (event.type === 'final' && event.final) opts.onFinal(event.final);
            else if (event.type === 'error' && event.delta) opts.onError?.(event.delta);
          } catch {
            // Skip malformed events — usually heartbeats or partial frames.
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
