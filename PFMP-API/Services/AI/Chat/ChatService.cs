using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PFMP_API.Models;

namespace PFMP_API.Services.AI.Chat;

public class ChatService : IChatService
{
    private readonly ApplicationDbContext _db;
    private readonly IUserContextSnapshotService _snapshots;
    private readonly IAIModelResolver _resolver;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenRouterOptions _options;
    private readonly ILogger<ChatService> _logger;

    private const int MaxHistoryTurns = 80;
    private const string ChatSystemPrompt =
        "You are PFMP, the user's personal financial advisor and investment strategist. You have full visibility " +
        "into the user's portfolio, accounts, holdings, retirement plan, tax situation, federal-employment benefits, " +
        "and notes via the context block above. Carry conversation across turns and reference prior topics naturally.\n\n" +
        "Speak as a trusted advisor: confident, specific, numeric where it helps, but plain-language. Push back " +
        "on bad ideas with reasons; don't hedge into uselessness. Reference the user's actual holdings, balances, " +
        "and prior decisions when relevant — they are right there in your context.\n\n" +
        "When the user asks something you'd need real-time data for (current stock prices, breaking news, regulatory " +
        "updates), use the web search tools available to you. Trust the numbers in the context block — they are " +
        "computed server-side and current as of this morning's data refresh.\n\n" +
        "Format with light Markdown: short paragraphs, bullets for lists, bold for key numbers. Avoid leading with " +
        "boilerplate disclaimers — get to the point.";

