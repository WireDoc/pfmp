using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Services;
using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TransactionsController> _logger;
    private readonly HoldingsSyncService _holdingsSync;

    public TransactionsController(
        ApplicationDbContext context, 
        ILogger<TransactionsController> logger,
        HoldingsSyncService holdingsSync)
    {
        _context = context;
        _logger = logger;
        _holdingsSync = holdingsSync;
    }

    /// <summary>
    /// Get transactions with optional filtering by accountId, holdingId, and date range
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<TransactionResponse>>> GetTransactions(
        [FromQuery] int? accountId,
        [FromQuery] int? holdingId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? transactionType)
    {
        var query = _context.Transactions
            .Include(t => t.Account)
            .Include(t => t.Holding)
            .AsQueryable();

        if (accountId.HasValue)
            query = query.Where(t => t.AccountId == accountId.Value);

        if (holdingId.HasValue)
            query = query.Where(t => t.HoldingId == holdingId.Value);

        if (startDate.HasValue)
            query = query.Where(t => t.TransactionDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(t => t.TransactionDate <= endDate.Value);

        if (!string.IsNullOrEmpty(transactionType))
            query = query.Where(t => t.TransactionType == transactionType);

        var transactions = await query
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();

        return Ok(transactions.Select(t => MapToResponse(t)));
    }

    /// <summary>
    /// Get a single transaction by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TransactionResponse>> GetTransaction(int id)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Account)
            .Include(t => t.Holding)
            .FirstOrDefaultAsync(t => t.TransactionId == id);

        if (transaction == null)
        {
            return NotFound();
        }

        return Ok(MapToResponse(transaction));
    }

    /// <summary>
    /// Create a new transaction
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TransactionResponse>> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        // Verify account exists
        var account = await _context.Accounts.FindAsync(request.AccountId);
        if (account == null)
        {
            return BadRequest("Account not found");
        }

        // For investment transactions, get or create holding automatically
        Holding? holding = null;
        if (!string.IsNullOrEmpty(request.Symbol))
        {
            // Auto-create holding if needed
            holding = await _holdingsSync.GetOrCreateHoldingAsync(
                request.AccountId, 
                request.Symbol,
                request.Symbol, // Use symbol as name initially
                null); // Will infer asset type

            request.HoldingId = holding.HoldingId;
        }
        else if (request.HoldingId.HasValue)
        {
            // Verify holding exists if provided
            holding = await _context.Holdings.FindAsync(request.HoldingId.Value);
            if (holding == null)
            {
                return BadRequest("Holding not found");
            }
        }

        var transaction = new Transaction
        {
            AccountId = request.AccountId,
            HoldingId = request.HoldingId,
            TransactionType = request.TransactionType,
            Symbol = request.Symbol,
            Quantity = request.Quantity,
            Price = request.Price,
            Amount = request.Amount,
            Fee = request.Fee,
            TransactionDate = request.TransactionDate,
            SettlementDate = request.SettlementDate,
            IsTaxable = request.IsTaxable,
            IsLongTermCapitalGains = request.IsLongTermCapitalGains,
            TaxableAmount = request.TaxableAmount,
            CostBasis = request.CostBasis,
            CapitalGainLoss = request.CapitalGainLoss,
            Source = request.Source,
            ExternalTransactionId = request.ExternalTransactionId,
            Description = request.Description,
            IsDividendReinvestment = request.IsDividendReinvestment,
            IsQualifiedDividend = request.IsQualifiedDividend,
            StakingReward = request.StakingReward,
            StakingAPY = request.StakingAPY,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created transaction {TransactionId} ({Type}) for account {AccountId}", 
            transaction.TransactionId, transaction.TransactionType, transaction.AccountId);

        // Update holding quantities and cost basis
        if (holding != null)
        {
            await _holdingsSync.UpdateHoldingFromTransactionsAsync(holding.HoldingId);
        }

        // Reload to get navigation properties
        transaction = await _context.Transactions
            .Include(t => t.Account)
            .Include(t => t.Holding)
            .FirstAsync(t => t.TransactionId == transaction.TransactionId);

        return CreatedAtAction(nameof(GetTransaction), new { id = transaction.TransactionId }, MapToResponse(transaction));
    }

    /// <summary>
    /// Update an existing transaction
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<TransactionResponse>> UpdateTransaction(int id, [FromBody] UpdateTransactionRequest request)
    {
        var transaction = await _context.Transactions.FindAsync(id);
        if (transaction == null)
        {
            return NotFound();
        }

        // Update fields
        if (request.TransactionType != null) transaction.TransactionType = request.TransactionType;
        if (request.Symbol != null) transaction.Symbol = request.Symbol;
        if (request.Quantity.HasValue) transaction.Quantity = request.Quantity;
        if (request.Price.HasValue) transaction.Price = request.Price;
        if (request.Amount.HasValue) transaction.Amount = request.Amount.Value;
        if (request.Fee.HasValue) transaction.Fee = request.Fee;
        if (request.TransactionDate.HasValue) transaction.TransactionDate = request.TransactionDate.Value;
        if (request.SettlementDate.HasValue) transaction.SettlementDate = request.SettlementDate.Value;
        if (request.IsTaxable.HasValue) transaction.IsTaxable = request.IsTaxable.Value;
        if (request.IsLongTermCapitalGains.HasValue) transaction.IsLongTermCapitalGains = request.IsLongTermCapitalGains.Value;
        if (request.TaxableAmount.HasValue) transaction.TaxableAmount = request.TaxableAmount;
        if (request.CostBasis.HasValue) transaction.CostBasis = request.CostBasis;
        if (request.CapitalGainLoss.HasValue) transaction.CapitalGainLoss = request.CapitalGainLoss;
        if (request.Source.HasValue) transaction.Source = request.Source.Value;
        if (request.ExternalTransactionId != null) transaction.ExternalTransactionId = request.ExternalTransactionId;
        if (request.Description != null) transaction.Description = request.Description;
        if (request.IsDividendReinvestment.HasValue) transaction.IsDividendReinvestment = request.IsDividendReinvestment.Value;
        if (request.IsQualifiedDividend.HasValue) transaction.IsQualifiedDividend = request.IsQualifiedDividend.Value;
        if (request.StakingReward.HasValue) transaction.StakingReward = request.StakingReward;
        if (request.StakingAPY.HasValue) transaction.StakingAPY = request.StakingAPY;
        if (request.Notes != null) transaction.Notes = request.Notes;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated transaction {TransactionId} ({Type}) for account {AccountId}", 
            transaction.TransactionId, transaction.TransactionType, transaction.AccountId);

        // Update holding quantities if this affects a holding
        if (transaction.HoldingId.HasValue)
        {
            await _holdingsSync.UpdateHoldingFromTransactionsAsync(transaction.HoldingId.Value);
        }

        // Reload to get navigation properties
        transaction = await _context.Transactions
            .Include(t => t.Account)
            .Include(t => t.Holding)
            .FirstAsync(t => t.TransactionId == transaction.TransactionId);

        return Ok(MapToResponse(transaction));
    }

    /// <summary>
    /// Delete a transaction
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTransaction(int id)
    {
        var transaction = await _context.Transactions.FindAsync(id);
        if (transaction == null)
        {
            return NotFound();
        }

        var holdingId = transaction.HoldingId;

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted transaction {TransactionId} ({Type}) for account {AccountId}", 
            transaction.TransactionId, transaction.TransactionType, transaction.AccountId);

        // Update holding quantities after deleting transaction
        if (holdingId.HasValue)
        {
            await _holdingsSync.UpdateHoldingFromTransactionsAsync(holdingId.Value);
        }

        return NoContent();
    }

    private static TransactionResponse MapToResponse(Transaction transaction)
    {
        return new TransactionResponse
        {
            TransactionId = transaction.TransactionId,
            AccountId = transaction.AccountId,
            HoldingId = transaction.HoldingId,
            TransactionType = transaction.TransactionType,
            Symbol = transaction.Symbol,
            Quantity = transaction.Quantity,
            Price = transaction.Price,
            Amount = transaction.Amount,
            Fee = transaction.Fee,
            TransactionDate = transaction.TransactionDate,
            SettlementDate = transaction.SettlementDate,
            IsTaxable = transaction.IsTaxable,
            IsLongTermCapitalGains = transaction.IsLongTermCapitalGains,
            TaxableAmount = transaction.TaxableAmount,
            CostBasis = transaction.CostBasis,
            CapitalGainLoss = transaction.CapitalGainLoss,
            Source = transaction.Source.ToString(),
            ExternalTransactionId = transaction.ExternalTransactionId,
            Description = transaction.Description,
            IsDividendReinvestment = transaction.IsDividendReinvestment,
            IsQualifiedDividend = transaction.IsQualifiedDividend,
            StakingReward = transaction.StakingReward,
            StakingAPY = transaction.StakingAPY,
            CreatedAt = transaction.CreatedAt,
            Notes = transaction.Notes
        };
    }
}

