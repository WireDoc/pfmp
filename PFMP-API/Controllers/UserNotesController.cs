using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserNotesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserNotesController> _logger;

        public UserNotesController(ApplicationDbContext context, ILogger<UserNotesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all notes for a specific entity (e.g., account, goal, property)
        /// </summary>
        [HttpGet("entity/{entityType}/{entityId}")]
        public async Task<ActionResult<IEnumerable<UserNoteResponse>>> GetNotesForEntity(
            string entityType, string entityId, [FromQuery] int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            var notes = await _context.UserNotes
                .Where(n => n.UserId == userId && n.EntityType == entityType && n.EntityId == entityId)
                .OrderByDescending(n => n.IsPinned)
                .ThenByDescending(n => n.CreatedAt)
                .Select(n => new UserNoteResponse
                {
                    UserNoteId = n.UserNoteId,
                    EntityType = n.EntityType,
                    EntityId = n.EntityId,
                    Content = n.Content,
                    IsPinned = n.IsPinned,
                    CreatedAt = n.CreatedAt,
                    UpdatedAt = n.UpdatedAt
                })
                .ToListAsync();

            return Ok(notes);
        }

        /// <summary>
        /// Get all notes for a user across all entities
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserNoteResponse>>> GetAllUserNotes(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            var notes = await _context.UserNotes
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.IsPinned)
                .ThenByDescending(n => n.CreatedAt)
                .Select(n => new UserNoteResponse
                {
                    UserNoteId = n.UserNoteId,
                    EntityType = n.EntityType,
                    EntityId = n.EntityId,
                    Content = n.Content,
                    IsPinned = n.IsPinned,
                    CreatedAt = n.CreatedAt,
                    UpdatedAt = n.UpdatedAt
                })
                .ToListAsync();

            return Ok(notes);
        }

        /// <summary>
        /// Create a new note on an entity
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<UserNoteResponse>> CreateNote([FromBody] CreateUserNoteRequest request)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null) return NotFound("User not found");

            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest("Content is required");

            if (string.IsNullOrWhiteSpace(request.EntityType))
                return BadRequest("EntityType is required");

            if (string.IsNullOrWhiteSpace(request.EntityId))
                return BadRequest("EntityId is required");

            var note = new UserNote
            {
                UserId = request.UserId,
                EntityType = request.EntityType.Trim(),
                EntityId = request.EntityId.Trim(),
                Content = request.Content.Trim(),
                IsPinned = request.IsPinned,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UserNotes.Add(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created note {NoteId} for {EntityType}/{EntityId} by user {UserId}",
                note.UserNoteId, note.EntityType, note.EntityId, note.UserId);

            return CreatedAtAction(nameof(GetNotesForEntity),
                new { entityType = note.EntityType, entityId = note.EntityId, userId = note.UserId },
                new UserNoteResponse
                {
                    UserNoteId = note.UserNoteId,
                    EntityType = note.EntityType,
                    EntityId = note.EntityId,
                    Content = note.Content,
                    IsPinned = note.IsPinned,
                    CreatedAt = note.CreatedAt,
                    UpdatedAt = note.UpdatedAt
                });
        }

        /// <summary>
        /// Update an existing note
        /// </summary>
        [HttpPut("{noteId}")]
        public async Task<ActionResult<UserNoteResponse>> UpdateNote(int noteId, [FromBody] UpdateUserNoteRequest request)
        {
            var note = await _context.UserNotes.FindAsync(noteId);
            if (note == null) return NotFound("Note not found");

            if (!string.IsNullOrWhiteSpace(request.Content))
                note.Content = request.Content.Trim();

            if (request.IsPinned.HasValue)
                note.IsPinned = request.IsPinned.Value;

            note.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new UserNoteResponse
            {
                UserNoteId = note.UserNoteId,
                EntityType = note.EntityType,
                EntityId = note.EntityId,
                Content = note.Content,
                IsPinned = note.IsPinned,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt
            });
        }

        /// <summary>
        /// Delete a note
        /// </summary>
        [HttpDelete("{noteId}")]
        public async Task<IActionResult> DeleteNote(int noteId)
        {
            var note = await _context.UserNotes.FindAsync(noteId);
            if (note == null) return NotFound("Note not found");

            _context.UserNotes.Remove(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted note {NoteId}", noteId);

            return NoContent();
        }
    }

    // DTOs
    public class UserNoteResponse
    {
        public int UserNoteId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateUserNoteRequest
    {
        public int UserId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsPinned { get; set; } = false;
    }

    public class UpdateUserNoteRequest
    {
        public string? Content { get; set; }
        public bool? IsPinned { get; set; }
    }
}