    public ChatService(
        ApplicationDbContext db,
        IUserContextSnapshotService snapshots,
        IAIModelResolver resolver,
        IHttpClientFactory httpClientFactory,
        IOptions<OpenRouterOptions> options,
        ILogger<ChatService> logger)
    {
        _db = db;
        _snapshots = snapshots;
        _resolver = resolver;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    // ===== Conversation CRUD =====

    public async Task<IReadOnlyList<ConversationListItem>> ListConversationsAsync(
        int userId, bool includeArchived, CancellationToken ct = default)
    {
        var query = _db.AIConversations
            .Where(c => c.UserId == userId && c.ConversationType == "Chat");
        if (!includeArchived) query = query.Where(c => c.ArchivedAt == null);

        return await query
            .OrderByDescending(c => c.LastMessageAt)
            .Select(c => new ConversationListItem(
                c.ConversationId,
                c.Title,
                c.StartedAt,
                c.LastMessageAt,
                c.ArchivedAt,
                c.MessageCount,
                c.TotalCost,
                c.TotalTokensUsed))
            .ToListAsync(ct);
    }

    public async Task<ConversationDetail> GetConversationAsync(
        int conversationId, int userId, CancellationToken ct = default)
    {
        var conv = await _db.AIConversations
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException($"Conversation {conversationId} not found for user {userId}");

        var messages = await _db.AIMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .Select(m => new ChatMessageDto(
                m.MessageId,
                m.Role,
                m.Content,
                m.SentAt,
                m.ModelUsed,
                m.InputTokens,
                m.OutputTokens,
                m.CachedTokens,
                m.MessageCost,
                m.ReasoningEffort))
            .ToListAsync(ct);

        return new ConversationDetail(
            conv.ConversationId,
            conv.Title,
            conv.StartedAt,
            conv.LastMessageAt,
            conv.ArchivedAt,
            conv.ConversationSummary,
            conv.TotalCost,
            conv.TotalTokensUsed,
            conv.MessageCount,
            messages);
    }

    public async Task<AIConversation> CreateConversationAsync(
        int userId, string? title, CancellationToken ct = default)
    {
        var conv = new AIConversation
        {
            UserId = userId,
            ConversationType = "Chat",
            Title = title,
            StartedAt = DateTime.UtcNow,
            LastMessageAt = DateTime.UtcNow
        };
        _db.AIConversations.Add(conv);
        await _db.SaveChangesAsync(ct);
        return conv;
    }

    public async Task RenameConversationAsync(
        int conversationId, int userId, string newTitle, CancellationToken ct = default)
    {
        var conv = await _db.AIConversations
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException($"Conversation {conversationId} not found");
        conv.Title = string.IsNullOrWhiteSpace(newTitle) ? null : newTitle.Trim();
        await _db.SaveChangesAsync(ct);
    }

    public async Task ArchiveConversationAsync(
        int conversationId, int userId, CancellationToken ct = default)
    {
        var conv = await _db.AIConversations
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException($"Conversation {conversationId} not found");
        conv.ArchivedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task UnarchiveConversationAsync(
        int conversationId, int userId, CancellationToken ct = default)
    {
        var conv = await _db.AIConversations
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException($"Conversation {conversationId} not found");
        conv.ArchivedAt = null;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ChatCostSummary> GetMonthlyCostAsync(int userId, CancellationToken ct = default)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var convIds = await _db.AIConversations
            .Where(c => c.UserId == userId && c.ConversationType == "Chat")
            .Select(c => c.ConversationId)
            .ToListAsync(ct);

        var query = _db.AIMessages
            .Where(m => convIds.Contains(m.ConversationId) && m.SentAt >= monthStart);

        var cost = await query.SumAsync(m => m.MessageCost ?? 0m, ct);
        var msgCount = await query.CountAsync(m => m.Role == "assistant", ct);

        return new ChatCostSummary(cost, msgCount, monthStart);
    }

    // ===== Streaming chat turn =====

    public async IAsyncEnumerable<ChatStreamEvent> StreamMessageAsync(
        int conversationId,
        int userId,
        string userMessage,
        bool deepThink,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var conv = await _db.AIConversations
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId, ct);
        if (conv == null)
        {
            yield return new ChatStreamEvent("error", $"Conversation {conversationId} not found", null);
            yield break;
        }

        // Cost guardrail: hard-stop before calling the model if the user is over the monthly cap.
        var mtd = await GetMonthlyCostAsync(userId, ct);
        if (_options.Chat.MonthlyCapUsd > 0 && mtd.MonthToDateCost >= _options.Chat.MonthlyCapUsd)
        {
            yield return new ChatStreamEvent("error",
                $"Monthly chat cap of ${_options.Chat.MonthlyCapUsd:F2} reached " +
                $"(MTD ${mtd.MonthToDateCost:F2}). Raise AI:OpenRouter:Chat:MonthlyCapUsd in appsettings " +
                "or wait until the next billing cycle.",
                null);
            yield break;
        }

        // Persist the user turn FIRST so it's visible if the model call fails.
        var userMsg = new AIMessage
        {
            ConversationId = conversationId,
            Role = "user",
            Content = userMessage,
            SentAt = DateTime.UtcNow
        };
        _db.AIMessages.Add(userMsg);
        conv.MessageCount++;
        conv.LastMessageAt = DateTime.UtcNow;

        // Auto-title from the first user message (up to ~60 chars, truncate cleanly at a word boundary).
        if (string.IsNullOrWhiteSpace(conv.Title))
        {
            conv.Title = TruncateForTitle(userMessage, 60);
        }
        await _db.SaveChangesAsync(ct);

        // Load slot config (Wave 22 — Chat slot config from AISettings table or appsettings).
        var slot = await _resolver.ResolveAsync(AIModelSlot.Chat, ct);
        var reasoningEffort = deepThink ? AIReasoningEffort.High : (slot.ReasoningEffort ?? AIReasoningEffort.Medium);

        // Smart-fetch the snapshot: auto-rebuild if any source table has been
        // updated since the last build, OR if the snapshot is older than the
        // configured max age. Hash-compare inside rebuild keeps the provider
        // cache warm when the content didn't actually change.
        var snapshot = await _snapshots.GetCurrentSnapshotAsync(userId, ct);

        // Load conversation history (last MaxHistoryTurns messages, ordered oldest-first).
        // We exclude the just-persisted user turn from the history block because we'll
        // append it as the explicit "current question" at the end of the payload.
        var historyMessages = await _db.AIMessages
            .Where(m => m.ConversationId == conversationId && m.MessageId != userMsg.MessageId)
            .OrderByDescending(m => m.SentAt)
            .Take(MaxHistoryTurns)
            .ToListAsync(ct);
        historyMessages.Reverse();

        var payload = BuildPayload(slot.Model, snapshot.Content, historyMessages, userMessage, slot, reasoningEffort, deepThink, _options.Chat);
        var json = JsonSerializer.Serialize(payload);

        var startedAt = DateTime.UtcNow;
        var responseBuilder = new StringBuilder();
        int inputTokens = 0;
        int outputTokens = 0;
        int cachedTokens = 0;
        int deltaCount = 0;
        decimal cost = 0m;
        string actualModel = slot.Model;
        // url -> title, insertion-ordered, deduped.
        var citations = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // Wave 26 hotfix — transient upstream failures get retried transparently.
        // Google (via OpenRouter) intermittently returns a 504 "operation was
        // aborted" with an empty stream; the identical request succeeds moments
        // later. Retrying is safe here precisely because we only do it when the
        // attempt produced ZERO deltas, so nothing has been yielded to the caller.
        var maxAttempts = Math.Max(1, _options.Chat.TransientRetries + 1);
        string? fatalError = null;
        string? lastFailureDetail = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            // Reset per-attempt accumulators (nothing has been emitted yet).
            responseBuilder.Clear();
            citations.Clear();
            inputTokens = 0;
            outputTokens = 0;
            cachedTokens = 0;
            cost = 0m;
            var diagnosticTail = new StringBuilder();  // last ~2KB of SSE for empty-stream debug

            var client = _httpClientFactory.CreateClient("OpenRouter");
            // Chat's own timeout: deep-think + web-search turns can legitimately
            // run for minutes, and a slow answer beats a truncated one.
            client.Timeout = _options.Chat.TimeoutSeconds <= 0
                ? Timeout.InfiniteTimeSpan
                : TimeSpan.FromSeconds(_options.Chat.TimeoutSeconds);

            using var request = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            if (!string.IsNullOrEmpty(_options.SiteName))
                request.Headers.Add("X-Title", _options.SiteName);
            if (!string.IsNullOrEmpty(_options.SiteUrl))
                request.Headers.Add("HTTP-Referer", _options.SiteUrl);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage? response = null;
            string? requestError = null;
            try
            {
                response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "OpenRouter stream request failed (conversation {ConversationId}, attempt {Attempt}/{Max})",
                    conversationId, attempt, maxAttempts);
                requestError = ex.Message;
            }

            if (requestError != null)
            {
                lastFailureDetail = requestError;
                if (attempt < maxAttempts)
                {
                    await Task.Delay(RetryDelay(attempt), ct);
                    continue;
                }
                fatalError = "Upstream model request failed: " + requestError;
                break;
            }

            if (!response!.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync(ct);
                var statusCode = (int)response.StatusCode;
                response.Dispose();
                _logger.LogWarning("OpenRouter stream returned {StatusCode} (attempt {Attempt}/{Max}): {Body}",
                    statusCode, attempt, maxAttempts, errBody.Length > 500 ? errBody[..500] : errBody);

                lastFailureDetail = $"HTTP {statusCode}: {(errBody.Length > 200 ? errBody[..200] : errBody)}";
                // 5xx and 429 are worth another shot; 4xx (bad model id, bad
                // parameter, no credit) will fail identically every time.
                if ((statusCode >= 500 || statusCode == 429) && attempt < maxAttempts)
                {
                    await Task.Delay(RetryDelay(attempt), ct);
                    continue;
                }
                fatalError = $"Model returned {statusCode}. {(errBody.Length > 300 ? errBody[..300] : errBody)}";
                break;
            }

            using (response)
            {
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var reader = new StreamReader(stream);

                while (!ct.IsCancellationRequested)
                {
                    var line = await reader.ReadLineAsync(ct);
                    if (line == null) break;
                    if (line.Length == 0) continue;

                    // Capture every non-empty line into a rolling tail so we can dump
                    // it when the stream finishes with zero deltas (debug aid for
                    // OpenRouter empty-response failures).
                    if (diagnosticTail.Length < 2048)
                    {
                        diagnosticTail.Append(line);
                        diagnosticTail.Append('\n');
                    }

                    if (!line.StartsWith("data: ", StringComparison.Ordinal)) continue;

                    var data = line[6..];
                    if (data == "[DONE]") break;

                    JsonDocument? doc = null;
                    try { doc = JsonDocument.Parse(data); }
                    catch (JsonException) { continue; }

                    using (doc)
                    {
                        var root = doc.RootElement;

                        // Error events surfaced inline by some upstreams — capture for
                        // the retry decision and the eventual user-facing message.
                        if (root.TryGetProperty("error", out var errEl))
                        {
                            var errMsg = errEl.ValueKind == JsonValueKind.Object && errEl.TryGetProperty("message", out var em)
                                ? em.GetString() ?? errEl.ToString()
                                : errEl.ToString();
                            _logger.LogWarning("OpenRouter inline error event (attempt {Attempt}/{Max}): {Error}",
                                attempt, maxAttempts, errMsg);
                            lastFailureDetail = errMsg;
                        }

                        // Delta text
                        if (root.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                        {
                            var choice0 = choices[0];
                            if (choice0.TryGetProperty("delta", out var delta))
                            {
                                // Web-search citations ride along on the delta as
                                // `annotations`. Collect them so we can render a
                                // Sources list — previously they were dropped, so
                                // researched answers looked unsourced.
                                if (delta.TryGetProperty("annotations", out var annEl) &&
                                    annEl.ValueKind == JsonValueKind.Array)
                                {
                                    CollectCitations(annEl, citations);
                                }

                                if (delta.TryGetProperty("content", out var contentProp) &&
                                    contentProp.ValueKind == JsonValueKind.String)
                                {
                                    var deltaText = contentProp.GetString();
                                    if (!string.IsNullOrEmpty(deltaText))
                                    {
                                        responseBuilder.Append(deltaText);
                                        deltaCount++;
                                        yield return new ChatStreamEvent("delta", deltaText, null);
                                    }
                                }
                            }
                        }

                        // Usage block (final chunk on OpenRouter)
                        if (root.TryGetProperty("usage", out var usage))
                        {
                            if (usage.TryGetProperty("prompt_tokens", out var pt)) inputTokens = pt.GetInt32();
                            if (usage.TryGetProperty("completion_tokens", out var ctk)) outputTokens = ctk.GetInt32();
                            if (usage.TryGetProperty("cost", out var costEl) && costEl.ValueKind == JsonValueKind.Number)
                                cost = costEl.GetDecimal();
                            if (usage.TryGetProperty("prompt_tokens_details", out var ptd) &&
                                ptd.TryGetProperty("cached_tokens", out var cachedEl) &&
                                cachedEl.ValueKind == JsonValueKind.Number)
                            {
                                cachedTokens = cachedEl.GetInt32();
                            }
                        }

                        if (root.TryGetProperty("model", out var modelEl) && modelEl.ValueKind == JsonValueKind.String)
                        {
                            actualModel = modelEl.GetString() ?? actualModel;
                        }
                    }
                }
            }

            if (deltaCount > 0) break;  // got content — done retrying

            // Empty stream — dump what we did receive so we can diagnose. Common causes:
            // upstream provider timeout (the observed 504), the model rejecting the
            // request, or an unknown plugin/parameter combo.
            _logger.LogWarning(
                "Chat stream returned zero deltas (conv={ConvId}, model={Model}, attempt={Attempt}/{Max}, " +
                "elapsed={Elapsed}ms). SSE tail (up to 2KB):\n{Tail}",
                conversationId, actualModel, attempt, maxAttempts,
                (int)(DateTime.UtcNow - startedAt).TotalMilliseconds,
                diagnosticTail.Length > 0 ? diagnosticTail.ToString() : "(no SSE data received)");

            if (attempt < maxAttempts)
            {
                await Task.Delay(RetryDelay(attempt), ct);
                continue;
            }

            fatalError =
                $"The model returned no content after {maxAttempts} attempt(s) " +
                $"({(DateTime.UtcNow - startedAt).TotalSeconds:F0}s total). " +
                (string.IsNullOrWhiteSpace(lastFailureDetail)
                    ? "Check the API log for the SSE tail."
                    : $"Last upstream message: {lastFailureDetail}");
        }

        if (fatalError != null)
        {
            // Surface a clear error instead of an empty assistant bubble, and skip
            // persisting an empty assistant turn — the user's message stays in place
            // so they can retry without re-typing.
            yield return new ChatStreamEvent("error", fatalError, null);
            yield break;
        }

        // Append a Sources list for anything the web plugin actually cited, unless
        // the model already inlined the links itself.
        if (citations.Count > 0)
        {
            var body = responseBuilder.ToString();
            var missing = citations.Where(c => !body.Contains(c.Key, StringComparison.OrdinalIgnoreCase)).ToList();
            if (missing.Count > 0)
            {
                var sources = new StringBuilder("\n\n**Sources**\n");
                foreach (var (url, title) in missing)
                {
                    sources.Append("- [").Append(string.IsNullOrWhiteSpace(title) ? url : title)
                           .Append("](").Append(url).Append(")\n");
                }
                var sourcesText = sources.ToString();
                responseBuilder.Append(sourcesText);
                yield return new ChatStreamEvent("delta", sourcesText, null);
            }
        }

        var finalText = responseBuilder.ToString();
        var elapsed = DateTime.UtcNow - startedAt;

        // Persist the assistant turn.
        var asstMsg = new AIMessage
        {
            ConversationId = conversationId,
            Role = "assistant",
            Content = finalText,
            SentAt = DateTime.UtcNow,
            ModelUsed = actualModel,
            TokensUsed = inputTokens + outputTokens,
            InputTokens = inputTokens > 0 ? inputTokens : (int?)null,
            OutputTokens = outputTokens > 0 ? outputTokens : (int?)null,
            CachedTokens = cachedTokens > 0 ? cachedTokens : (int?)null,
            MessageCost = cost,
            ReasoningEffort = reasoningEffort
        };
        _db.AIMessages.Add(asstMsg);
        conv.MessageCount++;
        conv.LastMessageAt = DateTime.UtcNow;
        conv.TotalCost += cost;
        conv.TotalTokensUsed += inputTokens + outputTokens;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Chat turn complete: conv={ConvId}, model={Model}, in={In}, out={Out}, cached={Cached}, cost=${Cost:F4}, elapsed={Elapsed}ms",
            conversationId, actualModel, inputTokens, outputTokens, cachedTokens, cost, (int)elapsed.TotalMilliseconds);

