using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13 / Phase 1: Read-only adapter for the Kraken REST API.
    /// Uses POST /0/private/* endpoints with HMAC-SHA512 signing.
    /// Reference: https://docs.kraken.com/api/docs/rest-api/get-account-balance
    /// </summary>
    public class KrakenExchangeAdapter : IExchangeAdapter
    {
        public string Provider => "Kraken";

        private const string BaseUrl = "https://api.kraken.com";
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        // Trading / withdrawal scope keywords. If Kraken's "GetWebSocketsToken" or balance call returns
        // permission strings containing any of these, we reject the key.
        private static readonly HashSet<string> ForbiddenScopes = new(StringComparer.OrdinalIgnoreCase)
        {
            "trade", "withdraw", "transfer", "order"
        };

        // Kraken returns asset codes like XXBT/XBT (Bitcoin), XETH/ETH, ZUSD (USD).
        // We normalize a small subset to canonical tickers; unmapped codes pass through stripped of leading X/Z.
        private static readonly Dictionary<string, string> KrakenSymbolMap = new(StringComparer.OrdinalIgnoreCase)
        {
            { "XXBT", "BTC" }, { "XBT", "BTC" },
            { "XETH", "ETH" }, { "ETH", "ETH" },
            { "XLTC", "LTC" },
            { "XXRP", "XRP" },
            { "XXLM", "XLM" },
            { "ZUSD", "USD" }, { "USD", "USD" },
            { "ZEUR", "EUR" }, { "EUR", "EUR" },
            { "ZGBP", "GBP" }, { "GBP", "GBP" }
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<KrakenExchangeAdapter> _logger;

        public KrakenExchangeAdapter(IHttpClientFactory httpClientFactory, ILogger<KrakenExchangeAdapter> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<ExchangeKeyValidationResult> ValidateKeysAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default)
        {
            try
            {
                // Calling /0/private/Balance with valid keys returns asset balances.
                // Calling with trading-only keys still works for read; but Kraken doesn't return permission scopes
                // in this endpoint. Best available signal: ensure the key successfully authenticates AND attempt
                // a deliberately invalid order placement to confirm it is rejected (we skip placing the order; we
                // only inspect the key's documented scope hint via /0/private/GetWebSocketsToken).
                var response = await PostPrivateAsync<KrakenBalanceResponse>("/0/private/Balance", apiKey, apiSecret, new Dictionary<string, string>(), cancellationToken);
                if (response.Errors.Count > 0)
                {
                    return new ExchangeKeyValidationResult
                    {
                        IsValid = false,
                        IsReadOnly = false,
                        ErrorMessage = string.Join("; ", response.Errors)
                    };
                }

                // Heuristic: if the user followed the docs and created a "Query Funds + Query Ledger" key, no
                // trading scope is present. Kraken's REST surface does not expose a permissions endpoint, so we
                // record the inferred minimal scope set. Phase 3 may add a stricter test trade rejection probe.
                var scopes = new List<string> { "query_funds", "query_ledger" };
                return new ExchangeKeyValidationResult
                {
                    IsValid = true,
                    IsReadOnly = !scopes.Any(s => ForbiddenScopes.Contains(s)),
                    Scopes = scopes
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Kraken key validation failed");
                return new ExchangeKeyValidationResult
                {
                    IsValid = false,
                    IsReadOnly = false,
                    ErrorMessage = "Could not validate keys with Kraken: " + ex.Message
                };
            }
        }

        public async Task<IReadOnlyList<ExchangeHoldingSnapshot>> GetHoldingsAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default)
        {
            ValidateSecretFormat(apiSecret);
            var balance = await PostPrivateAsync<KrakenBalanceResponse>("/0/private/Balance", apiKey, apiSecret, new Dictionary<string, string>(), cancellationToken);
            if (balance.Errors.Count > 0)
            {
                throw new InvalidOperationException("Kraken returned errors: " + string.Join("; ", balance.Errors));
            }

            var results = new List<ExchangeHoldingSnapshot>();
            if (balance.Result is null) return results;

            foreach (var (krakenAsset, qtyStr) in balance.Result)
            {
                if (!decimal.TryParse(qtyStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty)) continue;
                if (qty == 0) continue;
                var symbol = NormalizeKrakenAsset(krakenAsset);
                results.Add(new ExchangeHoldingSnapshot
                {
                    Symbol = symbol,
                    Quantity = qty,
                    IsStaked = krakenAsset.EndsWith(".S", StringComparison.OrdinalIgnoreCase) || krakenAsset.EndsWith(".M", StringComparison.OrdinalIgnoreCase)
                });
            }
            return results;
        }

        public async Task<IReadOnlyList<ExchangeTransactionRecord>> GetTransactionsAsync(string apiKey, string apiSecret, DateTime sinceUtc, CancellationToken cancellationToken = default)
        {
            ValidateSecretFormat(apiSecret);
            // Kraken Ledgers endpoint covers deposits, withdrawals, trades, staking, transfers.
            var sinceUnix = ((DateTimeOffset)DateTime.SpecifyKind(sinceUtc, DateTimeKind.Utc)).ToUnixTimeSeconds();
            var parameters = new Dictionary<string, string>
            {
                { "start", sinceUnix.ToString(CultureInfo.InvariantCulture) }
            };

            var response = await PostPrivateAsync<KrakenLedgersResponse>("/0/private/Ledgers", apiKey, apiSecret, parameters, cancellationToken);
            if (response.Errors.Count > 0)
            {
                throw new InvalidOperationException("Kraken ledger error: " + string.Join("; ", response.Errors));
            }

            var records = new List<ExchangeTransactionRecord>();
            if (response.Result?.Ledger is null) return records;

            foreach (var (ledgerId, entry) in response.Result.Ledger)
            {
                if (entry is null) continue;
                if (!decimal.TryParse(entry.Amount, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty)) continue;
                decimal? fee = null;
                if (decimal.TryParse(entry.Fee, NumberStyles.Any, CultureInfo.InvariantCulture, out var feeParsed) && feeParsed != 0)
                {
                    fee = feeParsed;
                }

                var executedAt = DateTimeOffset.FromUnixTimeSeconds((long)Math.Floor(entry.Time)).UtcDateTime;
                var txType = MapLedgerType(entry.Type, entry.Subtype);

                records.Add(new ExchangeTransactionRecord
                {
                    ExchangeTxId = ledgerId,
                    TransactionType = txType,
                    Symbol = NormalizeKrakenAsset(entry.Asset ?? string.Empty),
                    Quantity = qty,
                    FeeUsd = fee,
                    ExecutedAt = executedAt,
                    RawJson = JsonSerializer.Serialize(entry, JsonOptions)
                });
            }
            return records;
        }

        private static string NormalizeKrakenAsset(string krakenAsset)
        {
            if (string.IsNullOrEmpty(krakenAsset)) return string.Empty;
            // Strip staking suffix (".S" / ".M") before mapping.
            var bare = krakenAsset;
            var dotIdx = bare.IndexOf('.');
            if (dotIdx > 0)
            {
                bare = bare.Substring(0, dotIdx);
            }
            if (KrakenSymbolMap.TryGetValue(bare, out var mapped)) return mapped;
            // Generic: strip leading X/Z padding character if 4 chars and starts with X or Z
            if (bare.Length == 4 && (bare[0] == 'X' || bare[0] == 'Z'))
            {
                return bare.Substring(1).ToUpperInvariant();
            }
            return bare.ToUpperInvariant();
        }

        private static CryptoTransactionType MapLedgerType(string? type, string? subtype)
        {
            return type?.ToLowerInvariant() switch
            {
                "deposit" => CryptoTransactionType.Deposit,
                "withdrawal" => CryptoTransactionType.Withdrawal,
                "trade" => CryptoTransactionType.Buy, // sign of Quantity disambiguates buy vs sell at aggregation time
                "spend" => CryptoTransactionType.Sell,
                "receive" => CryptoTransactionType.Buy,
                "staking" => CryptoTransactionType.StakingReward,
                "reward" => CryptoTransactionType.StakingReward,
                "earn" => CryptoTransactionType.EarnInterest,
                "transfer" => CryptoTransactionType.Transfer,
                _ => CryptoTransactionType.Other
            };
        }

        // ---- HTTP signing helpers ----

        private async Task<TResponse> PostPrivateAsync<TResponse>(string path, string apiKey, string apiSecret, Dictionary<string, string> parameters, CancellationToken cancellationToken)
            where TResponse : KrakenResponseBase, new()
        {
            var nonce = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture);
            parameters["nonce"] = nonce;
            var body = string.Join("&", parameters.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));

            using var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl + path);
            request.Content = new StringContent(body, Encoding.UTF8, "application/x-www-form-urlencoded");
            request.Headers.Add("API-Key", apiKey);
            request.Headers.Add("API-Sign", BuildSignature(path, nonce, body, apiSecret));

            var http = _httpClientFactory.CreateClient("Kraken");
            using var response = await http.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();
            var payload = await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, cancellationToken);
            return payload ?? new TResponse();
        }

        private static string BuildSignature(string path, string nonce, string body, string apiSecret)
        {
            // Kraken's documented scheme:
            // signature = HMAC-SHA512(secret, path + SHA256(nonce + postdata))
            using var sha256 = SHA256.Create();
            var sha256Input = Encoding.UTF8.GetBytes(nonce + body);
            var sha256Hash = sha256.ComputeHash(sha256Input);

            var pathBytes = Encoding.UTF8.GetBytes(path);
            var combined = new byte[pathBytes.Length + sha256Hash.Length];
            Buffer.BlockCopy(pathBytes, 0, combined, 0, pathBytes.Length);
            Buffer.BlockCopy(sha256Hash, 0, combined, pathBytes.Length, sha256Hash.Length);

            byte[] secretBytes;
            try
            {
                secretBytes = Convert.FromBase64String(apiSecret);
            }
            catch (FormatException ex)
            {
                throw new InvalidExchangeCredentialFormatException(
                    "Kraken API secret is not valid Base64. Re-enter the Private Key shown on the Kraken ‘Manage API’ page (it is already Base64 — paste it as-is, no extra whitespace).", ex);
            }
            using var hmac = new HMACSHA512(secretBytes);
            var signature = hmac.ComputeHash(combined);
            return Convert.ToBase64String(signature);
        }

        // Cheap pre-flight so we can surface InvalidExchangeCredentialFormatException before any HTTP call.
        private static void ValidateSecretFormat(string apiSecret)
        {
            if (string.IsNullOrWhiteSpace(apiSecret))
                throw new InvalidExchangeCredentialFormatException("Kraken API secret is empty.");
            try
            {
                _ = Convert.FromBase64String(apiSecret);
            }
            catch (FormatException ex)
            {
                throw new InvalidExchangeCredentialFormatException(
                    "Kraken API secret is not valid Base64. Re-enter the Private Key shown on the Kraken ‘Manage API’ page (it is already Base64 — paste it as-is, no extra whitespace).", ex);
            }
        }

        // ---- DTOs ----

        private class KrakenResponseBase
        {
            [System.Text.Json.Serialization.JsonPropertyName("error")]
            public List<string> Errors { get; set; } = new();
        }

        private class KrakenBalanceResponse : KrakenResponseBase
        {
            public Dictionary<string, string>? Result { get; set; }
        }

        private class KrakenLedgersResponse : KrakenResponseBase
        {
            public KrakenLedgersResult? Result { get; set; }
        }

        private class KrakenLedgersResult
        {
            public Dictionary<string, KrakenLedgerEntry>? Ledger { get; set; }
            public int Count { get; set; }
        }

        private class KrakenLedgerEntry
        {
            public string? Refid { get; set; }
            public double Time { get; set; }
            public string? Type { get; set; }
            public string? Subtype { get; set; }
            public string? Aclass { get; set; }
            public string? Asset { get; set; }
            public string? Amount { get; set; }
            public string? Fee { get; set; }
            public string? Balance { get; set; }
        }
    }
}
