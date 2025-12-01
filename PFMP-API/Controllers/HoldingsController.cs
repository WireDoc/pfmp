using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Services.MarketData;
using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HoldingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<HoldingsController> _logger;
    private readonly IMarketDataService? _marketDataService;

    public HoldingsController(
        ApplicationDbContext context, 
        ILogger<HoldingsController> logger,
        IMarketDataService? marketDataService = null)
    {
        _context = context;
        _logger = logger;
        _marketDataService = marketDataService;
    }

    /// <summary>
    /// Get all holdings for an account
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<HoldingResponse>>> GetHoldings([FromQuery] int accountId)
    {
        var holdings = await _context.Holdings
            .Include(h => h.Account)
            .Where(h => h.AccountId == accountId)
            .OrderBy(h => h.Symbol)
            .ToListAsync();

        return Ok(holdings.Select(h => MapToResponse(h)));
    }

    /// <summary>
    /// Get a single holding by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<HoldingResponse>> GetHolding(int id)
    {
        var holding = await _context.Holdings
            .Include(h => h.Account)
            .FirstOrDefaultAsync(h => h.HoldingId == id);

        if (holding == null)
        {
            return NotFound();
        }

        return Ok(MapToResponse(holding));
    }

    /// <summary>
    /// Get price history for a holding with optional period filtering
    /// </summary>
    /// <param name="id">Holding ID</param>
    /// <param name="period">Period: 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, ALL</param>
    [HttpGet("{id}/price-history")]
    public async Task<ActionResult<List<PriceHistoryResponse>>> GetPriceHistory(int id, [FromQuery] string period = "1M")
    {
        var holding = await _context.Holdings.FindAsync(id);
        if (holding == null)
        {
            return NotFound(new { message = "Holding not found" });
        }

        // Calculate date range based on period
        DateTime? fromDate = period.ToUpper() switch
        {
            "1D" => DateTime.UtcNow.AddDays(-1),
            "1W" => DateTime.UtcNow.AddDays(-7),
            "1M" => DateTime.UtcNow.AddMonths(-1),
            "3M" => DateTime.UtcNow.AddMonths(-3),
            "6M" => DateTime.UtcNow.AddMonths(-6),
            "1Y" => DateTime.UtcNow.AddYears(-1),
            "5Y" => DateTime.UtcNow.AddYears(-5),
            "10Y" => DateTime.UtcNow.AddYears(-10),
            "ALL" => null, // Keep for backwards compatibility but use 10Y in frontend
            _ => DateTime.UtcNow.AddMonths(-1) // Default to 1M
        };

        // Try to get from database first
        var query = _context.PriceHistory
            .Where(p => p.Symbol == holding.Symbol.ToUpper());

        if (fromDate.HasValue)
        {
            query = query.Where(p => p.Date >= fromDate.Value);
        }

        var priceHistory = await query.OrderBy(p => p.Date).ToListAsync();

        // Check if we need to fetch more data from FMP
        // We need to fetch if: no data exists, OR if the oldest data we have is newer than fromDate
        bool needsMoreData = false;
        if (_marketDataService != null)
        {
            if (!priceHistory.Any())
            {
                needsMoreData = true;
            }
            else if (fromDate.HasValue)
            {
                var oldestDate = await _context.PriceHistory
                    .Where(p => p.Symbol == holding.Symbol.ToUpper())
                    .MinAsync(p => p.Date);
                
                // If our oldest data is newer than what we need, fetch more
                needsMoreData = oldestDate > fromDate.Value;
            }
        }

        if (needsMoreData)
        {
            _logger.LogInformation("Fetching historical data from FMP for {Symbol} from {FromDate}", holding.Symbol, fromDate);
            
            var fmpPrices = await _marketDataService!.GetHistoricalPricesAsync(
                holding.Symbol, 
                fromDate, 
                DateTime.UtcNow
            );

            if (fmpPrices.Any())
            {
                // Store in database for future use
                foreach (var fmpPrice in fmpPrices)
                {
                    // Ensure DateTime is UTC for PostgreSQL first
                    var dateUtc = fmpPrice.Date.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(fmpPrice.Date, DateTimeKind.Utc)
                        : fmpPrice.Date.ToUniversalTime();

                    // Check if this date already exists to avoid duplicates
                    var exists = await _context.PriceHistory
                        .AnyAsync(p => p.Symbol == holding.Symbol.ToUpper() && p.Date.Date == dateUtc.Date);
                    
                    if (exists)
                        continue;

                    var historyEntry = new PriceHistory
                    {
                        HoldingId = holding.HoldingId,
                        Symbol = holding.Symbol.ToUpper(),
                        Date = dateUtc,
                        Open = fmpPrice.Open,
                        High = fmpPrice.High,
                        Low = fmpPrice.Low,
                        Close = fmpPrice.Close,
                        Volume = fmpPrice.Volume,
                        AdjustedClose = fmpPrice.AdjClose,
                        Change = fmpPrice.Change,
                        ChangePercent = fmpPrice.ChangePercent
                    };
                    _context.PriceHistory.Add(historyEntry);
                }

                await _context.SaveChangesAsync();
                
                // Reload from database with the date filter
                priceHistory = await _context.PriceHistory
                    .Where(p => p.Symbol == holding.Symbol.ToUpper())
                    .Where(p => !fromDate.HasValue || p.Date >= fromDate.Value)
                    .OrderBy(p => p.Date)
                    .ToListAsync();

                _logger.LogInformation("Stored {Count} historical prices for {Symbol}", fmpPrices.Count, holding.Symbol);
            }
        }

        // Return unique dates only (in case there are duplicates from multiple fetches)
        // Group by date and take the most recent entry for each date
        var uniquePriceHistory = priceHistory
            .GroupBy(p => p.Date.Date)
            .Select(g => g.OrderByDescending(p => p.CreatedAt).First())
            .OrderBy(p => p.Date)
            .ToList();

        return Ok(uniquePriceHistory.Select(p => new PriceHistoryResponse
        {
            Date = p.Date,
            Open = p.Open,
            High = p.High,
            Low = p.Low,
            Close = p.Close,
            Volume = p.Volume,
            AdjustedClose = p.AdjustedClose,
            Change = p.Change,
            ChangePercent = p.ChangePercent
        }));
    }

    /// <summary>
    /// Create a new holding
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<HoldingResponse>> CreateHolding([FromBody] CreateHoldingRequest request)
    {
        // Verify account exists
        var account = await _context.Accounts.FindAsync(request.AccountId);
        if (account == null)
        {
            return BadRequest("Account not found");
        }

        var holding = new Holding
        {
            AccountId = request.AccountId,
            Symbol = request.Symbol,
            Name = request.Name,
            AssetType = request.AssetType,
            Quantity = request.Quantity,
            AverageCostBasis = request.AverageCostBasis,
            CurrentPrice = request.CurrentPrice,
            AnnualDividendYield = request.AnnualDividendYield,
            StakingAPY = request.StakingAPY,
            AnnualDividendIncome = request.AnnualDividendIncome,
            LastDividendDate = request.LastDividendDate,
            NextDividendDate = request.NextDividendDate,
            Beta = request.Beta,
            SectorAllocation = request.SectorAllocation,
            GeographicAllocation = request.GeographicAllocation,
            IsQualifiedDividend = request.IsQualifiedDividend,
            PurchaseDate = request.PurchaseDate,
            IsLongTermCapitalGains = request.IsLongTermCapitalGains,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastPriceUpdate = DateTime.UtcNow
        };

        _context.Holdings.Add(holding);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created holding {HoldingId} ({Symbol}) for account {AccountId}", 
            holding.HoldingId, holding.Symbol, holding.AccountId);

        // Reload to get navigation properties
        holding = await _context.Holdings
            .Include(h => h.Account)
            .FirstAsync(h => h.HoldingId == holding.HoldingId);

        return CreatedAtAction(nameof(GetHolding), new { id = holding.HoldingId }, MapToResponse(holding));
    }

    /// <summary>
    /// Update an existing holding
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<HoldingResponse>> UpdateHolding(int id, [FromBody] UpdateHoldingRequest request)
    {
        var holding = await _context.Holdings.FindAsync(id);
        if (holding == null)
        {
            return NotFound();
        }

        // Update fields
        if (request.Symbol != null) holding.Symbol = request.Symbol;
        if (request.Name != null) holding.Name = request.Name;
        if (request.AssetType.HasValue) holding.AssetType = (AssetType)request.AssetType.Value;
        if (request.Quantity.HasValue) holding.Quantity = request.Quantity.Value;
        if (request.AverageCostBasis.HasValue) holding.AverageCostBasis = request.AverageCostBasis.Value;
        if (request.CurrentPrice.HasValue)
        {
            holding.CurrentPrice = request.CurrentPrice.Value;
            holding.LastPriceUpdate = DateTime.UtcNow;
        }
        if (request.AnnualDividendYield.HasValue) holding.AnnualDividendYield = request.AnnualDividendYield;
        if (request.StakingAPY.HasValue) holding.StakingAPY = request.StakingAPY;
        if (request.AnnualDividendIncome.HasValue) holding.AnnualDividendIncome = request.AnnualDividendIncome;
        if (request.LastDividendDate.HasValue) holding.LastDividendDate = request.LastDividendDate;
        if (request.NextDividendDate.HasValue) holding.NextDividendDate = request.NextDividendDate;
        if (request.Beta.HasValue) holding.Beta = request.Beta;
        if (request.SectorAllocation != null) holding.SectorAllocation = request.SectorAllocation;
        if (request.GeographicAllocation != null) holding.GeographicAllocation = request.GeographicAllocation;
        if (request.IsQualifiedDividend.HasValue) holding.IsQualifiedDividend = request.IsQualifiedDividend.Value;
        if (request.PurchaseDate.HasValue) holding.PurchaseDate = request.PurchaseDate;
        if (request.IsLongTermCapitalGains.HasValue) holding.IsLongTermCapitalGains = request.IsLongTermCapitalGains.Value;
        if (request.Notes != null) holding.Notes = request.Notes;
        
        holding.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated holding {HoldingId} ({Symbol}) for account {AccountId}", 
            holding.HoldingId, holding.Symbol, holding.AccountId);

        // Reload to get navigation properties
        holding = await _context.Holdings
            .Include(h => h.Account)
            .FirstAsync(h => h.HoldingId == holding.HoldingId);

        return Ok(MapToResponse(holding));
    }

    /// <summary>
    /// Delete a holding
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteHolding(int id)
    {
        var holding = await _context.Holdings.FindAsync(id);
        if (holding == null)
        {
            return NotFound();
        }

        _context.Holdings.Remove(holding);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted holding {HoldingId} ({Symbol}) for account {AccountId}", 
            holding.HoldingId, holding.Symbol, holding.AccountId);

        return NoContent();
    }

    /// <summary>
    /// Refresh prices for all holdings in an account using live market data
    /// </summary>
    /// <param name="accountId">Account ID to refresh</param>
    [HttpPost("refresh-prices")]
    public async Task<ActionResult<RefreshPricesResponse>> RefreshPrices([FromQuery] int accountId)
    {
        if (_marketDataService == null)
        {
            return BadRequest(new { message = "Market data service is not configured" });
        }

        var holdings = await _context.Holdings
            .Where(h => h.AccountId == accountId)
            .ToListAsync();

        if (!holdings.Any())
        {
            return Ok(new RefreshPricesResponse 
            { 
                AccountId = accountId, 
                UpdatedCount = 0, 
                FailedCount = 0, 
                Message = "No holdings found for this account" 
            });
        }

        // Get unique symbols
        var symbols = holdings.Select(h => h.Symbol.ToUpper()).Distinct().ToList();
        _logger.LogInformation("Refreshing prices for symbols: {Symbols}", string.Join(", ", symbols));
        
        // Fetch quotes from FMP
        var quotes = await _marketDataService.GetQuotesAsync(symbols);
        _logger.LogInformation("Received {QuoteCount} quotes from market data service", quotes.Count);
        
        if (quotes.Any())
        {
            _logger.LogInformation("Quote symbols: {QuoteSymbols}", string.Join(", ", quotes.Select(q => q.Symbol)));
        }
        
        var quoteDict = quotes.ToDictionary(q => q.Symbol.ToUpper(), q => q, StringComparer.OrdinalIgnoreCase);

        int updatedCount = 0;
        int failedCount = 0;
        var errors = new List<string>();

        foreach (var holding in holdings)
        {
            if (quoteDict.TryGetValue(holding.Symbol.ToUpper(), out var quote))
            {
                // Update price from real-time quote
                holding.CurrentPrice = quote.Price;
                holding.LastPriceUpdate = DateTime.UtcNow;

                updatedCount++;
                _logger.LogInformation("Updated price for {Symbol}: ${Price} (real-time)", holding.Symbol, quote.Price);
            }
            else
            {
                // Fallback: try to get price from historical data (for commodities/futures like GC=F)
                var historicalPrices = await _marketDataService.GetHistoricalPricesAsync(
                    holding.Symbol.ToUpper(), 
                    DateTime.UtcNow.AddDays(-7), 
                    DateTime.UtcNow);
                
                var latestPrice = historicalPrices.OrderByDescending(p => p.Date).FirstOrDefault();
                if (latestPrice != null)
                {
                    holding.CurrentPrice = latestPrice.Close;
                    holding.LastPriceUpdate = DateTime.UtcNow;
                    updatedCount++;
                    _logger.LogInformation("Updated price for {Symbol}: ${Price} (from historical close on {Date})", 
                        holding.Symbol, latestPrice.Close, latestPrice.Date.ToString("yyyy-MM-dd"));
                }
                else
                {
                    failedCount++;
                    errors.Add($"No quote found for {holding.Symbol}");
                    _logger.LogWarning("Failed to get quote for {Symbol}", holding.Symbol);
                }
            }
        }

        await _context.SaveChangesAsync();

        // Update account's CurrentBalance for DETAILED accounts
        decimal? previousBalance = null;
        decimal? newBalance = null;
        var account = await _context.Accounts.FindAsync(accountId);
        if (account != null && account.IsDetailed())
        {
            previousBalance = account.CurrentBalance;
            newBalance = holdings.Sum(h => h.Quantity * h.CurrentPrice);
            account.CurrentBalance = newBalance.Value;
            account.LastBalanceUpdate = DateTime.UtcNow;
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Updated account {AccountId} balance: {PreviousBalance} -> {NewBalance}", 
                accountId, previousBalance, newBalance);
        }

        return Ok(new RefreshPricesResponse
        {
            AccountId = accountId,
            UpdatedCount = updatedCount,
            FailedCount = failedCount,
            Message = $"Successfully updated {updatedCount} of {holdings.Count} holdings",
            Errors = errors.Any() ? errors : null,
            PreviousAccountBalance = previousBalance,
            NewAccountBalance = newBalance
        });
    }

    private static HoldingResponse MapToResponse(Holding holding)
    {
        return new HoldingResponse
        {
            HoldingId = holding.HoldingId,
            AccountId = holding.AccountId,
            Symbol = holding.Symbol,
            Name = holding.Name,
            AssetType = holding.AssetType.ToString(),
            Quantity = holding.Quantity,
            AverageCostBasis = holding.AverageCostBasis,
            CurrentPrice = holding.CurrentPrice,
            CurrentValue = holding.CurrentValue,
            TotalCostBasis = holding.TotalCostBasis,
            UnrealizedGainLoss = holding.UnrealizedGainLoss,
            UnrealizedGainLossPercentage = holding.UnrealizedGainLossPercentage,
            AnnualDividendYield = holding.AnnualDividendYield,
            StakingAPY = holding.StakingAPY,
            AnnualDividendIncome = holding.AnnualDividendIncome,
            LastDividendDate = holding.LastDividendDate,
            NextDividendDate = holding.NextDividendDate,
            Beta = holding.Beta,
            SectorAllocation = holding.SectorAllocation,
            GeographicAllocation = holding.GeographicAllocation,
            IsQualifiedDividend = holding.IsQualifiedDividend,
            PurchaseDate = holding.PurchaseDate,
            IsLongTermCapitalGains = holding.IsLongTermCapitalGains,
            CreatedAt = holding.CreatedAt,
            UpdatedAt = holding.UpdatedAt,
            LastPriceUpdate = holding.LastPriceUpdate,
            Notes = holding.Notes
        };
    }
}

