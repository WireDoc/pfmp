using Microsoft.AspNetCore.DataProtection;

namespace PFMP_API.Services.Plaid
{
    /// <summary>
    /// Service for encrypting and decrypting sensitive credentials using ASP.NET Core Data Protection.
    /// In production, this should be backed by Azure Key Vault for key management.
    /// </summary>
    public interface ICredentialEncryptionService
    {
        /// <summary>
        /// Encrypts a plaintext credential (e.g., Plaid access token).
        /// </summary>
        string Encrypt(string plainText);

        /// <summary>
        /// Decrypts an encrypted credential back to plaintext.
        /// </summary>
        string Decrypt(string cipherText);
    }

    /// <summary>
    /// Implementation using ASP.NET Core Data Protection API.
    /// Keys are automatically managed and rotated by the framework.
    /// </summary>
    public class DataProtectionEncryptionService : ICredentialEncryptionService
    {
        private readonly IDataProtector _protector;
        private const string Purpose = "PlaidCredentials";

        public DataProtectionEncryptionService(IDataProtectionProvider provider)
        {
            _protector = provider.CreateProtector(Purpose);
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
            {
                throw new ArgumentNullException(nameof(plainText), "Cannot encrypt null or empty string");
            }

            return _protector.Protect(plainText);
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
            {
                throw new ArgumentNullException(nameof(cipherText), "Cannot decrypt null or empty string");
            }

            return _protector.Unprotect(cipherText);
        }
    }
}
