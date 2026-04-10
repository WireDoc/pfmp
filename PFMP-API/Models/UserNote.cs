using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    /// <summary>
    /// User notes attached to any entity (account, goal, property, etc.)
    /// Supports polymorphic association via EntityType + EntityId string.
    /// </summary>
    public class UserNote
    {
        [Key]
        public int UserNoteId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string EntityId { get; set; } = string.Empty;

        [Required]
        [MaxLength(2000)]
        public string Content { get; set; } = string.Empty;

        public bool IsPinned { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey("UserId")]
        [JsonIgnore]
        public virtual User? User { get; set; }
    }
}
