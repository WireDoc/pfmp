using PFMP_API.DTOs;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services;

/// <summary>
/// Service for calculating credit card utilization and status
/// </summary>
public class CreditUtilizationService
{
    private readonly ILogger<CreditUtilizationService> _logger;

    public CreditUtilizationService(ILogger<CreditUtilizationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Calculate credit utilization for a credit card account
    /// </summary>
    public CreditUtilizationResponse CalculateUtilization(LiabilityAccount creditCard)
    {
        if (!creditCard.IsCreditCard)
        {
            _logger.LogWarning("Attempted to calculate credit utilization for non-credit card account {Id}", 
                creditCard.LiabilityAccountId);
            return CreateEmptyResponse(creditCard);
        }

        var creditLimit = creditCard.CreditLimit ?? 0;
        var currentBalance = creditCard.CurrentBalance;
        var availableCredit = Math.Max(0, creditLimit - currentBalance);
        
        decimal utilizationPercent = 0;
        if (creditLimit > 0)
        {
            utilizationPercent = Math.Round((currentBalance / creditLimit) * 100, 1);
        }

        var (status, color) = GetUtilizationStatus(utilizationPercent);

        return new CreditUtilizationResponse
        {
            LiabilityAccountId = creditCard.LiabilityAccountId,
            Lender = creditCard.Lender,
            CurrentBalance = currentBalance,
            CreditLimit = creditLimit,
            AvailableCredit = availableCredit,
            UtilizationPercent = utilizationPercent,
            UtilizationStatus = status,
            UtilizationColor = color,
            InterestRate = creditCard.InterestRateApr,
            MinimumPayment = creditCard.MinimumPayment,
            PaymentDueDate = creditCard.PaymentDueDate,
            StatementBalance = creditCard.StatementBalance
        };
    }

    /// <summary>
    /// Get utilization status and color based on percentage
    /// </summary>
    /// <remarks>
    /// Credit utilization guidelines:
    /// - Under 30%: Excellent/Good (green) - optimal for credit score
    /// - 30-50%: Fair (yellow) - may impact credit score
    /// - Over 50%: Poor (red) - likely impacting credit score negatively
    /// - Over 100%: Critical (red) - over limit
    /// </remarks>
    public (string Status, string Color) GetUtilizationStatus(decimal utilizationPercent)
    {
        return utilizationPercent switch
        {
            <= 0 => ("Excellent", "green"),
            <= 10 => ("Excellent", "green"),
            <= 30 => ("Good", "green"),
            <= 50 => ("Fair", "yellow"),
            <= 75 => ("Poor", "red"),
            <= 100 => ("High", "red"),
            _ => ("Over Limit", "red")
        };
    }

    /// <summary>
    /// Calculate aggregate utilization across multiple credit cards
    /// </summary>
    public CreditUtilizationResponse CalculateAggregateUtilization(IEnumerable<LiabilityAccount> creditCards)
    {
        var cards = creditCards.Where(c => c.IsCreditCard).ToList();
        
        if (!cards.Any())
        {
            return new CreditUtilizationResponse
            {
                UtilizationStatus = "N/A",
                UtilizationColor = "gray"
            };
        }

        var totalBalance = cards.Sum(c => c.CurrentBalance);
        var totalLimit = cards.Sum(c => c.CreditLimit ?? 0);
        var availableCredit = Math.Max(0, totalLimit - totalBalance);

        decimal utilizationPercent = 0;
        if (totalLimit > 0)
        {
            utilizationPercent = Math.Round((totalBalance / totalLimit) * 100, 1);
        }

        var (status, color) = GetUtilizationStatus(utilizationPercent);

        return new CreditUtilizationResponse
        {
            CurrentBalance = totalBalance,
            CreditLimit = totalLimit,
            AvailableCredit = availableCredit,
            UtilizationPercent = utilizationPercent,
            UtilizationStatus = status,
            UtilizationColor = color
        };
    }

    /// <summary>
    /// Get recommended actions based on utilization
    /// </summary>
    public List<string> GetUtilizationRecommendations(decimal utilizationPercent)
    {
        var recommendations = new List<string>();

        if (utilizationPercent > 75)
        {
            recommendations.Add("Consider paying down balance to below 50% for better credit score impact");
            recommendations.Add("Avoid making new purchases until balance is reduced");
        }
        else if (utilizationPercent > 50)
        {
            recommendations.Add("Try to keep utilization below 30% for optimal credit score");
            recommendations.Add("Consider paying more than the minimum each month");
        }
        else if (utilizationPercent > 30)
        {
            recommendations.Add("You're doing well! Aim to keep utilization under 30%");
        }
        else
        {
            recommendations.Add("Excellent utilization! Keep maintaining low balances");
        }

        return recommendations;
    }

    private CreditUtilizationResponse CreateEmptyResponse(LiabilityAccount account)
    {
        return new CreditUtilizationResponse
        {
            LiabilityAccountId = account.LiabilityAccountId,
            Lender = account.Lender,
            CurrentBalance = account.CurrentBalance,
            UtilizationStatus = "N/A",
            UtilizationColor = "gray"
        };
    }
}
