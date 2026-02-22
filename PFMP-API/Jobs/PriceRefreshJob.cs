using Hangfire;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Services.MarketData;
using System.Text.RegularExpressions;

namespace PFMP_API.Jobs;

/// <summary>
/// Background job to refresh holding prices daily at 11 PM ET (after market close).
/// Wave 10: Background Jobs & Automation
/// </summary>
public class PriceRefreshJob
{
    private readonly ApplicationDbContext _context;
    private readonly IMarketDataService _marketDataService;
    private readonly ILogger<PriceRefreshJob> _logger;
    private readonly HashSet<string> _excludedSymbols;
    private readonly List<Regex> _excludedPatterns;

    public PriceRefreshJob(
        ApplicationDbContext context,
        IMarketDataService marketDataService,
        ILogger<PriceRefreshJob> logger,
        IConfiguration configuration)
    {
        _context = context;
        _marketDataService = marketDataService;
        _logger = logger;
        
        // Load excluded symbols from configuration
        _excludedSymbols = configuration.GetSection("MarketData:ExcludedSymbols")
            .Get<string[]>()
            ?.ToHashSet(StringComparer.OrdinalIgnoreCase)
            ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        
        // Load excluded patterns from configuration
        var patterns = configuration.GetSection("MarketData:ExcludedSymbolPatterns")
            .Get<string[]>() ?? Array.Empty<string>();
        _excludedPatterns = patterns
            .Select(p => new Regex(p, RegexOptions.Compiled | RegexOptions.IgnoreCase))
            .ToList();
        
        if (_excludedSymbols.Count > 0 || _excludedPatterns.Count > 0)
        {
            _logger.LogInformation(
                "Loaded {SymbolCount} excluded symbols and {PatternCount} excluded patterns from configuration",
                _excludedSymbols.Count, _excludedPatterns.Count);
        }
    }

