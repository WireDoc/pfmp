using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.DTOs;
using PFMP_API.Services;

namespace PFMP_API.Controllers;

/// <summary>
/// API endpoints for loan analytics, credit utilization, and debt payoff strategies
/// </summary>
[ApiController]
[Route("api/loan-analytics")]
public class LoanAnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LoanAnalyticsController> _logger;
    private readonly AmortizationService _amortizationService;
    private readonly CreditUtilizationService _creditUtilizationService;
    private readonly DebtPayoffService _debtPayoffService;

    public LoanAnalyticsController(
        ApplicationDbContext context,
        ILogger<LoanAnalyticsController> logger,
        AmortizationService amortizationService,
        CreditUtilizationService creditUtilizationService,
        DebtPayoffService debtPayoffService)
    {
        _context = context;
        _logger = logger;
        _amortizationService = amortizationService;
        _creditUtilizationService = creditUtilizationService;
        _debtPayoffService = debtPayoffService;
    }

    /// <summary>
    /// Get amortization schedule for a loan
    /// </summary>
    /// <param name="liabilityId">The liability account ID</param>
    [HttpGet("loans/{liabilityId}/amortization")]
    public async Task<ActionResult<AmortizationScheduleResponse>> GetAmortizationSchedule(int liabilityId)
    {
        var loan = await _context.LiabilityAccounts
            .FirstOrDefaultAsync(l => l.LiabilityAccountId == liabilityId);

        if (loan == null)
        {
            return NotFound(new { message = $"Liability account {liabilityId} not found" });
        }

        if (!loan.IsLoan)
        {
            return BadRequest(new { message = "Amortization is only available for loan accounts" });
        }

        var schedule = _amortizationService.GenerateAmortizationSchedule(loan);
        return Ok(schedule);
    }

    /// <summary>
    /// Calculate loan payoff with extra payments
    /// </summary>
    /// <param name="liabilityId">The liability account ID</param>
    /// <param name="request">Extra payment details</param>
    [HttpPost("loans/{liabilityId}/payoff-calculator")]
    public async Task<ActionResult<PayoffCalculatorResponse>> CalculatePayoff(
        int liabilityId, 
        [FromBody] PayoffCalculatorRequest request)
    {
        var loan = await _context.LiabilityAccounts
            .FirstOrDefaultAsync(l => l.LiabilityAccountId == liabilityId);

        if (loan == null)
        {
            return NotFound(new { message = $"Liability account {liabilityId} not found" });
        }

        var result = _amortizationService.CalculatePayoff(loan, request.ExtraMonthlyPayment);
        return Ok(result);
    }

    /// <summary>
    /// Get loan details and summary
    /// </summary>
    /// <param name="liabilityId">The liability account ID</param>
    [HttpGet("loans/{liabilityId}")]
    public async Task<ActionResult<LoanDetailsResponse>> GetLoanDetails(int liabilityId)
    {
        var loan = await _context.LiabilityAccounts
            .FirstOrDefaultAsync(l => l.LiabilityAccountId == liabilityId);

        if (loan == null)
        {
            return NotFound(new { message = $"Liability account {liabilityId} not found" });
        }

        if (!loan.IsLoan)
        {
            return BadRequest(new { message = "This endpoint is only available for loan accounts" });
        }

        var schedule = _amortizationService.GenerateAmortizationSchedule(loan);
        return Ok(schedule.LoanDetails);
    }

    /// <summary>
    /// Get credit utilization for a credit card
    /// </summary>
    /// <param name="liabilityId">The liability account ID</param>
    [HttpGet("credit-cards/{liabilityId}/utilization")]
    public async Task<ActionResult<CreditUtilizationResponse>> GetCreditUtilization(int liabilityId)
    {
        var creditCard = await _context.LiabilityAccounts
            .FirstOrDefaultAsync(l => l.LiabilityAccountId == liabilityId);

        if (creditCard == null)
        {
            return NotFound(new { message = $"Liability account {liabilityId} not found" });
        }

        if (!creditCard.IsCreditCard)
        {
            return BadRequest(new { message = "Utilization is only available for credit card accounts" });
        }

        var utilization = _creditUtilizationService.CalculateUtilization(creditCard);
        return Ok(utilization);
    }

    /// <summary>
    /// Get aggregate credit utilization for all of a user's credit cards
    /// </summary>
    /// <param name="userId">The user ID</param>
    [HttpGet("users/{userId}/credit-utilization")]
    public async Task<ActionResult<CreditUtilizationResponse>> GetUserCreditUtilization(int userId)
    {
        var creditCards = await _context.LiabilityAccounts
            .Where(l => l.UserId == userId && l.LiabilityType == "credit_card")
            .ToListAsync();

        if (!creditCards.Any())
        {
            return Ok(new CreditUtilizationResponse
            {
                UtilizationStatus = "N/A",
                UtilizationColor = "gray"
            });
        }

        var utilization = _creditUtilizationService.CalculateAggregateUtilization(creditCards);
        return Ok(utilization);
    }

    /// <summary>
    /// Get debt payoff strategy comparison for a user
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="extraMonthlyPayment">Optional extra monthly payment to apply</param>
    /// <param name="includeAutoLoans">Whether to include auto loans (default: true)</param>
    /// <param name="includeMortgages">Whether to include property mortgages (default: false)</param>
    [HttpGet("users/{userId}/payoff-strategies")]
    public async Task<ActionResult<DebtPayoffStrategiesResponse>> GetPayoffStrategies(
        int userId, 
        [FromQuery] decimal extraMonthlyPayment = 0,
        [FromQuery] bool includeAutoLoans = true,
        [FromQuery] bool includeMortgages = false)
    {
        var query = _context.LiabilityAccounts
            .Where(l => l.UserId == userId && l.CurrentBalance > 0);

        // Build list of excluded types
        var excludedTypes = new List<string>();
        if (!includeAutoLoans)
        {
            excludedTypes.Add("auto_loan");
        }
        // Always exclude mortgage from liabilities - we'll get them from Properties table if needed
        excludedTypes.Add("mortgage");

        if (excludedTypes.Any())
        {
            query = query.Where(l => !excludedTypes.Contains(l.LiabilityType));
        }

        var debts = await query.ToListAsync();

        // Include property mortgages if requested
        if (includeMortgages)
        {
            var propertyMortgages = await _context.Properties
                .Where(p => p.UserId == userId && p.MortgageBalance != null && p.MortgageBalance > 0)
                .ToListAsync();

            foreach (var property in propertyMortgages)
            {
                // Create a synthetic LiabilityAccount for each property mortgage
                var mortgageLiability = new Models.FinancialProfile.LiabilityAccount
                {
                    // Use a synthetic ID based on property (negative to avoid collision)
                    LiabilityAccountId = -Math.Abs(property.PropertyId.GetHashCode()),
                    UserId = userId,
                    LiabilityType = "mortgage",
                    Lender = property.PropertyName,
                    CurrentBalance = property.MortgageBalance ?? 0,
                    MinimumPayment = property.MonthlyMortgagePayment,
                    // Estimate typical mortgage rate if not stored
                    InterestRateApr = 6.5m, // TODO: Add MortgageInterestRate to Properties table
                    IsPriorityToEliminate = false,
                    CreatedAt = property.CreatedAt,
                    UpdatedAt = property.UpdatedAt
                };
                debts.Add(mortgageLiability);
            }
        }

        if (!debts.Any())
        {
            return Ok(new DebtPayoffStrategiesResponse
            {
                TotalDebt = 0,
                Debts = new List<DebtItem>()
            });
        }

        var strategies = _debtPayoffService.CompareStrategies(debts, extraMonthlyPayment);
        return Ok(strategies);
    }

    /// <summary>
    /// Get all loans for a user with details
    /// </summary>
    /// <param name="userId">The user ID</param>
    [HttpGet("users/{userId}/loans")]
    public async Task<ActionResult<List<LoanDetailsResponse>>> GetUserLoans(int userId)
    {
        var loans = await _context.LiabilityAccounts
            .Where(l => l.UserId == userId && 
                (l.LiabilityType == "mortgage" || 
                 l.LiabilityType == "auto_loan" || 
                 l.LiabilityType == "personal_loan" || 
                 l.LiabilityType == "student_loan"))
            .ToListAsync();

        var loanDetails = loans.Select(l => 
            _amortizationService.GenerateAmortizationSchedule(l).LoanDetails
        ).ToList();

        return Ok(loanDetails);
    }

    /// <summary>
    /// Get all credit cards for a user with utilization
    /// </summary>
    /// <param name="userId">The user ID</param>
    [HttpGet("users/{userId}/credit-cards")]
    public async Task<ActionResult<List<CreditUtilizationResponse>>> GetUserCreditCards(int userId)
    {
        var creditCards = await _context.LiabilityAccounts
            .Where(l => l.UserId == userId && l.LiabilityType == "credit_card")
            .ToListAsync();

        var utilizations = creditCards.Select(c => 
            _creditUtilizationService.CalculateUtilization(c)
        ).ToList();

        return Ok(utilizations);
    }
}
