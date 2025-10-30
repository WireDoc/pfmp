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
    }
}
