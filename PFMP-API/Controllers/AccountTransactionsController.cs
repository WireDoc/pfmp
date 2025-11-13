using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API;
using PFMP_API.Models;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/accounts/{accountId}/transactions")]
public class AccountTransactionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AccountTransactionsController> _logger;

    public AccountTransactionsController(ApplicationDbContext context, ILogger<AccountTransactionsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get transaction history for an account
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountTransactionDto>>> GetTransactions(
        int accountId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? category = null,
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0)
    {
        try
        {
            // Verify account exists
            var accountExists = await _context.Accounts.AnyAsync(a => a.AccountId == accountId);
            if (!accountExists)
            {
                return NotFound($"Account {accountId} not found");
            }

            var query = _context.Transactions
                .Where(t => t.AccountId == accountId);

            // Apply date filters
            if (from.HasValue)
            {
                query = query.Where(t => t.TransactionDate >= from.Value);
            }

            if (to.HasValue)
            {
                query = query.Where(t => t.TransactionDate <= to.Value);
            }

            // Apply category filter
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(t => t.TransactionType == category);
            }

            // Order by date descending (most recent first)
            var transactions = await query
                .OrderByDescending(t => t.TransactionDate)
                .ThenByDescending(t => t.TransactionId)
                .Skip(offset)
                .Take(limit)
                .Select(t => new AccountTransactionDto
                {
                    TransactionId = t.TransactionId,
                    Date = t.TransactionDate,
                    Description = t.Description ?? t.TransactionType,
                    Category = t.TransactionType,
                    Amount = t.Amount,
                    BalanceAfter = 0, // Will be calculated if needed
                    CheckNumber = null, // Not yet in model
                    Memo = t.Notes
                })
                .ToListAsync();

            return Ok(transactions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching transactions for account {AccountId}", accountId);
            return StatusCode(500, "An error occurred while fetching transactions");
        }
    }

    /// <summary>
    /// Get account balance history
    /// </summary>
    [HttpGet("~/api/accounts/{accountId}/balance-history")]
    public async Task<ActionResult<IEnumerable<BalanceHistoryResponse>>> GetBalanceHistory(
        int accountId,
        [FromQuery] int days = 30)
    {
        try
        {
            // Verify account exists and get current balance
            var account = await _context.Accounts.FindAsync(accountId);
            if (account == null)
            {
                return NotFound($"Account {accountId} not found");
            }

            var fromDate = DateTime.UtcNow.AddDays(-days);

            // Get all transactions since fromDate
            var transactions = await _context.Transactions
                .Where(t => t.AccountId == accountId && t.TransactionDate >= fromDate)
                .OrderBy(t => t.TransactionDate)
                .Select(t => new { t.TransactionDate, t.Amount })
                .ToListAsync();

            // Calculate running balance for each day
            var balanceHistory = new List<BalanceHistoryResponse>();
            var currentBalance = account.CurrentBalance;

            // Work backwards from current balance
            for (int i = 0; i <= days; i++)
            {
                var date = DateTime.UtcNow.Date.AddDays(-i);
                
                // Subtract all transactions that occurred after this date
                var futureTransactions = transactions
                    .Where(t => t.TransactionDate.Date > date)
                    .Sum(t => t.Amount);

                var balanceOnDate = currentBalance - futureTransactions;

                balanceHistory.Add(new BalanceHistoryResponse
                {
                    Date = date,
                    Balance = balanceOnDate
                });
            }

            // Return in chronological order (oldest first)
            return Ok(balanceHistory.OrderBy(b => b.Date));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching balance history for account {AccountId}", accountId);
            return StatusCode(500, "An error occurred while fetching balance history");
        }
    }

    /// <summary>
    /// Get interest earned summary for an account
    /// </summary>
    [HttpGet("~/api/accounts/{accountId}/interest-summary")]
    public async Task<ActionResult<InterestSummaryResponse>> GetInterestSummary(
        int accountId,
        [FromQuery] int year = 0)
    {
        try
        {
            // Verify account exists
            var accountExists = await _context.Accounts.AnyAsync(a => a.AccountId == accountId);
            if (!accountExists)
            {
                return NotFound($"Account {accountId} not found");
            }

            // Default to current year if not specified
            if (year == 0)
            {
                year = DateTime.UtcNow.Year;
            }

            // Get all interest transactions for the year (UTC timestamps for PostgreSQL)
            var startDate = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var endDate = new DateTime(year, 12, 31, 23, 59, 59, DateTimeKind.Utc);

            var interestTransactions = await _context.Transactions
                .Where(t => t.AccountId == accountId &&
                           t.TransactionType == TransactionTypes.InterestEarned &&
                           t.TransactionDate >= startDate &&
                           t.TransactionDate <= endDate)
                .ToListAsync();

            var totalInterest = interestTransactions.Sum(t => t.Amount);

            // Group by month
            var monthlyBreakdown = interestTransactions
                .GroupBy(t => t.TransactionDate.Month)
                .Select(g => new MonthlyInterest
                {
                    Month = g.Key,
                    Amount = g.Sum(t => t.Amount)
                })
                .OrderBy(m => m.Month)
                .ToList();

            return Ok(new InterestSummaryResponse
            {
                Year = year,
                TotalInterestEarned = totalInterest,
                MonthlyBreakdown = monthlyBreakdown
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching interest summary for account {AccountId}", accountId);
            return StatusCode(500, "An error occurred while fetching interest summary");
        }
    }
}

// Response DTOs
public class AccountTransactionDto
{
    public int TransactionId { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? CheckNumber { get; set; }
    public string? Memo { get; set; }
}

public class BalanceHistoryResponse
{
    public DateTime Date { get; set; }
    public decimal Balance { get; set; }
}

public class InterestSummaryResponse
{
    public int Year { get; set; }
    public decimal TotalInterestEarned { get; set; }
    public List<MonthlyInterest> MonthlyBreakdown { get; set; } = new();
}

public class MonthlyInterest
{
    public int Month { get; set; }
    public decimal Amount { get; set; }
}
