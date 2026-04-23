using Microsoft.AspNetCore.DataProtection;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13: Encrypts/decrypts crypto exchange API keys + secrets via Data Protection API.
    /// Separate purpose string from Plaid keeps key rings isolated.
    /// </summary>
    public interface IExchangeCredentialEncryptionService
    {
        string Encrypt(string plainText);
        string Decrypt(string cipherText);
    }

    public class ExchangeCredentialEncryptionService : IExchangeCredentialEncryptionService
    {
        private readonly IDataProtector _protector;
        private const string Purpose = "ExchangeCredentials";

        public ExchangeCredentialEncryptionService(IDataProtectionProvider provider)
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
