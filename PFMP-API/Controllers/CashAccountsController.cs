using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.FinancialProfile;
using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CashAccountsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CashAccountsController> _logger;

    public CashAccountsController(ApplicationDbContext context, ILogger<CashAccountsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all cash accounts for a user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<CashAccountResponse>>> GetAccounts([FromQuery] int userId)
    {
        var accounts = await _context.CashAccounts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(accounts.Select(a => new CashAccountResponse
        {
            CashAccountId = a.CashAccountId.ToString(),
            UserId = a.UserId,
            Institution = a.Institution,
            Nickname = a.Nickname,
            AccountType = a.AccountType,
            Balance = a.Balance,
            InterestRateApr = a.InterestRateApr,
            Purpose = a.Purpose,
            IsEmergencyFund = a.IsEmergencyFund,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        }));
    }

    /// <summary>
    /// Get a single cash account by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<CashAccountResponse>> GetAccount(string id)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return BadRequest("Invalid account ID format");
        }

        var account = await _context.CashAccounts.FindAsync(guid);
        if (account == null)
        {
            return NotFound();
        }

        return Ok(new CashAccountResponse
        {
            CashAccountId = account.CashAccountId.ToString(),
            UserId = account.UserId,
            Institution = account.Institution,
            Nickname = account.Nickname,
            AccountType = account.AccountType,
            Balance = account.Balance,
            InterestRateApr = account.InterestRateApr,
            Purpose = account.Purpose,
            IsEmergencyFund = account.IsEmergencyFund,
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt
        });
    }

    /// <summary>
    /// Create a new cash account
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CashAccountResponse>> CreateAccount([FromBody] CreateCashAccountRequest request)
    {
        var account = new CashAccount
        {
            UserId = request.UserId,
            Institution = request.Institution,
            Nickname = request.Nickname,
            AccountType = request.AccountType,
            Balance = request.Balance,
            InterestRateApr = request.InterestRateApr,
            Purpose = request.Purpose,
            IsEmergencyFund = request.IsEmergencyFund,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashAccounts.Add(account);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created cash account {AccountId} for user {UserId}", account.CashAccountId, account.UserId);

        var response = new CashAccountResponse
        {
            CashAccountId = account.CashAccountId.ToString(),
            UserId = account.UserId,
            Institution = account.Institution,
            Nickname = account.Nickname,
            AccountType = account.AccountType,
            Balance = account.Balance,
            InterestRateApr = account.InterestRateApr,
            Purpose = account.Purpose,
            IsEmergencyFund = account.IsEmergencyFund,
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt
        };

        return CreatedAtAction(nameof(GetAccount), new { id = account.CashAccountId.ToString() }, response);
    }

    /// <summary>
    /// Update an existing cash account
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<CashAccountResponse>> UpdateAccount(string id, [FromBody] UpdateCashAccountRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return BadRequest("Invalid account ID format");
        }

        var account = await _context.CashAccounts.FindAsync(guid);
        if (account == null)
        {
            return NotFound();
        }

        // Update fields
        if (request.Institution != null) account.Institution = request.Institution;
        if (request.Nickname != null) account.Nickname = request.Nickname;
        if (request.AccountType != null) account.AccountType = request.AccountType;
        if (request.Balance.HasValue) account.Balance = request.Balance.Value;
        if (request.InterestRateApr.HasValue) account.InterestRateApr = request.InterestRateApr;
        if (request.Purpose != null) account.Purpose = request.Purpose;
        if (request.IsEmergencyFund.HasValue) account.IsEmergencyFund = request.IsEmergencyFund.Value;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated cash account {AccountId} for user {UserId}", account.CashAccountId, account.UserId);

        return Ok(new CashAccountResponse
        {
            CashAccountId = account.CashAccountId.ToString(),
            UserId = account.UserId,
            Institution = account.Institution,
            Nickname = account.Nickname,
            AccountType = account.AccountType,
            Balance = account.Balance,
            InterestRateApr = account.InterestRateApr,
            Purpose = account.Purpose,
            IsEmergencyFund = account.IsEmergencyFund,
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt
        });
    }

    /// <summary>
    /// Delete a cash account
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteAccount(string id)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return BadRequest("Invalid account ID format");
        }

        var account = await _context.CashAccounts.FindAsync(guid);
        if (account == null)
        {
            return NotFound();
        }

        _context.CashAccounts.Remove(account);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted cash account {AccountId} for user {UserId}", account.CashAccountId, account.UserId);

        return NoContent();
    }
}

public class CashAccountResponse
{
    public string CashAccountId { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string? Institution { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal? InterestRateApr { get; set; }
    public string? Purpose { get; set; }
    public bool IsEmergencyFund { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCashAccountRequest
{
    [Required]
    public int UserId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Institution { get; set; } = string.Empty;
    
    [Required]
    [StringLength(200)]
    public string Nickname { get; set; } = string.Empty;
    
    [StringLength(40)]
    public string AccountType { get; set; } = "checking";
    
    [Required]
    public decimal Balance { get; set; }
    
    public decimal? InterestRateApr { get; set; }
    
    [StringLength(500)]
    public string? Purpose { get; set; }
    
    public bool IsEmergencyFund { get; set; }
}

public class UpdateCashAccountRequest
{
    [StringLength(100)]
    public string? Institution { get; set; }
    
    [StringLength(200)]
    public string? Nickname { get; set; }
    
    [StringLength(40)]
    public string? AccountType { get; set; }
    
    public decimal? Balance { get; set; }
    
    public decimal? InterestRateApr { get; set; }
    
    [StringLength(500)]
    public string? Purpose { get; set; }
    
    public bool? IsEmergencyFund { get; set; }
}