public class HoldingResponse
{
    public int HoldingId { get; set; }
    public int AccountId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string AssetType { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal AverageCostBasis { get; set; }
    public decimal CurrentPrice { get; set; }
    
    // Calculated properties
    public decimal CurrentValue { get; set; }
    public decimal TotalCostBasis { get; set; }
    public decimal UnrealizedGainLoss { get; set; }
    public decimal? UnrealizedGainLossPercentage { get; set; }
    
    // Dividend/Income properties
    public decimal? AnnualDividendYield { get; set; }
    public decimal? StakingAPY { get; set; }
    public decimal? AnnualDividendIncome { get; set; }
    public DateTime? LastDividendDate { get; set; }
    public DateTime? NextDividendDate { get; set; }
    
    // Risk properties
    public decimal? Beta { get; set; }
    public string? SectorAllocation { get; set; }
    public string? GeographicAllocation { get; set; }
    
    // Tax properties
    public bool IsQualifiedDividend { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public bool IsLongTermCapitalGains { get; set; }
    
    // Metadata
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastPriceUpdate { get; set; }
    public string? Notes { get; set; }
}

public class CreateHoldingRequest
{
    [Required]
    public int AccountId { get; set; }
    
    [Required]
    [StringLength(20)]
    public string Symbol { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string? Name { get; set; }
    
    [Required]
    public AssetType AssetType { get; set; }
    
    [Required]
    [Range(0, double.MaxValue)]
    public decimal Quantity { get; set; }
    
    [Required]
    [Range(0, double.MaxValue)]
    public decimal AverageCostBasis { get; set; }
    
    [Required]
    [Range(0, double.MaxValue)]
    public decimal CurrentPrice { get; set; }
    
    public decimal? AnnualDividendYield { get; set; }
    public decimal? StakingAPY { get; set; }
    public decimal? AnnualDividendIncome { get; set; }
    public DateTime? LastDividendDate { get; set; }
    public DateTime? NextDividendDate { get; set; }
    public decimal? Beta { get; set; }
    public string? SectorAllocation { get; set; }
    public string? GeographicAllocation { get; set; }
    public bool IsQualifiedDividend { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public bool IsLongTermCapitalGains { get; set; }
    public string? Notes { get; set; }
}

public class UpdateHoldingRequest
{
    [StringLength(50)]
    public string? Symbol { get; set; }
    
    [StringLength(200)]
    public string? Name { get; set; }
    
    public int? AssetType { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal? Quantity { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal? AverageCostBasis { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal? CurrentPrice { get; set; }
    
    public decimal? AnnualDividendYield { get; set; }
    public decimal? StakingAPY { get; set; }
    public decimal? AnnualDividendIncome { get; set; }
    public DateTime? LastDividendDate { get; set; }
    public DateTime? NextDividendDate { get; set; }
    public decimal? Beta { get; set; }
    public string? SectorAllocation { get; set; }
    public string? GeographicAllocation { get; set; }
    public bool? IsQualifiedDividend { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public bool? IsLongTermCapitalGains { get; set; }
    public string? Notes { get; set; }
}

public class RefreshPricesResponse
{
    public int AccountId { get; set; }
    public int UpdatedCount { get; set; }
    public int FailedCount { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string>? Errors { get; set; }
    public decimal? NewAccountBalance { get; set; }
    public decimal? PreviousAccountBalance { get; set; }
}

public class PriceHistoryResponse
{
    public DateTime Date { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long Volume { get; set; }
    public decimal? AdjustedClose { get; set; }
    public decimal? Change { get; set; }
    public decimal? ChangePercent { get; set; }
}
