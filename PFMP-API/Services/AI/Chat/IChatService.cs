using PFMP_API.Models;

namespace PFMP_API.Services.AI.Chat;

/// <summary>
/// Wave 24 — Streaming chatbot service. Reuses the AIConversation + AIMessage
/// tables (originally from Wave 7) for thread + message persistence; reuses the
/// Chat slot (AIModelSlot.Chat) from Wave 22 Phase F for model + sampling config.
/// </summary>
public interface IChatService
{
    Task<IReadOnlyList<ConversationListItem>> ListConversationsAsync(
        int userId,
        bool includeArchived,
        CancellationToken ct = default);

    Task<ConversationDetail> GetConversationAsync(
        int conversationId,
        int userId,
        CancellationToken ct = default);

    Task<AIConversation> CreateConversationAsync(
        int userId,
        string? title,
        CancellationToken ct = default);

    Task RenameConversationAsync(
        int conversationId,
        int userId,
        string newTitle,
        CancellationToken ct = default);

    Task ArchiveConversationAsync(
        int conversationId,
        int userId,
        CancellationToken ct = default);

    Task UnarchiveConversationAsync(
        int conversationId,
        int userId,
        CancellationToken ct = default);

    /// <summary>
    /// Streams the assistant's response token-by-token as SSE-friendly events.
    /// Persists the user turn before yielding any deltas, then persists the
    /// assistant turn (with token + cost details) after the upstream stream
    /// finalizes.
    /// </summary>
    IAsyncEnumerable<ChatStreamEvent> StreamMessageAsync(
        int conversationId,
        int userId,
        string userMessage,
        bool deepThink,
        CancellationToken ct = default);

    Task<ChatCostSummary> GetMonthlyCostAsync(int userId, CancellationToken ct = default);
}

public record ConversationListItem(
    int ConversationId,
    string? Title,
    DateTime StartedAt,
    DateTime LastMessageAt,
    DateTime? ArchivedAt,
    int MessageCount,
    decimal TotalCost,
    int TotalTokensUsed);

public record ConversationDetail(
    int ConversationId,
    string? Title,
    DateTime StartedAt,
    DateTime LastMessageAt,
    DateTime? ArchivedAt,
    string? ConversationSummary,
    decimal TotalCost,
    int TotalTokensUsed,
    int MessageCount,
    IReadOnlyList<ChatMessageDto> Messages);

public record ChatMessageDto(
    int MessageId,
    string Role,
    string Content,
    DateTime SentAt,
    string? ModelUsed,
    int? InputTokens,
    int? OutputTokens,
    int? CachedTokens,
    decimal? Cost,
    AIReasoningEffort? ReasoningEffort);

/// <summary>
/// SSE event yielded by <see cref="IChatService.StreamMessageAsync"/>. Three shapes:
///   1. <c>delta</c> — incremental text from the model; Delta non-null.
///   2. <c>final</c> — terminal event with usage + persisted message id; Final non-null.
///   3. <c>error</c> — Delta carries the error message; client should surface it.
/// </summary>
public record ChatStreamEvent(string Type, string? Delta, ChatStreamFinal? Final);

public record ChatStreamFinal(
    int AssistantMessageId,
    int? InputTokens,
    int? OutputTokens,
    int? CachedTokens,
    decimal Cost,
    string ModelUsed,
    AIReasoningEffort? ReasoningEffortUsed);

public record ChatCostSummary(
    decimal MonthToDateCost,
    int MonthToDateMessages,
    DateTime BillingPeriodStart);