public class TransactionResponse
{
    public int TransactionId { get; set; }
    public int AccountId { get; set; }
    public int? HoldingId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public string? Symbol { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Price { get; set; }
    public decimal Amount { get; set; }
    public decimal? Fee { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime SettlementDate { get; set; }
    public bool IsTaxable { get; set; }
    public bool IsLongTermCapitalGains { get; set; }
    public decimal? TaxableAmount { get; set; }
    public decimal? CostBasis { get; set; }
    public decimal? CapitalGainLoss { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? ExternalTransactionId { get; set; }
    public string? Description { get; set; }
    public bool IsDividendReinvestment { get; set; }
    public bool IsQualifiedDividend { get; set; }
    public decimal? StakingReward { get; set; }
    public decimal? StakingAPY { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Notes { get; set; }
}

public class CreateTransactionRequest
{
    [Required]
    public int AccountId { get; set; }
    
    public int? HoldingId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string TransactionType { get; set; } = string.Empty;
    
    [StringLength(20)]
    public string? Symbol { get; set; }
    
    public decimal? Quantity { get; set; }
    
    public decimal? Price { get; set; }
    
    [Required]
    public decimal Amount { get; set; }
    
    public decimal? Fee { get; set; }
    
    [Required]
    public DateTime TransactionDate { get; set; }
    
    [Required]
    public DateTime SettlementDate { get; set; }
    
    public bool IsTaxable { get; set; } = true;
    public bool IsLongTermCapitalGains { get; set; } = false;
    public decimal? TaxableAmount { get; set; }
    public decimal? CostBasis { get; set; }
    public decimal? CapitalGainLoss { get; set; }
    public TransactionSource Source { get; set; } = TransactionSource.Manual;
    
    [StringLength(100)]
    public string? ExternalTransactionId { get; set; }
    
    [StringLength(500)]
    public string? Description { get; set; }
    
    public bool IsDividendReinvestment { get; set; } = false;
    public bool IsQualifiedDividend { get; set; } = false;
    public decimal? StakingReward { get; set; }
    public decimal? StakingAPY { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTransactionRequest
{
    [StringLength(100)]
    public string? TransactionType { get; set; }
    
    [StringLength(20)]
    public string? Symbol { get; set; }
    
    public decimal? Quantity { get; set; }
    public decimal? Price { get; set; }
    public decimal? Amount { get; set; }
    public decimal? Fee { get; set; }
    public DateTime? TransactionDate { get; set; }
    public DateTime? SettlementDate { get; set; }
    public bool? IsTaxable { get; set; }
    public bool? IsLongTermCapitalGains { get; set; }
    public decimal? TaxableAmount { get; set; }
    public decimal? CostBasis { get; set; }
    public decimal? CapitalGainLoss { get; set; }
    public TransactionSource? Source { get; set; }
    
    [StringLength(100)]
    public string? ExternalTransactionId { get; set; }
    
    [StringLength(500)]
    public string? Description { get; set; }
    
    public bool? IsDividendReinvestment { get; set; }
    public bool? IsQualifiedDividend { get; set; }
    public decimal? StakingReward { get; set; }
    public decimal? StakingAPY { get; set; }
    public string? Notes { get; set; }
}
