using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API;
using PFMP_API.Models;

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
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? offset = null)
    {
        try
        {
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
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(t => t.Category == category);
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
                query = query.Where(t => t.TransactionDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(t => t.TransactionDate <= endDate.Value);
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
            _logger.LogError(ex, "Error retrieving transactions for cash account {CashAccountId}", cashAccountId);
            return StatusCode(500, new { message = "An error occurred while retrieving transactions" });
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
                .ToListAsync();

            // Calculate running balance
            var balanceHistory = new List<BalanceHistoryDto>();
            decimal runningBalance = account.Balance;

            // Work backwards from current balance to get starting balance
            for (int i = transactions.Count - 1; i >= 0; i--)
            {
                runningBalance -= transactions[i].Amount;
            }

            // Add starting balance at the cutoff date
            balanceHistory.Add(new BalanceHistoryDto
            {
                Date = cutoffDate,
                Balance = runningBalance
            });

            // Now work forward, adding balance after each transaction
            foreach (var transaction in transactions)
            {
                runningBalance += transaction.Amount;
                balanceHistory.Add(new BalanceHistoryDto
                {
                    Date = transaction.TransactionDate,
                    Balance = runningBalance
                });
            }

            // Add current balance at end of period
            balanceHistory.Add(new BalanceHistoryDto
            {
                Date = DateTime.UtcNow,
                Balance = account.Balance
            });

            return Ok(balanceHistory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving balance history for cash account {CashAccountId}", cashAccountId);
            return StatusCode(500, new { message = "An error occurred while retrieving balance history" });
        }
    }
}

// DTOs
public class CashTransactionDto
{
    public int CashTransactionId { get; set; }
    public Guid CashAccountId { get; set; }
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