        yield return new ChatStreamEvent(
            "final",
            null,
            new ChatStreamFinal(
                asstMsg.MessageId,
                inputTokens > 0 ? inputTokens : null,
                outputTokens > 0 ? outputTokens : null,
                cachedTokens > 0 ? cachedTokens : null,
                cost,
                actualModel,
                reasoningEffort));
    }

    // ===== Payload assembly =====

    /// <summary>
    /// Pull url/title pairs out of an OpenRouter `annotations` array. The
    /// documented shape is <c>{ type: "url_citation", url_citation: { url, title } }</c>,
    /// but this tolerates url/title sitting directly on the annotation object so a
    /// provider tweak doesn't silently drop every citation again.
    /// </summary>
    private static void CollectCitations(JsonElement annotations, Dictionary<string, string> into)
    {
        foreach (var ann in annotations.EnumerateArray())
        {
            if (ann.ValueKind != JsonValueKind.Object) continue;

            var source = ann.TryGetProperty("url_citation", out var uc) && uc.ValueKind == JsonValueKind.Object
                ? uc
                : ann;

            if (!source.TryGetProperty("url", out var urlEl) || urlEl.ValueKind != JsonValueKind.String) continue;
            var url = urlEl.GetString();
            if (string.IsNullOrWhiteSpace(url)) continue;

            var title = source.TryGetProperty("title", out var titleEl) && titleEl.ValueKind == JsonValueKind.String
                ? titleEl.GetString() ?? string.Empty
                : string.Empty;

            if (!into.ContainsKey(url)) into[url] = title;
        }
    }

    /// <summary>
    /// Exponential backoff between transient retry attempts (attempt is 1-based).
    /// </summary>
    private TimeSpan RetryDelay(int attempt)
    {
        var baseSeconds = Math.Max(1, _options.Chat.RetryBackoffSeconds);
        return TimeSpan.FromSeconds(baseSeconds * Math.Pow(2, attempt - 1));
    }

    private static Dictionary<string, object> BuildPayload(
        string model,
        string snapshotContent,
        IReadOnlyList<AIMessage> history,
        string currentUserMessage,
        ResolvedModelConfig slot,
        AIReasoningEffort reasoningEffort,
        bool deepThink,
        ChatOptions chatOptions)
    {
        var messages = new List<Dictionary<string, object>>
        {
            new() { ["role"] = "system", ["content"] = ChatSystemPrompt },
            new() { ["role"] = "user", ["content"] = snapshotContent },
            new() { ["role"] = "assistant",
                ["content"] = "Got it — I have your full financial context loaded. What would you like to talk about?" }
        };

        foreach (var m in history)
        {
            messages.Add(new Dictionary<string, object>
            {
                ["role"] = m.Role == "assistant" ? "assistant" : "user",
                ["content"] = m.Content
            });
        }

        messages.Add(new Dictionary<string, object>
        {
            ["role"] = "user",
            ["content"] = currentUserMessage
        });

        var maxTokens = deepThink ? Math.Max(slot.MaxTokens, 6000) : slot.MaxTokens;
        var payload = new Dictionary<string, object>
        {
            ["model"] = model,
            ["messages"] = messages,
            ["max_tokens"] = maxTokens,
            ["temperature"] = (double)slot.Temperature,
            ["stream"] = true,
            ["usage"] = new { include = true },
        };

        // OpenRouter web-search plugin — gives the model grounding via OpenRouter's
        // standardized interface so it can fetch live tickers, news, and regulatory
        // updates when the question demands it. Result depth is configurable
        // (AI:OpenRouter:Chat:WebSearchMaxResults) because chat is occasional and
        // thorough research is preferred over speed.
        if (chatOptions.WebSearchEnabled)
        {
            payload["plugins"] = new object[]
            {
                new { id = "web", max_results = Math.Max(1, chatOptions.WebSearchMaxResults) }
            };
        }

        if (slot.TopP.HasValue) payload["top_p"] = (double)slot.TopP.Value;

        var reasoning = new Dictionary<string, object>
        {
            ["effort"] = reasoningEffort.ToString().ToLowerInvariant()
        };
        if (slot.ReasoningExclude == true) reasoning["exclude"] = true;
        if (slot.ReasoningMaxTokens.HasValue) reasoning["max_tokens"] = slot.ReasoningMaxTokens.Value;
        payload["reasoning"] = reasoning;

        return payload;
    }

    private static string TruncateForTitle(string raw, int maxLen)
    {
        var trimmed = raw.Trim().Replace('\n', ' ').Replace('\r', ' ');
        if (trimmed.Length <= maxLen) return trimmed;
        var cut = trimmed[..maxLen];
        var lastSpace = cut.LastIndexOf(' ');
        if (lastSpace > maxLen / 2) cut = cut[..lastSpace];
        return cut + "…";
    }
}
