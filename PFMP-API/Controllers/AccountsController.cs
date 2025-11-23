using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.DTOs;
using PFMP_API.DTOs;

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
        public async Task<ActionResult<Account>> PutAccount(int id, AccountUpdateRequest updateRequest)
        {
            try
            {
                var existingAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.AccountId == id);

                if (existingAccount == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                // Update only the allowed fields
                existingAccount.AccountName = updateRequest.Name;
                existingAccount.Institution = updateRequest.Institution;
                existingAccount.CurrentBalance = updateRequest.Balance;
                existingAccount.AccountNumber = updateRequest.AccountNumber;
                existingAccount.Purpose = updateRequest.Purpose;
                existingAccount.UpdatedAt = DateTime.UtcNow;
                existingAccount.LastBalanceUpdate = DateTime.UtcNow;

                // Parse and validate account type
                if (Enum.TryParse<AccountType>(updateRequest.Type, out var accountType))
                {
                    existingAccount.AccountType = accountType;
                }
                else
                {
                    return BadRequest($"Invalid account type: {updateRequest.Type}");
                }

                await _context.SaveChangesAsync();

                // Return the updated account
                return Ok(existingAccount);
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
        public async Task<ActionResult<Account>> PostAccount(AccountCreateRequest createRequest)
        {
            try
            {
                // Validate user exists
                var userExists = await _context.Users.AnyAsync(u => u.UserId == createRequest.UserId);
                if (!userExists)
                {
                    return NotFound($"User with ID {createRequest.UserId} not found");
                }

                // Parse and validate account type
                if (!Enum.TryParse<AccountType>(createRequest.Type, out var accountType))
                {
                    return BadRequest($"Invalid account type: {createRequest.Type}");
                }

                // Create new account
                var account = new Account
                {
                    UserId = createRequest.UserId,
                    AccountName = createRequest.Name,
                    Institution = createRequest.Institution,
                    AccountType = accountType,
                    CurrentBalance = createRequest.Balance,
                    AccountNumber = createRequest.AccountNumber,
                    Purpose = createRequest.Purpose,
                    State = "SKELETON",  // NEW: Start as SKELETON
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                };

                _context.Accounts.Add(account);
                await _context.SaveChangesAsync();

                // Create $CASH holding for SKELETON account
                var cashHolding = new Holding
                {
                    AccountId = account.AccountId,
                    Symbol = "$CASH",
                    Name = "Cash",
                    AssetType = AssetType.Cash,
                    Quantity = createRequest.Balance,
                    AverageCostBasis = 1.00m,
                    CurrentPrice = 1.00m,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Holdings.Add(cashHolding);
                await _context.SaveChangesAsync();

                // Create INITIAL_BALANCE transaction for $CASH
                var transaction = new Transaction
                {
                    AccountId = account.AccountId,
                    HoldingId = cashHolding.HoldingId,
                    TransactionType = "INITIAL_BALANCE",
                    Symbol = "$CASH",
                    Quantity = createRequest.Balance,
                    Price = 1.00m,
                    Amount = createRequest.Balance,
                    TransactionDate = DateTime.UtcNow,
                    SettlementDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetAccount", new { id = account.AccountId }, account);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account for user {UserId}", createRequest.UserId);
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

        // PATCH: api/Accounts/5/balance
        [HttpPatch("{id}/balance")]
        public async Task<IActionResult> UpdateBalance(int id, [FromBody] UpdateBalanceRequest request)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.Holdings)
                    .FirstOrDefaultAsync(a => a.AccountId == id);

                if (account == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                if (!account.IsSkeleton())
                {
                    return BadRequest("Cannot update balance on a DETAILED account. Balance is calculated from holdings.");
                }

                // Find the $CASH holding
                var cashHolding = account.Holdings?.FirstOrDefault(h => h.Symbol == "$CASH");
                if (cashHolding == null)
                {
                    return StatusCode(500, "SKELETON account missing $CASH holding");
                }

                // Update account balance
                var oldBalance = account.CurrentBalance;
                account.CurrentBalance = request.NewBalance;
                account.UpdatedAt = DateTime.UtcNow;
                account.LastBalanceUpdate = DateTime.UtcNow;

                // Update $CASH holding quantity
                cashHolding.Quantity = request.NewBalance;
                cashHolding.UpdatedAt = DateTime.UtcNow;

                // Create transaction for balance adjustment
                var adjustmentAmount = request.NewBalance - oldBalance;
                if (adjustmentAmount != 0)
                {
                    var transaction = new Transaction
                    {
                        AccountId = account.AccountId,
                        HoldingId = cashHolding.HoldingId,
                        TransactionType = adjustmentAmount > 0 ? "DEPOSIT" : "WITHDRAWAL",
                        Symbol = "$CASH",
                        Quantity = Math.Abs(adjustmentAmount),
                        Price = 1.00m,
                        Amount = adjustmentAmount,
                        TransactionDate = DateTime.UtcNow,
                        SettlementDate = DateTime.UtcNow,
                        Description = "Balance adjustment",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Transactions.Add(transaction);
                }

                await _context.SaveChangesAsync();

                return Ok(account);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating balance for account {AccountId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/Accounts/5/transition-to-detailed
        [HttpPost("{id}/transition-to-detailed")]
        public async Task<IActionResult> TransitionToDetailed(int id, [FromBody] TransitionToDetailedRequest request)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.Holdings)
                    .FirstOrDefaultAsync(a => a.AccountId == id);

                if (account == null)
                {
                    return NotFound($"Account with ID {id} not found");
                }

                if (!account.IsSkeleton())
                {
                    return BadRequest("Account is already DETAILED");
                }

                // Validate holdings total matches account balance
                var holdingsTotal = request.Holdings.Sum(h => h.Quantity * h.Price);
                if (Math.Abs(holdingsTotal - account.CurrentBalance) > 0.01m)
                {
                    return BadRequest($"Holdings total ({holdingsTotal:C}) must match account balance ({account.CurrentBalance:C})");
                }

                // Remove $CASH holding and its transactions
                var cashHolding = account.Holdings?.FirstOrDefault(h => h.Symbol == "$CASH");
                if (cashHolding != null)
                {
                    var cashTransactions = await _context.Transactions
                        .Where(t => t.HoldingId == cashHolding.HoldingId)
                        .ToListAsync();
                    _context.Transactions.RemoveRange(cashTransactions);
                    _context.Holdings.Remove(cashHolding);
                }

                // Create new holdings
                foreach (var holdingRequest in request.Holdings)
                {
                    var holding = new Holding
                    {
                        AccountId = account.AccountId,
                        Symbol = holdingRequest.Symbol,
                        Name = holdingRequest.Name ?? holdingRequest.Symbol,
                        AssetType = holdingRequest.AssetType,
                        Quantity = holdingRequest.Quantity,
                        AverageCostBasis = holdingRequest.Price,
                        CurrentPrice = holdingRequest.Price,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Holdings.Add(holding);
                    await _context.SaveChangesAsync(); // Save to get HoldingId

                    // Create BUY transaction for each holding
                    var transaction = new Transaction
                    {
                        AccountId = account.AccountId,
                        HoldingId = holding.HoldingId,
                        TransactionType = "BUY",
                        Symbol = holding.Symbol,
                        Quantity = holding.Quantity,
                        Price = holdingRequest.Price,
                        Amount = holding.Quantity * holdingRequest.Price,
                        TransactionDate = request.AcquisitionDate,
                        SettlementDate = request.AcquisitionDate,
                        Description = "Initial holding from setup wizard",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Transactions.Add(transaction);
                }

                // Transition account to DETAILED state
                account.State = "DETAILED";
                account.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(account);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transitioning account {AccountId} to DETAILED", id);
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