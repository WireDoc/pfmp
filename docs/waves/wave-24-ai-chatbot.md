# Wave 24 — AI Chatbot with Memory

**Status:** ✅ v1 complete — shipped 2026-06-22
**Owner:** Solo project; user is sole customer
**Predecessors:** Wave 22 Phase F (`Chat` slot wired in DI + `AIPromptMode.Chat` routing), Wave 23 (news digest folded into the cacheable context)
**Successors potentially unblocked:** Chat → Advice conversion flow; per-message reasoning trace UI; tool-calling for portfolio actions

---

## Why this wave exists

Wave 22 Phase F wired the `Chat` model slot through `OpenRouterService`, but no UI ever consumed it. The Wave 7 `AIConversation` + `AIMessage` tables were built for a future chat product that never landed — `AIIntelligenceService.GetChatResponseAsync` exists but uses the dual-AI consensus flow (too expensive, no streaming, no thread sidebar).

The user wants a real interactive AI financial advisor — the same persona as the analysis engine, but conversational, with memory across turns, full visibility into their portfolio, and web access for "look up the current price of X" or "what did the Fed say yesterday" follow-ups.

---

## Architectural decisions (locked in chat)

| # | Decision | Choice |
| - | -------- | ------ |
| 1 | Web search | **A — Native via OpenRouter `web` plugin** (no SerpAPI wiring) |
| 2 | Threading | **B — Multiple named conversations** with sidebar |
| 3 | Caching | **C — Hybrid**: daily snapshot for profile/strategy/notes, live values appended per-request |
| 4 | Context depth | **A — Everything**: full profile + holdings + notes + alerts/advice + today's news digest |
| 5 | Model | **`google/gemini-3.1-pro-preview`** (Gemini 3.1 Pro w/ grounding — newest Pro tier, native web search, strong reasoning) |
| 6 | Reasoning effort | **A — Default Medium**, per-message "Deep think" toggle bumps to High |
| 7 | Long conversations | Hard cap at last 80 turns for v1; auto-summarize deferred to v1.1 |
| 8 | Streaming | **B — SSE token-by-token** via `fetch` + `ReadableStream` |
| 9 | Persistence | **A — Relational** (reuse Wave 7 `AIConversation` + `AIMessage` tables, extended) |
| 10 | Cost surfacing | **C — Both** per-conversation chip + monthly summary in sidebar |

Hard guardrail: monthly per-user chat spend cap (default $20, configurable via `AI:OpenRouter:Chat:MonthlyCapUsd`). When exceeded, the stream endpoint returns an `error` event and refuses the turn until the cap is raised or the month rolls over.

---

## Schema changes — `Wave24_ChatbotEnhancements`

Reused the Wave 7 tables rather than building parallel ones:

**AIConversations** (additions):
- `Title` (varchar 200, nullable) — auto-set from first user message; user can rename
- `ArchivedAt` (timestamptz, nullable) — soft-delete for "browse archived" later
- `LastMessageAt` (timestamptz, NOT NULL) — sort key for sidebar
- `ConversationSummary`: dropped the `MaxLength(1000)` cap → `text` (for future auto-summarize)

**AIMessages** (additions):
- `Content`: dropped `MaxLength(5000)` → `text` (assistant turns can exceed 5k chars)
- `InputTokens`, `OutputTokens`, `CachedTokens` (int, nullable) — granular cost breakdown
- `ReasoningEffort` (int enum, nullable) — audit which messages used Deep think

**UserContextSnapshots** (new):
- One row per `(UserId, SnapshotDate)` — unique index
- `Content` (text) — verbatim cacheable prompt prefix
- `ContentHash` (varchar 64) — SHA-256 of content; lets force-rebuild skip the write when nothing changed
- `EstimatedTokens` (int) — ~chars/4 rule of thumb, surfaced in the sidebar

---

## Backend layout

```
PFMP-API/
├── Models/
│   ├── AIConversation.cs              ← extended
│   ├── AIMessage.cs                   ← extended
│   └── AI/UserContextSnapshot.cs      ← new
├── Services/AI/Chat/
│   ├── IUserContextSnapshotService.cs ← new
│   ├── UserContextSnapshotService.cs  ← new
│   ├── IChatService.cs                ← new (interfaces + DTOs)
│   └── ChatService.cs                 ← new (orchestrator + SSE stream)
└── Controllers/
    └── ChatController.cs              ← new
```

### `UserContextSnapshotService`

`GetOrCreateTodaySnapshotAsync(userId)` — fast path: returns today's row if it exists. Slow path: calls `IAIIntelligenceService.BuildCacheableContextAsync(userId)` (full profile + memory + market context + active alerts/advice — same builder the analysis prompt uses), hashes it, persists, returns. ~5k tokens / ~20k chars for the dev user.

`ForceRebuildAsync(userId)` — recomputes and only writes back to the DB if the hash differs. Keeps the provider cache hot when nothing actually changed.

### `ChatService.StreamMessageAsync`

The hot path. Per-turn flow:

