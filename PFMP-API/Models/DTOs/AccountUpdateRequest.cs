using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Models.DTOs
{
    /// <summary>
    /// DTO for updating account details from the dashboard
    /// </summary>
    public class AccountUpdateRequest
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Institution { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Balance cannot be negative")]
        public decimal Balance { get; set; }

        [MaxLength(50)]
        public string? AccountNumber { get; set; }
    }
}
