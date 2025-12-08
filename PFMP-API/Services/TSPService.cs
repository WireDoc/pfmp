using System.Text.Json;

namespace PFMP_API.Services
{
    /// <summary>
    /// Service for retrieving real TSP fund prices from DailyTSP.com API
    /// </summary>
    public class TSPService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TSPService> _logger;
        private readonly string _apiKey;

        public TSPService(IHttpClientFactory httpClientFactory, ILogger<TSPService> logger, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _apiKey = configuration["TSP:ApiKey"] ?? "i-aa1c63ae39-0xpwj25i09";
        }

        /// <summary>
        /// Get TSP fund prices for a specific date or latest if no date provided
        /// </summary>
        /// <param name="date">Optional date to retrieve prices for (defaults to latest)</param>
        /// <returns>TSP fund prices</returns>
        public async Task<TSPModel?> GetTSPDataAsync(DateOnly? date = null)
        {
            try
            {
                string strDate = date.HasValue 
                    ? $"/{date.Value:yyyy-MM-dd}?token={_apiKey}" 
                    : $"?token={_apiKey}";
                
                string tspQuery = $"close{strDate}";

                using var httpClient = _httpClientFactory.CreateClient("TSPClient");
                
                _logger.LogInformation("Fetching TSP data from DailyTSP API: {Query}", tspQuery);
                
                HttpResponseMessage response = await httpClient.GetAsync(tspQuery);
                response.EnsureSuccessStatusCode();

                string jsonString = await response.Content.ReadAsStringAsync();
                var tspData = JsonSerializer.Deserialize<TSPModel>(jsonString);

                if (tspData != null)
                {
                    _logger.LogInformation("Successfully retrieved TSP data for date: {Date}", tspData.Date);
                }

                return tspData;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error fetching TSP data from DailyTSP API");
                return null;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON parsing error for TSP data");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error fetching TSP data");
                return null;
            }
        }

        /// <summary>
        /// Get TSP fund prices as a dictionary keyed by fund code.
        /// Keys are normalized: G, F, C, S, I, LIncome, L2025-L2075
        /// </summary>
        /// <returns>Dictionary of fund code to price, or null if API call fails</returns>
        public async Task<Dictionary<string, decimal>?> GetTSPPricesAsDictionaryAsync()
        {
            var tspData = await GetTSPDataAsync();
            if (tspData == null) return null;
            return ConvertToPriceDictionary(tspData);
        }

        /// <summary>
        /// Convert TSPModel to a dictionary of fund code to price.
        /// </summary>
        public static Dictionary<string, decimal> ConvertToPriceDictionary(TSPModel tspData)
        {
            return new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
            {
                ["G"] = (decimal)tspData.GFund,
                ["F"] = (decimal)tspData.FFund,
                ["C"] = (decimal)tspData.CFund,
                ["S"] = (decimal)tspData.SFund,
                ["I"] = (decimal)tspData.IFund,
                ["LIncome"] = (decimal)tspData.LIncome,
                ["L2025"] = (decimal)tspData.L2025,
                ["L2030"] = (decimal)tspData.L2030,
                ["L2035"] = (decimal)tspData.L2035,
                ["L2040"] = (decimal)tspData.L2040,
                ["L2045"] = (decimal)tspData.L2045,
                ["L2050"] = (decimal)tspData.L2050,
                ["L2055"] = (decimal)tspData.L2055,
                ["L2060"] = (decimal)tspData.L2060,
                ["L2065"] = (decimal)tspData.L2065,
                ["L2070"] = (decimal)tspData.L2070,
                ["L2075"] = (decimal)tspData.L2075
            };
        }

        /// <summary>
        /// Normalize fund code variations to standard keys used in the price dictionary
        /// </summary>
        public static string NormalizeFundCode(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return string.Empty;
            var c = code.Trim().ToUpperInvariant().Replace(" ", "").Replace("-", "");
            return c switch
            {
                "GFUND" => "G",
                "FFUND" => "F",
                "CFUND" => "C",
                "SFUND" => "S",
                "IFUND" => "I",
                "LINCOME" => "LIncome",
                _ when c.StartsWith("L") && c.Length > 1 => c, // L2050, etc.
                _ => c
            };
        }
    }
}
