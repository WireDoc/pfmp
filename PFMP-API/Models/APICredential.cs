using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Models
{
    public class APICredential
    {
        public int APICredentialId { get; set; }

        [Required]
        public int AccountId { get; set; }

        [Required]
        [StringLength(100)]
        public string ProviderName { get; set; } = string.Empty; // Brokerage/Bank name

        [Required]
        public string EncryptedApiKey { get; set; } = string.Empty; // Encrypted API credentials

        public string? EncryptedApiSecret { get; set; } // For OAuth or secret-based auth

        public string? RefreshToken { get; set; } // For token refresh

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsed { get; set; }
        public DateTime? ExpiresAt { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual Account Account { get; set; } = null!;
    }
}