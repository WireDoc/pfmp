using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13 / Phase 2: Read-only adapter for the Binance.US REST API.
    /// Signs GET requests with HMAC-SHA256 over the query string; auth header is X-MBX-APIKEY.
    /// Reference: https://docs.binance.us/#introduction
    /// </summary>
    public class BinanceUsExchangeAdapter : IExchangeAdapter
    {
        public string Provider => "BinanceUS";

        private const string BaseUrl = "https://api.binance.us";
        private const long DefaultRecvWindowMs = 10000;
        private const string QuoteCurrency = "USD"; // Binance.US quotes spot pairs against USD/USDT

        // Process-wide cache of the (binanceServerMs - localUtcMs) skew so signed requests
        // can compensate for local clock drift that triggers -1021 "Timestamp ... ahead of server's time".
        private static long _serverTimeOffsetMs;
        private static DateTime _serverTimeOffsetRefreshedUtc = DateTime.MinValue;
        private static readonly SemaphoreSlim _serverTimeLock = new(1, 1);
        private static readonly TimeSpan ServerTimeRefreshInterval = TimeSpan.FromMinutes(15);

        // USD-stable assets that should be reported as plain USD holdings.
        private static readonly HashSet<string> UsdAliases = new(StringComparer.OrdinalIgnoreCase)
        {
            "USD", "USDT", "USDC", "BUSD"
        };

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<BinanceUsExchangeAdapter> _logger;

        public BinanceUsExchangeAdapter(IHttpClientFactory httpClientFactory, ILogger<BinanceUsExchangeAdapter> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<ExchangeKeyValidationResult> ValidateKeysAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default)
        {
            try
            {
                // /sapi/v1/account/apiRestrictions returns explicit per-key permission flags.
                var restrictions = await SendSignedAsync<BinanceApiRestrictions>(HttpMethod.Get, "/sapi/v1/account/apiRestrictions", apiKey, apiSecret, new Dictionary<string, string>(), cancellationToken);
                if (restrictions is null)
                {
                    return new ExchangeKeyValidationResult
                    {
                        IsValid = false,
                        IsReadOnly = false,
                        ErrorMessage = "Binance.US returned no permission data."
                    };
                }

                var scopes = new List<string>();
                if (restrictions.EnableReading) scopes.Add("reading");
                if (restrictions.EnableSpotAndMarginTrading) scopes.Add("spot_trading");
                if (restrictions.EnableMargin) scopes.Add("margin");
                if (restrictions.EnableFutures) scopes.Add("futures");
                if (restrictions.EnableWithdrawals) scopes.Add("withdrawals");
                if (restrictions.EnableInternalTransfer) scopes.Add("internal_transfer");

                var isReadOnly = !restrictions.EnableSpotAndMarginTrading
                    && !restrictions.EnableMargin
                    && !restrictions.EnableFutures
                    && !restrictions.EnableWithdrawals
                    && !restrictions.EnableInternalTransfer;

                return new ExchangeKeyValidationResult
                {
                    IsValid = restrictions.EnableReading,
                    IsReadOnly = isReadOnly,
                    Scopes = scopes
                };
            }
            catch (BinanceApiException bex) when (bex.StatusCode == 404)
            {
                // Binance.US does not expose /sapi/v1/account/apiRestrictions; fall back to a signed
                // call against /api/v3/account. A 200 response confirms the key is valid; we cannot
                // verify read-only enforcement server-side, so we surface that as a soft warning.
                _logger.LogInformation("Binance.US apiRestrictions unavailable (404); falling back to /api/v3/account for key validation");
                try
                {
                    var account = await SendSignedAsync<BinanceAccountResponse>(HttpMethod.Get, "/api/v3/account", apiKey, apiSecret, new Dictionary<string, string>(), cancellationToken);
                    if (account is null)
                    {
                        return new ExchangeKeyValidationResult
                        {
                            IsValid = false,
                            IsReadOnly = false,
                            ErrorMessage = "Binance.US /api/v3/account returned no data."
                        };
                    }
                    return new ExchangeKeyValidationResult
                    {
                        IsValid = true,
                        // Cannot confirm without apiRestrictions; assume read-only and warn the user in UI copy.
                        IsReadOnly = true,
                        Scopes = new List<string> { "reading_inferred" }
                    };
                }
                catch (BinanceApiException fallbackEx)
                {
                    _logger.LogWarning(fallbackEx, "Binance.US fallback key validation failed");
                    return new ExchangeKeyValidationResult
                    {
                        IsValid = false,
                        IsReadOnly = false,
                        ErrorMessage = fallbackEx.Message
                    };
                }
            }
            catch (BinanceApiException bex)
            {
                _logger.LogWarning(bex, "Binance.US key validation failed");
                return new ExchangeKeyValidationResult
                {
                    IsValid = false,
                    IsReadOnly = false,
                    ErrorMessage = bex.Message
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Binance.US key validation failed");
                return new ExchangeKeyValidationResult
                {
                    IsValid = false,
                    IsReadOnly = false,
                    ErrorMessage = "Could not validate keys with Binance.US: " + ex.Message
                };
            }
        }

        public async Task<IReadOnlyList<ExchangeHoldingSnapshot>> GetHoldingsAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default)
        {
            var account = await SendSignedAsync<BinanceAccountResponse>(HttpMethod.Get, "/api/v3/account", apiKey, apiSecret, new Dictionary<string, string>(), cancellationToken);
            var results = new List<ExchangeHoldingSnapshot>();
            if (account?.Balances is null) return results;

            foreach (var bal in account.Balances)
            {
                if (string.IsNullOrWhiteSpace(bal.Asset)) continue;
                if (!decimal.TryParse(bal.Free, NumberStyles.Any, CultureInfo.InvariantCulture, out var free)) free = 0m;
                if (!decimal.TryParse(bal.Locked, NumberStyles.Any, CultureInfo.InvariantCulture, out var locked)) locked = 0m;
                var total = free + locked;
                if (total <= 0) continue;

                var symbol = NormalizeBinanceAsset(bal.Asset);
                results.Add(new ExchangeHoldingSnapshot
                {
                    Symbol = symbol,
                    Quantity = total,
                    IsStaked = locked > 0 && free == 0
                });
            }

            return results;
        }

        public async Task<IReadOnlyList<ExchangeTransactionRecord>> GetTransactionsAsync(string apiKey, string apiSecret, DateTime sinceUtc, CancellationToken cancellationToken = default)
        {
            var sinceMs = ((DateTimeOffset)DateTime.SpecifyKind(sinceUtc, DateTimeKind.Utc)).ToUnixTimeMilliseconds();
            var records = new List<ExchangeTransactionRecord>();

            // Deposits
            try
            {
                var deposits = await SendSignedAsync<List<BinanceDeposit>>(HttpMethod.Get, "/sapi/v1/capital/deposit/hisrec", apiKey, apiSecret, new Dictionary<string, string>
                {
                    ["startTime"] = sinceMs.ToString(CultureInfo.InvariantCulture)
                }, cancellationToken);
                if (deposits is not null)
                {
                    foreach (var d in deposits)
                    {
                        if (string.IsNullOrWhiteSpace(d.TxId) || string.IsNullOrWhiteSpace(d.Coin)) continue;
                        if (!decimal.TryParse(d.Amount, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty) || qty == 0) continue;
                        records.Add(new ExchangeTransactionRecord
                        {
                            ExchangeTxId = "dep:" + d.TxId,
                            TransactionType = CryptoTransactionType.Deposit,
                            Symbol = NormalizeBinanceAsset(d.Coin),
                            Quantity = qty,
                            ExecutedAt = DateTimeOffset.FromUnixTimeMilliseconds(d.InsertTime).UtcDateTime,
                            RawJson = JsonSerializer.Serialize(d, JsonOptions)
                        });
                    }
                }
            }
            catch (BinanceApiException ex)
            {
                _logger.LogWarning(ex, "Binance.US deposit history fetch failed");
            }

            // Withdrawals
            try
            {
                var withdrawals = await SendSignedAsync<List<BinanceWithdrawal>>(HttpMethod.Get, "/sapi/v1/capital/withdraw/history", apiKey, apiSecret, new Dictionary<string, string>
                {
                    ["startTime"] = sinceMs.ToString(CultureInfo.InvariantCulture)
                }, cancellationToken);
                if (withdrawals is not null)
                {
                    foreach (var w in withdrawals)
                    {
                        if (string.IsNullOrWhiteSpace(w.Id) || string.IsNullOrWhiteSpace(w.Coin)) continue;
                        if (!decimal.TryParse(w.Amount, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty) || qty == 0) continue;
                        decimal? fee = null;
                        if (decimal.TryParse(w.TransactionFee, NumberStyles.Any, CultureInfo.InvariantCulture, out var feeParsed) && feeParsed != 0)
                        {
                            fee = feeParsed;
                        }
                        var executedAt = DateTime.UtcNow;
                        if (DateTime.TryParse(w.ApplyTime, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsedTime))
                        {
                            executedAt = parsedTime;
                        }
                        records.Add(new ExchangeTransactionRecord
                        {
                            ExchangeTxId = "wdr:" + w.Id,
                            TransactionType = CryptoTransactionType.Withdrawal,
                            Symbol = NormalizeBinanceAsset(w.Coin),
                            Quantity = -qty,
                            FeeUsd = fee,
                            ExecutedAt = executedAt,
                            RawJson = JsonSerializer.Serialize(w, JsonOptions)
                        });
                    }
                }
            }
            catch (BinanceApiException ex)
            {
                _logger.LogWarning(ex, "Binance.US withdrawal history fetch failed");
            }

            // Trades (per-asset against USD pair). We only enumerate symbols we currently hold,
            // since /api/v3/myTrades requires a specific symbol parameter.
            IReadOnlyList<ExchangeHoldingSnapshot> heldAssets;
            try
            {
                heldAssets = await GetHoldingsAsync(apiKey, apiSecret, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Binance.US holdings fetch for trade enumeration failed");
                heldAssets = Array.Empty<ExchangeHoldingSnapshot>();
            }

            foreach (var asset in heldAssets)
            {
                if (string.IsNullOrWhiteSpace(asset.Symbol)) continue;
                if (UsdAliases.Contains(asset.Symbol)) continue;
                var pair = asset.Symbol + QuoteCurrency;
                try
                {
                    var trades = await SendSignedAsync<List<BinanceTrade>>(HttpMethod.Get, "/api/v3/myTrades", apiKey, apiSecret, new Dictionary<string, string>
                    {
                        ["symbol"] = pair,
                        ["startTime"] = sinceMs.ToString(CultureInfo.InvariantCulture)
                    }, cancellationToken);
                    if (trades is null) continue;
                    foreach (var t in trades)
                    {
                        if (!decimal.TryParse(t.Qty, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty) || qty == 0) continue;
                        if (!decimal.TryParse(t.Price, NumberStyles.Any, CultureInfo.InvariantCulture, out var price)) price = 0m;
                        decimal? fee = null;
                        if (decimal.TryParse(t.Commission, NumberStyles.Any, CultureInfo.InvariantCulture, out var feeParsed) && feeParsed != 0)
                        {
                            fee = feeParsed;
                        }
                        records.Add(new ExchangeTransactionRecord
                        {
                            ExchangeTxId = "trd:" + pair + ":" + t.Id,
                            TransactionType = t.IsBuyer ? CryptoTransactionType.Buy : CryptoTransactionType.Sell,
                            Symbol = asset.Symbol,
                            Quantity = t.IsBuyer ? qty : -qty,
                            PriceUsd = price > 0 ? price : null,
                            FeeUsd = fee,
                            ExecutedAt = DateTimeOffset.FromUnixTimeMilliseconds(t.Time).UtcDateTime,
                            RawJson = JsonSerializer.Serialize(t, JsonOptions)
                        });
                    }
                }
                catch (BinanceApiException ex)
                {
                    // Pair may not exist on Binance.US for this asset; skip silently.
                    _logger.LogDebug(ex, "Binance.US myTrades fetch skipped for pair {Pair}", pair);
                }
            }

            return records;
        }

        private static string NormalizeBinanceAsset(string asset)
        {
            if (string.IsNullOrEmpty(asset)) return string.Empty;
            var trimmed = asset.Trim().ToUpperInvariant();
            if (UsdAliases.Contains(trimmed)) return "USD";
            return trimmed;
        }

        // ---- HTTP signing helpers ----

        private async Task<TResponse?> SendSignedAsync<TResponse>(HttpMethod method, string path, string apiKey, string apiSecret, Dictionary<string, string> parameters, CancellationToken cancellationToken)
        {
            await EnsureServerTimeOffsetAsync(cancellationToken);
            try
            {
                return await SendSignedCoreAsync<TResponse>(method, path, apiKey, apiSecret, parameters, cancellationToken);
            }
            catch (BinanceApiException ex) when (ex.StatusCode == 400 && ex.Message.Contains("-1021", StringComparison.Ordinal))
            {
                // Clock skew drifted; force-refresh the offset and retry once.
                _logger.LogInformation("Binance.US -1021 timestamp skew; refreshing server-time offset and retrying");
                await RefreshServerTimeOffsetAsync(cancellationToken, force: true);
                return await SendSignedCoreAsync<TResponse>(method, path, apiKey, apiSecret, parameters, cancellationToken);
            }
        }

        private async Task<TResponse?> SendSignedCoreAsync<TResponse>(HttpMethod method, string path, string apiKey, string apiSecret, Dictionary<string, string> parameters, CancellationToken cancellationToken)
        {
            // Copy so retries don't accumulate stale recvWindow/timestamp/signature entries.
            var signed = new Dictionary<string, string>(parameters)
            {
                ["recvWindow"] = DefaultRecvWindowMs.ToString(CultureInfo.InvariantCulture),
                ["timestamp"] = (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + _serverTimeOffsetMs).ToString(CultureInfo.InvariantCulture)
            };

            var query = string.Join("&", signed.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
            var signature = BuildSignature(query, apiSecret);
            var url = $"{BaseUrl}{path}?{query}&signature={signature}";

            using var request = new HttpRequestMessage(method, url);
            request.Headers.Add("X-MBX-APIKEY", apiKey);

            var http = _httpClientFactory.CreateClient("BinanceUS");
            using var response = await http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new BinanceApiException($"Binance.US {path} returned {(int)response.StatusCode}: {Truncate(errBody, 300)}", (int)response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, cancellationToken);
        }

        private async Task EnsureServerTimeOffsetAsync(CancellationToken cancellationToken)
        {
            if (DateTime.UtcNow - _serverTimeOffsetRefreshedUtc < ServerTimeRefreshInterval) return;
            await RefreshServerTimeOffsetAsync(cancellationToken, force: false);
        }

        private async Task RefreshServerTimeOffsetAsync(CancellationToken cancellationToken, bool force)
        {
            await _serverTimeLock.WaitAsync(cancellationToken);
            try
            {
                if (!force && DateTime.UtcNow - _serverTimeOffsetRefreshedUtc < ServerTimeRefreshInterval) return;
                var http = _httpClientFactory.CreateClient("BinanceUS");
                using var response = await http.GetAsync($"{BaseUrl}/api/v3/time", cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Binance.US /api/v3/time returned {Status}; keeping previous offset {Offset}ms", (int)response.StatusCode, _serverTimeOffsetMs);
                    return;
                }
                var payload = await response.Content.ReadFromJsonAsync<BinanceServerTime>(JsonOptions, cancellationToken);
                if (payload is null) return;
                var localMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                _serverTimeOffsetMs = payload.ServerTime - localMs;
                _serverTimeOffsetRefreshedUtc = DateTime.UtcNow;
                _logger.LogInformation("Binance.US server-time offset refreshed: {Offset}ms", _serverTimeOffsetMs);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to refresh Binance.US server-time offset; keeping {Offset}ms", _serverTimeOffsetMs);
            }
            finally
            {
                _serverTimeLock.Release();
            }
        }

        private static string BuildSignature(string query, string apiSecret)
        {
            var keyBytes = Encoding.UTF8.GetBytes(apiSecret);
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(query));
            var sb = new StringBuilder(hash.Length * 2);
            foreach (var b in hash)
            {
                sb.Append(b.ToString("x2", CultureInfo.InvariantCulture));
            }
            return sb.ToString();
        }

        private static string Truncate(string value, int max) => value.Length <= max ? value : value.Substring(0, max);

        // ---- DTOs ----

        private class BinanceApiRestrictions
        {
            public bool EnableReading { get; set; }
            public bool EnableSpotAndMarginTrading { get; set; }
            public bool EnableMargin { get; set; }
            public bool EnableFutures { get; set; }
            public bool EnableWithdrawals { get; set; }
            public bool EnableInternalTransfer { get; set; }
        }

        private class BinanceServerTime
        {
            public long ServerTime { get; set; }
        }

        private class BinanceAccountResponse
        {
            public List<BinanceBalance>? Balances { get; set; }
        }

        private class BinanceBalance
        {
            public string? Asset { get; set; }
            public string? Free { get; set; }
            public string? Locked { get; set; }
        }

        private class BinanceDeposit
        {
            public string? TxId { get; set; }
            public string? Coin { get; set; }
            public string? Amount { get; set; }
            public long InsertTime { get; set; }
            public int Status { get; set; }
        }

        private class BinanceWithdrawal
        {
            public string? Id { get; set; }
            public string? Coin { get; set; }
            public string? Amount { get; set; }
            public string? TransactionFee { get; set; }
            public string? ApplyTime { get; set; }
            public int Status { get; set; }
        }

        private class BinanceTrade
        {
            public long Id { get; set; }
            public string? Symbol { get; set; }
            public string? Price { get; set; }
            public string? Qty { get; set; }
            public string? Commission { get; set; }
            public string? CommissionAsset { get; set; }
            public long Time { get; set; }
            public bool IsBuyer { get; set; }
        }

        private class BinanceApiException : Exception
        {
            public int? StatusCode { get; }
            public BinanceApiException(string message) : base(message) { }
            public BinanceApiException(string message, int statusCode) : base(message)
            {
                StatusCode = statusCode;
            }
        }
    }
}
