using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HoldingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<HoldingsController> _logger;

    public HoldingsController(ApplicationDbContext context, ILogger<HoldingsController> logger)
    {
        _context = context;
        _logger = logger;
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
        if (request.Name != null) holding.Name = request.Name;
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
    [StringLength(200)]
    public string? Name { get; set; }
    
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