1. **Cap check** — `GetMonthlyCostAsync` → if MTD ≥ `Chat:MonthlyCapUsd`, emit `error` and return.
2. **Persist user turn** — saved first so it stays visible if the model call fails.
3. **Auto-title** — first user message sets `Title` (truncated at word boundary, ~60 chars).
4. **Resolve slot config** — `IAIModelResolver.ResolveAsync(AIModelSlot.Chat)` (Wave 22 plumbing).
5. **Load snapshot** — `GetOrCreateTodaySnapshotAsync` returns the cacheable prefix bytes.
6. **Load history** — last 80 messages, oldest-first.
7. **Build payload** — `[system, user(snapshot), assistant("Got it…"), …history, user(current)]` + `stream:true`, `usage:{include:true}`, `plugins:[{id:"web",max_results:5}]`, `reasoning.effort` = `high` if Deep think else slot default or `medium`.
8. **Stream consume** — `HttpClient.SendAsync(…, ResponseHeadersRead)` → read lines, parse SSE `data:` chunks, yield `delta` events.
9. **Persist assistant turn** — full text + token breakdown + cached tokens (from `usage.prompt_tokens_details.cached_tokens`) + dollar cost (from `usage.cost`).
10. **Update conversation rollups** — `MessageCount`, `LastMessageAt`, `TotalCost`, `TotalTokensUsed`.
11. **Emit `final`** — assistant message id + usage summary.

### `ChatController` endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/api/chat/conversations` | List user's conversations (sorted by `LastMessageAt`) |
| GET    | `/api/chat/conversations/{id}` | Conversation detail + messages |
| POST   | `/api/chat/conversations` | Create new conversation |
| PATCH  | `/api/chat/conversations/{id}/title` | Rename |
| POST   | `/api/chat/conversations/{id}/archive` | Soft-delete from active list |
| POST   | `/api/chat/conversations/{id}/unarchive` | Restore |
| POST   | `/api/chat/conversations/{id}/messages/stream` | **SSE stream** the assistant's response |
| GET    | `/api/chat/snapshot` | Today's snapshot metadata |
| POST   | `/api/chat/snapshot/rebuild` | Force-rebuild today's snapshot |
| GET    | `/api/chat/cost/monthly` | Month-to-date cost + message count |

SSE response wraps the service's `ChatStreamEvent` records as `data: {json}\n\n`, terminated with `data: [DONE]\n\n`.

---

## Frontend layout

```
pfmp-frontend/src/
├── services/
│   └── chatApi.ts          ← REST client + streamChatMessage (fetch + ReadableStream)
├── views/dashboard/
│   └── ChatView.tsx        ← /dashboard/chat[/:conversationId]
├── layout/
│   └── DashboardNav.tsx    ← added "Chat" sidebar item
└── AppRouter.tsx           ← lazy-load route registered
```

### `ChatView`

Two-pane layout. **Left rail** (290px): "New chat" button, conversation list (each row shows title + relative-time + per-conversation cost chip), and a footer with today's snapshot info (tokens + relative update time, rebuild button) plus MTD cost. **Main pane**: header (title + started-at + total cost menu), scrolling message list (user/assistant bubbles with `dangerouslySetInnerHTML` from a tiny inline markdown renderer — `**bold**`, `*italic*`, `` `code` ``, and `#/##/###` headings — all HTML-escaped first), and a composer with multi-line `TextField`, "Deep think" toggle, and send button.

Streaming: `fetch` returns a `ReadableStream`; the consumer splits on `\n\n`, parses each `data: ` line, and routes to `onDelta` / `onFinal` / `onError`. The view buffers `streamingDraft` and renders a "streaming bubble" with a cursor caret; on `final`, the DB is re-queried so the bubble is replaced by the persisted message with accurate ids/costs.

UX details:
- Deep think auto-resets after each turn so cost doesn't surprise.
- Enter sends; Shift+Enter newlines.
- Empty state shows three example questions the user can copy-paste.
- Composer caption explains the "cached for ~90% off after the first request of the day" mechanic.

---

## Cost model

Typical message (with cache warm):
- Input: snapshot (~5k tokens, cached ~90% off) + history (~3-10k uncached) + current message (~100) → ~$0.005-0.015
- Output: 600-1200 tokens → ~$0.003-0.006
- **Per message: ~$0.01-0.02**

Deep think bumps reasoning to High → ~2-3× cost (~$0.03-0.06 per message).

First message of the day (cache cold): snapshot is uncached → ~$0.02-0.04. Subsequent messages within ~5 min keep the cache warm; after that the TTL expires and the next message pays the cold price once more.

**Monthly cap default: $20** — accommodates ~1,000-2,000 typical messages or ~200-400 Deep-think messages. Configurable per-install.

---

## What's deliberately deferred

| Item | Why deferred | Likely next wave |
| ---- | ------------ | ---------------- |
| Auto-summarize long threads | Hard cap at 80 turns covers >99% of v1 use; summary path needs careful testing | Wave 24.5 |
| Tool-calling for portfolio actions ("rebalance my TSP by 5% to C-fund") | Requires write-side safety review; v1 is read/discuss only | Wave 25 |
| Chat → Advice conversion | UX needs design (which turn becomes an Advice card? auto-detect?) | Wave 24.5 |
| Per-message reasoning trace UI | Gemini Pro doesn't surface reasoning text via OpenRouter today | Provider-dependent |
| Per-conversation snapshot override | Conversation can pin to yesterday's snapshot for "what if I time-travel" questions | Future |
| Markdown library (`react-markdown` + GFM) | Inline regex covers the 4 patterns the model actually uses; saves a dep for v1 | Polish wave |

---

## Smoke-test results (2026-06-22)

- `POST /api/chat/conversations` (user 20) → 201, conversation id 1, empty messages array ✅
- `GET /api/chat/snapshot?userId=20` → 200, 4,918 estimated tokens, 19,674 char snapshot built and persisted ✅
- `GET /api/chat/cost/monthly?userId=20` → $0.00 MTD, 0 messages ✅
- `GET /api/chat/conversations?userId=20` → list includes the new conversation ✅

Live SSE stream + end-to-end model call deferred to user-driven testing — no API key in the dev `appsettings.json` and the user manages OpenRouter spend.
