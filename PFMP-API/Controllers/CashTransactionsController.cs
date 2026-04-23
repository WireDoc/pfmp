using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API;
using PFMP_API.Models;
using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Controllers;

// [Authorize] // Commented out - authentication not yet configured for development
[ApiController]
[Route("api/cash-accounts/{cashAccountId}/transactions")]
public class CashTransactionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CashTransactionsController> _logger;

    public CashTransactionsController(
        ApplicationDbContext context,
        ILogger<CashTransactionsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get transactions for a cash account with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CashTransactionDto>>> GetTransactions(
        Guid cashAccountId,
        [FromQuery] string? transactionType = null,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? offset = null)
    {
        try
        {
            // Debug logging
            Console.WriteLine($"GetTransactions called - AccountId: {cashAccountId}, StartDate: {startDate}, EndDate: {endDate}, TransactionType: {transactionType}");
            
            // Verify account exists and user has access
            var account = await _context.CashAccounts
                .FirstOrDefaultAsync(a => a.CashAccountId == cashAccountId);

            if (account == null)
            {
                return NotFound(new { message = "Cash account not found" });
            }

            var query = _context.CashTransactions
                .Where(t => t.CashAccountId == cashAccountId);

            // Apply filters
            if (!string.IsNullOrEmpty(transactionType))
            {
                query = query.Where(t => t.TransactionType == transactionType);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(t =>
                    (t.Description != null && t.Description.Contains(search)) ||
                    (t.Merchant != null && t.Merchant.Contains(search)) ||
                    (t.Category != null && t.Category.Contains(search)));
            }

            if (startDate.HasValue)
            {
                // Convert to UTC to satisfy PostgreSQL timestamp with time zone requirement
                var startDateUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
                query = query.Where(t => t.TransactionDate >= startDateUtc);
            }

            if (endDate.HasValue)
            {
                // Convert to UTC and set to end of day
                var endDateUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                query = query.Where(t => t.TransactionDate <= endDateUtc);
            }

            // Order by date descending
            query = query.OrderByDescending(t => t.TransactionDate);

            // Apply pagination
            if (offset.HasValue)
            {
                query = query.Skip(offset.Value);
            }

            if (limit.HasValue)
            {
                query = query.Take(limit.Value);
            }

            var transactions = await query.ToListAsync();

            // Calculate running balances (need to work backwards from current balance)
            // Since transactions are ordered descending (newest first), we start with current balance
            // and subtract as we go back in time
            decimal runningBalance = account.Balance;
            var dtos = new List<CashTransactionDto>();

            foreach (var t in transactions)
            {
                var dto = new CashTransactionDto
                {
                    CashTransactionId = t.CashTransactionId,
                    CashAccountId = t.CashAccountId,
                    TransactionType = t.TransactionType,
                    Amount = t.Amount,
                    TransactionDate = t.TransactionDate,
                    Description = t.Description,
                    Category = t.Category,
                    Merchant = t.Merchant,
                    CheckNumber = t.CheckNumber,
                    Fee = t.Fee,
                    Tags = t.Tags,
                    IsPending = t.IsPending,
                    IsRecurring = t.IsRecurring,
                    Notes = t.Notes,
                    BalanceAfter = runningBalance
                };
                dtos.Add(dto);
                
                // Move backwards in time by subtracting this transaction
                runningBalance -= t.Amount;
            }

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transactions for cash account {CashAccountId}. StartDate: {StartDate}, EndDate: {EndDate}, TransactionType: {TransactionType}", 
                cashAccountId, startDate, endDate, transactionType);
            Console.WriteLine($"ERROR in GetTransactions: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "An error occurred while retrieving transactions", error = ex.Message });
        }
    }

    /// <summary>
    /// Get balance history for a cash account
    /// </summary>
    [HttpGet("balance-history")]
    public async Task<ActionResult<IEnumerable<BalanceHistoryDto>>> GetBalanceHistory(
        Guid cashAccountId,
        [FromQuery] int days = 30)
    {
        try
        {
            var account = await _context.CashAccounts
                .FirstOrDefaultAsync(a => a.CashAccountId == cashAccountId);

            if (account == null)
            {
                return NotFound(new { message = "Cash account not found" });
            }

            var cutoffDate = DateTime.UtcNow.AddDays(-days);

            var transactions = await _context.CashTransactions
                .Where(t => t.CashAccountId == cashAccountId && t.TransactionDate >= cutoffDate)
                .OrderBy(t => t.TransactionDate)
                .Select(t => new { t.TransactionDate, t.Amount })
                .ToListAsync();

            // Generate a data point for every day in the period (same approach as investment accounts)
            var balanceHistory = new List<BalanceHistoryDto>();
            var currentBalance = account.Balance;

            for (int i = days; i >= 0; i--)
            {
                var date = DateTime.UtcNow.Date.AddDays(-i);

                // Subtract all transactions that occurred after this date
                var futureAmount = transactions
                    .Where(t => t.TransactionDate.Date > date)
                    .Sum(t => t.Amount);

                balanceHistory.Add(new BalanceHistoryDto
                {
                    Date = date,
                    Balance = currentBalance - futureAmount
                });
            }

            return Ok(balanceHistory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving balance history for cash account {CashAccountId}", cashAccountId);
            return StatusCode(500, new { message = "An error occurred while retrieving balance history" });
        }
    }

    /// <summary>
    /// Create a manual transaction for a cash account. Adjusts the account balance.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CashTransactionDto>> CreateTransaction(
        Guid cashAccountId,
        [FromBody] CreateCashTransactionRequest request)
    {
        try
        {
            var account = await _context.CashAccounts.FirstOrDefaultAsync(a => a.CashAccountId == cashAccountId);
            if (account == null)
            {
                return NotFound(new { message = "Cash account not found" });
            }

            if (string.IsNullOrWhiteSpace(request.TransactionType))
            {
                return BadRequest(new { message = "TransactionType is required" });
            }

            if (request.Amount == 0)
            {
                return BadRequest(new { message = "Amount cannot be zero" });
            }

            var txDate = request.TransactionDate.HasValue
                ? DateTime.SpecifyKind(request.TransactionDate.Value, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var transaction = new CashTransaction
            {
                CashAccountId = cashAccountId,
                TransactionType = request.TransactionType,
                Amount = request.Amount,
                TransactionDate = txDate,
                Description = request.Description,
                Category = request.Category,
                Merchant = request.Merchant,
                CheckNumber = request.CheckNumber,
                Fee = request.Fee,
                Tags = request.Tags,
                IsPending = request.IsPending ?? false,
                IsRecurring = request.IsRecurring ?? false,
                Notes = request.Notes,
                Source = "Manual",
                CreatedAt = DateTime.UtcNow
            };

            _context.CashTransactions.Add(transaction);

            // Adjust account balance by the signed amount
            account.Balance += request.Amount;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Created manual cash transaction {TxId} for account {AccountId}: {Type} {Amount:C}",
                transaction.CashTransactionId, cashAccountId, request.TransactionType, request.Amount);

            return CreatedAtAction(nameof(GetTransactions), new { cashAccountId }, MapToDto(transaction));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating cash transaction for account {CashAccountId}", cashAccountId);
            return StatusCode(500, new { message = "An error occurred while creating the transaction" });
        }
    }

    /// <summary>
    /// Update an existing cash transaction. Adjusts the account balance for amount changes.
    /// </summary>
    [HttpPut("{transactionId:int}")]
    public async Task<ActionResult<CashTransactionDto>> UpdateTransaction(
        Guid cashAccountId,
        int transactionId,
        [FromBody] UpdateCashTransactionRequest request)
    {
        try
        {
            var account = await _context.CashAccounts.FirstOrDefaultAsync(a => a.CashAccountId == cashAccountId);
            if (account == null)
            {
                return NotFound(new { message = "Cash account not found" });
            }

            var transaction = await _context.CashTransactions
                .FirstOrDefaultAsync(t => t.CashTransactionId == transactionId && t.CashAccountId == cashAccountId);
            if (transaction == null)
            {
                return NotFound(new { message = "Transaction not found" });
            }

            // Track the original amount so we can rebalance the account
            var originalAmount = transaction.Amount;

            if (request.TransactionType != null) transaction.TransactionType = request.TransactionType;
            if (request.Amount.HasValue) transaction.Amount = request.Amount.Value;
            if (request.TransactionDate.HasValue)
            {
                transaction.TransactionDate = DateTime.SpecifyKind(request.TransactionDate.Value, DateTimeKind.Utc);
            }
            if (request.Description != null) transaction.Description = request.Description;
            if (request.Category != null) transaction.Category = request.Category;
            if (request.Merchant != null) transaction.Merchant = request.Merchant;
            if (request.CheckNumber != null) transaction.CheckNumber = request.CheckNumber;
            if (request.Fee.HasValue) transaction.Fee = request.Fee;
            if (request.Tags != null) transaction.Tags = request.Tags;
            if (request.IsPending.HasValue) transaction.IsPending = request.IsPending.Value;
            if (request.IsRecurring.HasValue) transaction.IsRecurring = request.IsRecurring.Value;
            if (request.Notes != null) transaction.Notes = request.Notes;

            transaction.UpdatedAt = DateTime.UtcNow;

            // Rebalance the account by the delta
            if (request.Amount.HasValue && request.Amount.Value != originalAmount)
            {
                account.Balance += (request.Amount.Value - originalAmount);
                account.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(MapToDto(transaction));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cash transaction {TxId}", transactionId);
            return StatusCode(500, new { message = "An error occurred while updating the transaction" });
        }
    }

    /// <summary>
    /// Delete a cash transaction. Reverses its effect on the account balance.
    /// </summary>
    [HttpDelete("{transactionId:int}")]
    public async Task<IActionResult> DeleteTransaction(Guid cashAccountId, int transactionId)
    {
        try
        {
            var account = await _context.CashAccounts.FirstOrDefaultAsync(a => a.CashAccountId == cashAccountId);
            if (account == null)
            {
                return NotFound(new { message = "Cash account not found" });
            }

            var transaction = await _context.CashTransactions
                .FirstOrDefaultAsync(t => t.CashTransactionId == transactionId && t.CashAccountId == cashAccountId);
            if (transaction == null)
            {
                return NotFound(new { message = "Transaction not found" });
            }

            // Reverse balance impact
            account.Balance -= transaction.Amount;
            account.UpdatedAt = DateTime.UtcNow;

            _context.CashTransactions.Remove(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Deleted cash transaction {TxId} from account {AccountId}, reversed {Amount:C}",
                transactionId, cashAccountId, transaction.Amount);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting cash transaction {TxId}", transactionId);
            return StatusCode(500, new { message = "An error occurred while deleting the transaction" });
        }
    }

    private static CashTransactionDto MapToDto(CashTransaction t) => new()
    {
        CashTransactionId = t.CashTransactionId,
        CashAccountId = t.CashAccountId,
        LiabilityAccountId = t.LiabilityAccountId,
        TransactionType = t.TransactionType,
        Amount = t.Amount,
        TransactionDate = t.TransactionDate,
        Description = t.Description,
        Category = t.Category,
        Merchant = t.Merchant,
        CheckNumber = t.CheckNumber,
        Fee = t.Fee,
        Tags = t.Tags,
        IsPending = t.IsPending,
        IsRecurring = t.IsRecurring,
        Notes = t.Notes
    };
}

// DTOs
public class CashTransactionDto
{
    public int CashTransactionId { get; set; }
    public Guid? CashAccountId { get; set; }
    public int? LiabilityAccountId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Merchant { get; set; }
    public string? CheckNumber { get; set; }
    public decimal? Fee { get; set; }
    public string? Tags { get; set; }
    public bool IsPending { get; set; }
    public bool IsRecurring { get; set; }
    public string? Notes { get; set; }
    public decimal? BalanceAfter { get; set; }
}

public class BalanceHistoryDto
{
    public DateTime Date { get; set; }
    public decimal Balance { get; set; }
}

public class CreateCashTransactionRequest
{
    [Required]
    [MaxLength(50)]
    public string TransactionType { get; set; } = string.Empty;

    [Required]
    public decimal Amount { get; set; }

    public DateTime? TransactionDate { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    [MaxLength(200)]
    public string? Merchant { get; set; }

    [MaxLength(20)]
    public string? CheckNumber { get; set; }

    public decimal? Fee { get; set; }

    [MaxLength(500)]
    public string? Tags { get; set; }

    public bool? IsPending { get; set; }
    public bool? IsRecurring { get; set; }
    public string? Notes { get; set; }
}

public class UpdateCashTransactionRequest
{
    [MaxLength(50)]
    public string? TransactionType { get; set; }

    public decimal? Amount { get; set; }

    public DateTime? TransactionDate { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    [MaxLength(200)]
    public string? Merchant { get; set; }

    [MaxLength(20)]
    public string? CheckNumber { get; set; }

    public decimal? Fee { get; set; }

    [MaxLength(500)]
    public string? Tags { get; set; }

    public bool? IsPending { get; set; }
    public bool? IsRecurring { get; set; }
    public string? Notes { get; set; }
}
