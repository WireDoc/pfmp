using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountsController> _logger;

        public AccountsController(ApplicationDbContext context, ILogger<AccountsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Accounts/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Account>>> GetAccountsByUser(int userId)
        {
            try
            {
                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId)
                    .Include(a => a.Holdings)
                    .Include(a => a.Transactions.Take(10)) // Latest 10 transactions
                    .OrderBy(a => a.AccountType)
                    .ThenBy(a => a.AccountName)
                    .ToListAsync();

                return accounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving accounts for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Accounts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Account>> GetAccount(int id)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.Holdings)
                    .Include(a => a.Transactions)
                    .Include(a => a.APICredentials)
                    .FirstOrDefaultAsync(a => a.AccountId == id);

                if (account == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                return account;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving account {AccountId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/Accounts/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAccount(int id, Account account)
        {
            if (id != account.AccountId)
            {
                return BadRequest("Account ID mismatch");
            }

            try
            {
                account.UpdatedAt = DateTime.UtcNow;
                account.LastBalanceUpdate = DateTime.UtcNow;
                
                _context.Entry(account).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AccountExists(id))
                {
                    return NotFound($"Account with ID {id} not found");
                }
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account {AccountId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/Accounts
        [HttpPost]
        public async Task<ActionResult<Account>> PostAccount(Account account)
        {
            try
            {
                account.CreatedAt = DateTime.UtcNow;
                account.UpdatedAt = DateTime.UtcNow;
                account.LastBalanceUpdate = DateTime.UtcNow;
                account.IsActive = true;

                _context.Accounts.Add(account);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetAccount", new { id = account.AccountId }, account);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account");
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/Accounts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAccount(int id)
        {
            try
            {
                var account = await _context.Accounts.FindAsync(id);
                if (account == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                _context.Accounts.Remove(account);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account {AccountId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/Accounts/5/tsp-allocation
        [HttpPost("{id}/tsp-allocation")]
        public async Task<IActionResult> UpdateTSPAllocation(int id, [FromBody] TSPAllocation tspAllocation)
        {
            try
            {
                var account = await _context.Accounts.FindAsync(id);
                if (account == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                if (account.AccountType != AccountType.TSP)
                {
                    return BadRequest("Account is not a TSP account");
                }

                // Validate allocation percentages sum to 100
                var total = tspAllocation.GFundPercentage +
                           tspAllocation.FFundPercentage +
                           tspAllocation.CFundPercentage +
                           tspAllocation.SFundPercentage +
                           tspAllocation.IFundPercentage;

                if (Math.Abs(total - 100) > 0.01m)
                {
                    return BadRequest($"TSP allocation percentages must sum to 100%. Current total: {total}%");
                }

                tspAllocation.LastUpdated = DateTime.UtcNow;
                account.TSPAllocation = tspAllocation;
                account.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating TSP allocation for account {AccountId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Accounts/5/performance
        [HttpGet("{id}/performance")]
        public async Task<ActionResult<object>> GetAccountPerformance(int id)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.Holdings)
                    .Include(a => a.Transactions.OrderByDescending(t => t.TransactionDate).Take(30))
                    .FirstOrDefaultAsync(a => a.AccountId == id);

                if (account == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                var currentValue = account.CurrentBalance;
                var totalInvested = account.Transactions
                    .Where(t => t.TransactionType == "Buy" || t.TransactionType == "Deposit")
                    .Sum(t => t.Amount);
                
                var totalWithdrawn = account.Transactions
                    .Where(t => t.TransactionType == "Sell" || t.TransactionType == "Withdrawal")
                    .Sum(t => t.Amount);

                var netInvested = totalInvested - totalWithdrawn;
                var unrealizedGainLoss = currentValue - netInvested;
                var gainLossPercentage = netInvested != 0 ? (unrealizedGainLoss / netInvested) * 100 : 0;

                var monthlyDividends = account.Holdings
                    .Where(h => h.AnnualDividendIncome.HasValue)
                    .Sum(h => h.AnnualDividendIncome!.Value) / 12;

                var performance = new
                {
                    AccountId = id,
                    AccountName = account.AccountName,
                    CurrentValue = currentValue,
                    TotalInvested = totalInvested,
                    TotalWithdrawn = totalWithdrawn,
                    NetInvested = netInvested,
                    UnrealizedGainLoss = unrealizedGainLoss,
                    GainLossPercentage = Math.Round(gainLossPercentage, 2),
                    MonthlyDividendIncome = monthlyDividends,
                    AnnualDividendIncome = monthlyDividends * 12,
                    LastUpdated = account.LastBalanceUpdate,
                    InterestRate = account.InterestRate,
                    IsEmergencyFund = account.IsEmergencyFund
                };

                return performance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating performance for account {AccountId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Accounts/cash-optimization/user/5
        [HttpGet("cash-optimization/user/{userId}")]
        public async Task<ActionResult<object>> GetCashOptimizationData(int userId)
        {
            try
            {
                var cashAccounts = await _context.Accounts
                    .Where(a => a.UserId == userId && 
                          (a.AccountType == AccountType.Savings || 
                           a.AccountType == AccountType.Checking ||
                           a.AccountType == AccountType.MoneyMarket ||
                           a.AccountType == AccountType.CertificateOfDeposit))
                    .OrderByDescending(a => a.InterestRate ?? 0)
                    .ToListAsync();

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                var totalCashBalance = cashAccounts.Sum(a => a.CurrentBalance);
                var emergencyFundTarget = user.EmergencyFundTarget;
                var excessCash = Math.Max(0, totalCashBalance - emergencyFundTarget);
                
                var weightedAverageRate = totalCashBalance > 0 ? cashAccounts.Sum(a => 
                    (a.InterestRate ?? 0) * (a.CurrentBalance / totalCashBalance)) : 0;

                var optimization = new
                {
                    UserId = userId,
                    TotalCashBalance = totalCashBalance,
                    EmergencyFundTarget = emergencyFundTarget,
                    ExcessCash = excessCash,
                    WeightedAverageRate = Math.Round(weightedAverageRate, 4),
                    CashAccounts = cashAccounts.Select(a => new
                    {
                        a.AccountId,
                        a.AccountName,
                        a.AccountType,
                        a.CurrentBalance,
                        InterestRate = a.InterestRate ?? 0,
                        a.IsEmergencyFund,
                        a.Institution,
                        MonthlyInterest = (a.CurrentBalance * (a.InterestRate ?? 0) / 100) / 12,
                        a.InterestRateUpdatedAt
                    }).OrderByDescending(a => a.InterestRate),
                    Recommendations = new List<object>()
                };

                return optimization;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving cash optimization data for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        private bool AccountExists(int id)
        {
            return _context.Accounts.Any(e => e.AccountId == id);
        }
    }
}