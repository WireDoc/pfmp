using System.Security.Cryptography;
using System.Text;

namespace PFMP_API.Services
{
    /// <summary>
    /// Service for secure password hashing and verification
    /// </summary>
    public interface IPasswordHashService
    {
        /// <summary>
        /// Hash a password using secure algorithms
        /// </summary>
        string HashPassword(string password);

        /// <summary>
        /// Verify a password against its hash
        /// </summary>
        bool VerifyPassword(string password, string hash);
    }

    /// <summary>
    /// Password hashing service implementation using BCrypt
    /// </summary>
    public class PasswordHashService : IPasswordHashService
    {
        private readonly ILogger<PasswordHashService> _logger;

        public PasswordHashService(ILogger<PasswordHashService> logger)
        {
            _logger = logger;
        }

        public string HashPassword(string password)
        {
            try
            {
                if (string.IsNullOrEmpty(password))
                    throw new ArgumentException("Password cannot be null or empty", nameof(password));

                // Use BCrypt for password hashing with work factor of 12
                return BCrypt.Net.BCrypt.HashPassword(password, 12);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error hashing password");
                throw;
            }
        }

        public bool VerifyPassword(string password, string hash)
        {
            try
            {
                if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hash))
                    return false;

                return BCrypt.Net.BCrypt.Verify(password, hash);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying password");
                return false;
            }
        }
    }
}