    /// <summary>
    /// Refresh prices for all eligible holdings across all users.
    /// Called by Hangfire on schedule or triggered manually.
    /// </summary>
    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })]
    [Queue("price-refresh")]
    public async Task RefreshAllHoldingPricesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting daily price refresh job");
        var startTime = DateTime.UtcNow;

        try
        {
            // Get all eligible accounts with holdings
            var eligibleAccounts = await _context.Accounts
                .Include(a => a.Holdings)
                .Include(a => a.User)
                .Where(a => a.IsBackgroundRefreshEnabled)
                .Where(a => a.LifecycleState == "Active")
                .Where(a => !a.User.IsTestAccount)
                .Where(a => a.Holdings.Any())
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Found {AccountCount} eligible accounts with holdings", eligibleAccounts.Count);

            if (eligibleAccounts.Count == 0)
            {
                _logger.LogInformation("No eligible accounts to process. Job complete.");
                return;
            }

            // Collect all unique symbols across all holdings
            var allSymbols = eligibleAccounts
                .SelectMany(a => a.Holdings)
                .Where(h => !string.IsNullOrWhiteSpace(h.Symbol))
                .Where(h => !IsTspFund(h.Symbol)) // TSP funds use separate DailyTspService
                .Where(h => !IsExcludedSymbol(h.Symbol)) // Filter excluded symbols from config
                .Select(h => h.Symbol.ToUpperInvariant())
                .Distinct()
                .ToList();

            _logger.LogInformation("Fetching prices for {SymbolCount} unique symbols", allSymbols.Count);

            // Batch fetch all prices (API supports up to 500 symbols per request)
            var priceMap = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            
            foreach (var batch in allSymbols.Chunk(100))
            {
                var quotes = await _marketDataService.GetQuotesAsync(batch.ToList());
                foreach (var quote in quotes)
                {
                    if (quote.Price > 0)
                    {
                        priceMap[quote.Symbol] = quote.Price;
                    }
                }
            }

            _logger.LogInformation("Fetched prices for {PriceCount} symbols", priceMap.Count);

            // Update holdings with new prices
            int updatedCount = 0;
            int errorCount = 0;
            var now = DateTime.UtcNow;

            foreach (var account in eligibleAccounts)
            {
                foreach (var holding in account.Holdings)
                {
                    if (string.IsNullOrWhiteSpace(holding.Symbol) || IsTspFund(holding.Symbol) || IsExcludedSymbol(holding.Symbol))
                        continue;

                    var symbol = holding.Symbol.ToUpperInvariant();
                    if (priceMap.TryGetValue(symbol, out var newPrice))
                    {
                        holding.CurrentPrice = newPrice;
                        holding.LastPriceUpdate = now;
                        holding.UpdatedAt = now;
                        updatedCount++;
                    }
                    else
                    {
                        // Only log warning for unexpected missing prices (not excluded symbols)
                        _logger.LogWarning("No price found for symbol {Symbol}", symbol);
                        errorCount++;
                    }
                }
                
                // Recalculate account balance based on updated holding prices
                var newBalance = account.Holdings.Sum(h => h.Quantity * h.CurrentPrice);
                account.CurrentBalance = newBalance;
                account.UpdatedAt = now;
            }

            await _context.SaveChangesAsync(cancellationToken);

            var elapsed = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "Price refresh job completed. Updated: {UpdatedCount}, Errors: {ErrorCount}, Duration: {Duration:F2}s",
                updatedCount, errorCount, elapsed.TotalSeconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Price refresh job failed after {Duration:F2}s", 
                (DateTime.UtcNow - startTime).TotalSeconds);
            throw; // Let Hangfire retry
        }
    }

    /// <summary>
    /// Refresh prices for a single account (manual trigger).
    /// </summary>
    public async Task RefreshAccountPricesAsync(int accountId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Refreshing prices for account {AccountId}", accountId);

        var account = await _context.Accounts
            .Include(a => a.Holdings)
            .FirstOrDefaultAsync(a => a.AccountId == accountId, cancellationToken);

        if (account == null)
        {
            _logger.LogWarning("Account {AccountId} not found", accountId);
            return;
        }

        var symbols = account.Holdings
            .Where(h => !string.IsNullOrWhiteSpace(h.Symbol) && !IsTspFund(h.Symbol) && !IsExcludedSymbol(h.Symbol))
            .Select(h => h.Symbol.ToUpperInvariant())
            .Distinct()
            .ToList();

        if (symbols.Count == 0)
        {
            _logger.LogInformation("No symbols to refresh for account {AccountId}", accountId);
            return;
        }

        var quotes = await _marketDataService.GetQuotesAsync(symbols);
        var priceMap = quotes.Where(q => q.Price > 0).ToDictionary(q => q.Symbol, q => q.Price, StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;
        int updatedCount = 0;

        foreach (var holding in account.Holdings)
        {
            if (string.IsNullOrWhiteSpace(holding.Symbol) || IsTspFund(holding.Symbol))
                continue;

            if (priceMap.TryGetValue(holding.Symbol.ToUpperInvariant(), out var newPrice))
            {
                holding.CurrentPrice = newPrice;
                holding.LastPriceUpdate = now;
                holding.UpdatedAt = now;
                updatedCount++;
            }
        }

        // Recalculate account balance based on updated holding prices
        var newBalance = account.Holdings.Sum(h => h.Quantity * h.CurrentPrice);
        account.CurrentBalance = newBalance;
        account.LastAPISync = now;
        account.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Refreshed {Count} holdings for account {AccountId}", updatedCount, accountId);
    }

    private static bool IsTspFund(string symbol)
    {
        // TSP funds use DailyTSP API, not FMP
        var tspSymbols = new[] { "GFUND", "FFUND", "CFUND", "SFUND", "IFUND", "LINCOME", 
            "L2025", "L2030", "L2035", "L2040", "L2045", "L2050", "L2055", "L2060", "L2065", "L2070", "L2075" };
        return tspSymbols.Any(t => symbol.Contains(t, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Check if a symbol should be excluded from price lookup based on configuration.
    /// Symbols can be excluded by exact match or regex pattern.
    /// </summary>
    private bool IsExcludedSymbol(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
            return true;
        
        var upperSymbol = symbol.ToUpperInvariant();
        
        // Check exact match
        if (_excludedSymbols.Contains(upperSymbol))
            return true;
        
        // Check patterns
        foreach (var pattern in _excludedPatterns)
        {
            if (pattern.IsMatch(upperSymbol))
                return true;
        }
        
        return false;
    }
}
