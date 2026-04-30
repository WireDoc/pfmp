namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Thrown by an exchange adapter when the decrypted credential fails an
    /// adapter-specific format check (e.g., Kraken secrets must be Base64 because
    /// they are used as the HMAC-SHA512 key). Lets <see cref="CryptoSyncService"/>
    /// mark the connection as <c>Expired</c> so the periodic job stops retrying it.
    /// </summary>
    public class InvalidExchangeCredentialFormatException : Exception
    {
        public InvalidExchangeCredentialFormatException(string message) : base(message) { }
        public InvalidExchangeCredentialFormatException(string message, Exception inner) : base(message, inner) { }
    }
}
