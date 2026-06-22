import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddCommentIcon from '@mui/icons-material/AddComment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDevUserId } from '../../dev/devUserState';
import {
  listConversations,
  getConversation,
  createConversation,
  renameConversation,
  archiveConversation,
  rebuildSnapshot,
  getSnapshotInfo,
  getMonthlyCost,
  streamChatMessage,
  type ConversationListItem,
  type ConversationDetail,
  type ChatMessageDto,
  type ContextSnapshotInfo,
  type ChatCostSummary,
} from '../../services/chatApi';
import { formatRelative, formatAbsolute } from '../../utils/relativeTime';

/**
 * Wave 24 — AI Chatbot with Memory. /dashboard/chat[/:id]
 * Left rail: conversation list + new chat. Main pane: streaming thread + composer.
 * The model has full visibility into the user's profile (loaded once daily as a
 * cacheable snapshot) and can web-search via OpenRouter's grounding plugin.
 */
export function ChatView() {
  const navigate = useNavigate();
  const params = useParams<{ conversationId?: string }>();
  const userId = useDevUserId() ?? 1;
  const selectedId = params.conversationId ? Number(params.conversationId) : null;

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [active, setActive] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingActive, setLoadingActive] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingDraft, setStreamingDraft] = useState<string>('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [deepThink, setDeepThink] = useState(false);
  const [snapshotInfo, setSnapshotInfo] = useState<ContextSnapshotInfo | null>(null);
  const [monthlyCost, setMonthlyCost] = useState<ChatCostSummary | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // ----- Loaders -----

  const refreshConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listConversations(userId, false);
      setConversations(list);
    } finally {
      setLoadingList(false);
    }
  }, [userId]);

  const loadConversation = useCallback(async (id: number) => {
    setLoadingActive(true);
    try {
      const detail = await getConversation(id, userId);
      setActive(detail);
    } catch {
      setActive(null);
    } finally {
      setLoadingActive(false);
    }
  }, [userId]);

  const refreshSnapshotAndCost = useCallback(async () => {
    try {
      const [info, cost] = await Promise.all([getSnapshotInfo(userId), getMonthlyCost(userId)]);
      setSnapshotInfo(info);
      setMonthlyCost(cost);
    } catch {
      // non-fatal
    }
  }, [userId]);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);
  useEffect(() => { void refreshSnapshotAndCost(); }, [refreshSnapshotAndCost]);
  useEffect(() => {
    if (selectedId != null) void loadConversation(selectedId);
    else setActive(null);
  }, [selectedId, loadConversation]);

  // Autoscroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages, streamingDraft]);

  // ----- Actions -----

  const handleNewConversation = async () => {
    const created = await createConversation(userId, null);
    await refreshConversations();
    navigate(`/dashboard/chat/${created.conversationId}`);
  };

  const handleArchive = async (id: number) => {
    await archiveConversation(id, userId);
    await refreshConversations();
    if (selectedId === id) navigate('/dashboard/chat');
  };

  const handleRename = async (id: number, current: string | null) => {
    const next = window.prompt('Rename conversation', current ?? '');
    if (next == null) return;
    await renameConversation(id, userId, next);
    await refreshConversations();
    if (selectedId === id) await loadConversation(id);
  };

  const handleRebuildSnapshot = async () => {
    const info = await rebuildSnapshot(userId);
    setSnapshotInfo(info);
  };

  const handleSend = async () => {
    if (!composerText.trim() || isStreaming) return;
    const message = composerText.trim();

    // If no active conversation, spin one up first.
    let convId = selectedId;
    if (convId == null) {
      const created = await createConversation(userId, null);
      convId = created.conversationId;
      navigate(`/dashboard/chat/${convId}`);
      // Optimistically attach so the streaming view has somewhere to render.
      setActive(created);
    }

    setComposerText('');
    setIsStreaming(true);
    setStreamingDraft('');
    setStreamError(null);

    // Optimistically render the user's turn so they see it immediately.
    const optimistic: ChatMessageDto = {
      messageId: -Date.now(), // temp negative id so React keys stay unique
      role: 'user',
      content: message,
      sentAt: new Date().toISOString(),
      modelUsed: null,
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
      cost: null,
      reasoningEffort: null,
    };
    setActive(prev => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);

    try {
      await streamChatMessage({
        conversationId: convId!,
        userId,
        message,
        deepThink,
        onDelta: (delta) => setStreamingDraft(prev => prev + delta),
        onFinal: () => { /* persistence happens server-side; reload refreshes ids/costs below */ },
        onError: (err) => setStreamError(err),
      });
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
    }

    // Refresh from DB so we have the real persisted ids/costs.
    if (convId != null) await loadConversation(convId);
    setStreamingDraft('');
    await refreshConversations();
    await refreshSnapshotAndCost();

    // Mark deep-think as one-shot — reset after each message so cost doesn't surprise.
    if (deepThink) setDeepThink(false);
  };

  const handleComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ----- Layout -----

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: 480 }}>
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedId}
        loading={loadingList}
        snapshotInfo={snapshotInfo}
        monthlyCost={monthlyCost}
        onNew={handleNewConversation}
        onSelect={(id) => navigate(`/dashboard/chat/${id}`)}
        onArchive={handleArchive}
        onRename={handleRename}
        onRebuildSnapshot={handleRebuildSnapshot}
      />

      {/* Main thread + composer */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedId == null ? (
          <EmptyState onNew={handleNewConversation} />
        ) : loadingActive ? (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : active == null ? (
          <Alert severity="error" sx={{ m: 2 }}>Conversation not found.</Alert>
        ) : (
          <>
            <ThreadHeader
              detail={active}
              anchor={menuAnchor}
              onMenu={(e) => setMenuAnchor(e.currentTarget)}
              onCloseMenu={() => setMenuAnchor(null)}
              onRename={() => { setMenuAnchor(null); void handleRename(active.conversationId, active.title); }}
              onArchive={() => { setMenuAnchor(null); void handleArchive(active.conversationId); }}
            />
            <Divider />

            <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              <Stack spacing={2}>
                {active.messages.map(m => <MessageBubble key={m.messageId} message={m} />)}
                {isStreaming && streamingDraft && (
                  <MessageBubble
                    streaming
                    message={{
                      messageId: -1,
                      role: 'assistant',
                      content: streamingDraft,
                      sentAt: new Date().toISOString(),
                      modelUsed: null,
                      inputTokens: null,
                      outputTokens: null,
                      cachedTokens: null,
                      cost: null,
                      reasoningEffort: null,
                    }}
                  />
                )}
                {streamError && <Alert severity="error" variant="outlined">{streamError}</Alert>}
              </Stack>
            </Box>

            <Divider />
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  inputRef={composerRef}
                  multiline
                  maxRows={8}
                  minRows={1}
                  fullWidth
                  placeholder="Ask anything about your portfolio, strategy, or finances…"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={handleComposerKey}
                  disabled={isStreaming}
                />
                <Tooltip title={
                  deepThink
                    ? 'Deep think on — uses High reasoning effort for the next message (~2-3× the cost of a normal message). Auto-resets after each turn.'
                    : 'Deep think — enable High reasoning effort for the next message. Reserve for genuinely complex strategy questions.'
                }>
                  <FormControlLabel
                    sx={{ ml: 0, mr: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={deepThink}
                        onChange={(_e, v) => setDeepThink(v)}
                        disabled={isStreaming}
                      />
                    }
                    label={<Stack direction="row" alignItems="center" spacing={0.5}><PsychologyIcon fontSize="small" /><span>Deep</span></Stack>}
                  />
                </Tooltip>
                <IconButton color="primary" onClick={handleSend} disabled={isStreaming || !composerText.trim()}>
                  {isStreaming ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                Press Enter to send · Shift+Enter for newline · Your full profile + holdings + news digest are sent as the prompt prefix (cached for ~90% off after the first request of the day).
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

// ===== Sub-components =====

interface SidebarProps {
  conversations: ConversationListItem[];
  selectedId: number | null;
  loading: boolean;
  snapshotInfo: ContextSnapshotInfo | null;
  monthlyCost: ChatCostSummary | null;
  onNew: () => void;
  onSelect: (id: number) => void;
  onArchive: (id: number) => void;
  onRename: (id: number, current: string | null) => void;
  onRebuildSnapshot: () => void;
}

function ConversationSidebar(props: SidebarProps) {
  const { conversations, selectedId, loading, snapshotInfo, monthlyCost, onNew, onSelect, onArchive, onRename, onRebuildSnapshot } = props;
  return (
    <Paper
      square
      sx={{ width: 290, display: 'flex', flexDirection: 'column', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
    >
      <Box sx={{ p: 1.5 }}>
        <Button fullWidth variant="contained" startIcon={<AddCommentIcon />} onClick={onNew}>
          New chat
        </Button>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 2, display: 'grid', placeItems: 'center' }}><CircularProgress size={20} /></Box>
        ) : conversations.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
            No conversations yet. Click <strong>New chat</strong> to start one.
          </Typography>
        ) : (
          <List dense disablePadding>
            {conversations.map(c => (
              <ConversationRow
                key={c.conversationId}
                conv={c}
                selected={selectedId === c.conversationId}
                onSelect={() => onSelect(c.conversationId)}
                onArchive={() => onArchive(c.conversationId)}
                onRename={() => onRename(c.conversationId, c.title)}
              />
            ))}
          </List>
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 1.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="caption" color="text.secondary">Today's snapshot</Typography>
          <Tooltip title="Rebuild today's context snapshot from current data (use after editing your profile).">
            <IconButton size="small" onClick={onRebuildSnapshot}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        {snapshotInfo ? (
          <Tooltip title={`Hash ${snapshotInfo.hashPrefix} · ${snapshotInfo.contentLength.toLocaleString()} chars · Updated ${formatAbsolute(snapshotInfo.updatedAt)}`}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', cursor: 'help' }}>
              ~{snapshotInfo.estimatedTokens.toLocaleString()} tokens · {formatRelative(snapshotInfo.updatedAt)}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="caption" color="text.secondary">—</Typography>
        )}
        {monthlyCost && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            This month: <strong>${monthlyCost.monthToDateCost.toFixed(2)}</strong> across {monthlyCost.monthToDateMessages} responses
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

interface ConvRowProps {
  conv: ConversationListItem;
  selected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onRename: () => void;
}

function ConversationRow({ conv, selected, onSelect, onArchive, onRename }: ConvRowProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <ListItemButton selected={selected} onClick={onSelect} sx={{ pr: 0.5 }}>
      <ListItemText
        primary={conv.title ?? 'Untitled chat'}
        primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
        secondary={
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ overflow: 'hidden' }}>
            <Typography component="span" variant="caption" color="text.secondary" noWrap>
              {formatRelative(conv.lastMessageAt)}
            </Typography>
            {conv.totalCost > 0 && (
              <Chip
                size="small"
                label={`$${conv.totalCost.toFixed(3)}`}
                sx={{ height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
              />
            )}
          </Stack>
        }
        secondaryTypographyProps={{ component: 'div' }}
      />
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onRename(); }}>Rename</MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onArchive(); }}>Archive</MenuItem>
      </Menu>
    </ListItemButton>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Stack spacing={2} alignItems="center" maxWidth={520}>
        <Typography variant="h5">Ask your AI financial advisor</Typography>
        <Typography variant="body2" color="text.secondary">
          The model has your full profile loaded — holdings, accounts, TSP, taxes, federal benefits, plus
          today's news digest. Try questions like:
        </Typography>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-start', textAlign: 'left', fontStyle: 'italic', color: 'text.secondary' }}>
          <span>“Does my portfolio have adequate exposure to semiconductors?”</span>
          <span>“What's a good ETF for commodity exposure given my risk profile?”</span>
          <span>“Walk me through the trade-offs of converting some TSP to Roth this year.”</span>
        </Stack>
        <Button variant="contained" startIcon={<AddCommentIcon />} onClick={onNew}>
          Start a chat
        </Button>
      </Stack>
    </Box>
  );
}

interface ThreadHeaderProps {
  detail: ConversationDetail;
  anchor: HTMLElement | null;
  onMenu: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCloseMenu: () => void;
  onRename: () => void;
  onArchive: () => void;
}

function ThreadHeader({ detail, anchor, onMenu, onCloseMenu, onRename, onArchive }: ThreadHeaderProps) {
  return (
    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
      <Box>
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{detail.title ?? 'Untitled chat'}</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Started {formatRelative(detail.startedAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <Typography variant="caption" color="text.secondary">
            {detail.messageCount} messages
          </Typography>
          {detail.totalCost > 0 && (
            <>
              <Typography variant="caption" color="text.secondary">·</Typography>
              <Typography variant="caption" color="text.secondary">
                ${detail.totalCost.toFixed(3)} · {detail.totalTokensUsed.toLocaleString()} tokens
              </Typography>
            </>
          )}
        </Stack>
      </Box>
      <IconButton size="small" onClick={onMenu}>
        <MoreVertIcon />
      </IconButton>
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={onCloseMenu}>
        <MenuItem onClick={onRename}>Rename conversation</MenuItem>
        <MenuItem onClick={onArchive}>Archive conversation</MenuItem>
      </Menu>
    </Box>
  );
}

interface BubbleProps {
  message: ChatMessageDto;
  streaming?: boolean;
}

function MessageBubble({ message, streaming = false }: BubbleProps) {
  const isUser = message.role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Paper
        elevation={0}
        variant={isUser ? 'outlined' : 'elevation'}
        sx={{
          maxWidth: '85%',
          p: 1.5,
          bgcolor: isUser ? 'transparent' : 'action.hover',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="body2"
          component="div"
          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, '& strong': { fontWeight: 600 } }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
        {streaming && <Typography component="span" variant="caption" color="text.secondary">▍</Typography>}
        {!streaming && message.role === 'assistant' && (
          <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} useFlexGap flexWrap="wrap">
            <Tooltip title={`Model: ${message.modelUsed ?? 'unknown'}`}>
              <Typography variant="caption" color="text.secondary">
                {formatRelative(message.sentAt)}
              </Typography>
            </Tooltip>
            {message.cost != null && message.cost > 0 && (
              <Tooltip title={`Input: ${message.inputTokens ?? '?'} · Output: ${message.outputTokens ?? '?'} · Cached: ${message.cachedTokens ?? 0}`}>
                <Typography variant="caption" color="text.secondary">· ${message.cost.toFixed(4)}</Typography>
              </Tooltip>
            )}
            {message.reasoningEffort && message.reasoningEffort !== 'Medium' && (
              <Chip size="small" label={message.reasoningEffort} sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.75 } }} />
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

/**
 * Minimal inline markdown → HTML conversion. Handles **bold**, *italic*,
 * `inline code`, and headings (#, ##, ###). Everything else stays as text.
 * We escape HTML first so user/AI content can't inject markup.
 */
function renderMarkdown(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/^### (.+)$/gm, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="font-size:1.05em">$1</strong>')
    .replace(/^# (.+)$/gm, '<strong style="font-size:1.1em">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*(?!\s)(.+?)(?<!\s)\*(?=\s|$|[.,!?;:])/g, '$1<em>$2</em>')
    .replace(/`([^`]+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
}
