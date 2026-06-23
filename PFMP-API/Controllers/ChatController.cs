using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services.AI.Chat;

namespace PFMP_API.Controllers;

/// <summary>
/// Wave 24 — Streaming chatbot API. Conversations + messages CRUD + the SSE
/// message-stream endpoint. Uses query-string userId for now (consistent with
/// the rest of the API which has no auth wired yet); becomes [Authorize] when
/// auth lands.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chat;
    private readonly IUserContextSnapshotService _snapshots;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        IChatService chat,
        IUserContextSnapshotService snapshots,
        ILogger<ChatController> logger)
    {
        _chat = chat;
        _snapshots = snapshots;
        _logger = logger;
    }

    // ===== Conversations =====

    [HttpGet("conversations")]
    public async Task<ActionResult<IReadOnlyList<ConversationListItem>>> ListConversations(
        [FromQuery] int userId,
        [FromQuery] bool includeArchived = false,
        CancellationToken ct = default)
    {
        var list = await _chat.ListConversationsAsync(userId, includeArchived, ct);
        return Ok(list);
    }

    [HttpGet("conversations/{conversationId:int}")]
    public async Task<ActionResult<ConversationDetail>> GetConversation(
        int conversationId,
        [FromQuery] int userId,
        CancellationToken ct = default)
    {
        try
        {
            var detail = await _chat.GetConversationAsync(conversationId, userId, ct);
            return Ok(detail);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public record CreateConversationRequest(int UserId, string? Title);

    [HttpPost("conversations")]
    public async Task<ActionResult<ConversationDetail>> CreateConversation(
        [FromBody] CreateConversationRequest request,
        CancellationToken ct = default)
    {
        if (request.UserId <= 0) return BadRequest(new { message = "userId is required" });
        var conv = await _chat.CreateConversationAsync(request.UserId, request.Title, ct);
        var detail = await _chat.GetConversationAsync(conv.ConversationId, request.UserId, ct);
        return CreatedAtAction(nameof(GetConversation),
            new { conversationId = conv.ConversationId, userId = request.UserId },
            detail);
    }

    public record RenameConversationRequest(int UserId, string Title);

    [HttpPatch("conversations/{conversationId:int}/title")]
    public async Task<IActionResult> RenameConversation(
        int conversationId,
        [FromBody] RenameConversationRequest request,
        CancellationToken ct = default)
    {
        try
        {
            await _chat.RenameConversationAsync(conversationId, request.UserId, request.Title, ct);
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("conversations/{conversationId:int}/archive")]
    public async Task<IActionResult> Archive(
        int conversationId,
        [FromQuery] int userId,
        CancellationToken ct = default)
    {
        try
        {
            await _chat.ArchiveConversationAsync(conversationId, userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("conversations/{conversationId:int}/unarchive")]
    public async Task<IActionResult> Unarchive(
        int conversationId,
        [FromQuery] int userId,
        CancellationToken ct = default)
    {
        try
        {
            await _chat.UnarchiveConversationAsync(conversationId, userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // ===== Streaming chat turn =====

    public record StreamMessageRequest(int UserId, string Message, bool DeepThink);

    /// <summary>
    /// SSE endpoint: streams the assistant's response token-by-token. Body shape:
    /// <c>{ "userId": 20, "message": "...", "deepThink": false }</c>.
    /// Each SSE event is one line of JSON keyed by <c>type</c>: <c>delta</c>,
    /// <c>final</c>, or <c>error</c>.
    /// </summary>
    [HttpPost("conversations/{conversationId:int}/messages/stream")]
    public async Task StreamMessage(
        int conversationId,
        [FromBody] StreamMessageRequest request,
        CancellationToken ct)
    {
        if (request.UserId <= 0 || string.IsNullOrWhiteSpace(request.Message))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { message = "userId and message are required" }, ct);
            return;
        }

        Response.StatusCode = StatusCodes.Status200OK;
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no"; // disable proxy buffering when behind nginx etc.

        var jsonOpts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        await foreach (var ev in _chat.StreamMessageAsync(conversationId, request.UserId, request.Message, request.DeepThink, ct))
        {
            var payload = JsonSerializer.Serialize(ev, jsonOpts);
            await Response.WriteAsync("data: ", ct);
            await Response.WriteAsync(payload, ct);
            await Response.WriteAsync("\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }

        await Response.WriteAsync("data: [DONE]\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }

    // ===== Context snapshot =====

    [HttpGet("snapshot")]
    public async Task<ActionResult<object>> GetSnapshot(
        [FromQuery] int userId,
        CancellationToken ct = default)
    {
        // Smart fetch so opening the chat page after hours away triggers the
        // staleness check and rebuilds if needed — the sidebar then reflects
        // the fresh snapshot immediately.
        var snapshot = await _snapshots.GetCurrentSnapshotAsync(userId, ct);
        return Ok(new
        {
            snapshot.SnapshotDate,
            snapshot.EstimatedTokens,
            snapshot.CreatedAt,
            snapshot.UpdatedAt,
            HashPrefix = snapshot.ContentHash.Length >= 12 ? snapshot.ContentHash[..12] : snapshot.ContentHash,
            ContentLength = snapshot.Content.Length
        });
    }

    [HttpPost("snapshot/rebuild")]
    public async Task<ActionResult<object>> RebuildSnapshot(
        [FromQuery] int userId,
        CancellationToken ct = default)
    {
        var snapshot = await _snapshots.ForceRebuildAsync(userId, ct);
        return Ok(new
        {
            snapshot.SnapshotDate,
            snapshot.EstimatedTokens,
            snapshot.UpdatedAt,
            HashPrefix = snapshot.ContentHash.Length >= 12 ? snapshot.ContentHash[..12] : snapshot.ContentHash
        });
    }

    // ===== Monthly cost =====

    [HttpGet("cost/monthly")]
    public async Task<ActionResult<ChatCostSummary>> GetMonthlyCost(
        [FromQuery] int userId,
        CancellationToken ct = default)
    {
        var summary = await _chat.GetMonthlyCostAsync(userId, ct);
        return Ok(summary);
    }
}
