using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services;

/// <summary>
/// Service for generating credit-related alerts (high utilization, payment due dates).
/// </summary>
public interface ICreditAlertService
{
    /// <summary>
    /// Generates alerts for all credit issues for a user.
    /// </summary>
    Task<List<Alert>> GenerateCreditAlertsAsync(int userId);

    /// <summary>
    /// Checks for high credit utilization and generates alerts.
    /// </summary>
    Task<List<Alert>> CheckCreditUtilizationAsync(int userId);

    /// <summary>
    /// Checks for upcoming payment due dates and generates alerts.
    /// </summary>
    Task<List<Alert>> CheckPaymentDueDatesAsync(int userId, int daysAhead = 7);
}

public class CreditAlertService : ICreditAlertService
{
    private readonly ApplicationDbContext _context;
    private readonly CreditUtilizationService _utilizationService;
    private readonly ILogger<CreditAlertService> _logger;

    // Alert thresholds
    private const decimal HIGH_UTILIZATION_THRESHOLD = 50m;
    private const decimal CRITICAL_UTILIZATION_THRESHOLD = 75m;
    private const int PAYMENT_WARNING_DAYS = 7;
    private const int PAYMENT_URGENT_DAYS = 3;

    public CreditAlertService(
        ApplicationDbContext context,
        CreditUtilizationService utilizationService,
        ILogger<CreditAlertService> logger)
    {
        _context = context;
        _utilizationService = utilizationService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<List<Alert>> GenerateCreditAlertsAsync(int userId)
    {
        var alerts = new List<Alert>();

        var utilizationAlerts = await CheckCreditUtilizationAsync(userId);
        alerts.AddRange(utilizationAlerts);

        var paymentAlerts = await CheckPaymentDueDatesAsync(userId);
        alerts.AddRange(paymentAlerts);

        return alerts;
    }

    /// <inheritdoc />
    public async Task<List<Alert>> CheckCreditUtilizationAsync(int userId)
    {
        var alerts = new List<Alert>();

        var creditCards = await _context.LiabilityAccounts
            .Where(la => la.UserId == userId && la.LiabilityType == "credit")
            .ToListAsync();

        if (!creditCards.Any())
            return alerts;

        foreach (var card in creditCards)
        {
            var utilization = _utilizationService.CalculateUtilization(card);
            
            if (utilization.UtilizationPercent >= CRITICAL_UTILIZATION_THRESHOLD)
            {
                var alert = await CreateOrUpdateAlertAsync(
                    userId,
                    $"CreditUtilizationHigh_{card.LiabilityAccountId}",
                    CreateHighUtilizationAlert(card, utilization.UtilizationPercent, isCritical: true));
                if (alert != null) alerts.Add(alert);
            }
            else if (utilization.UtilizationPercent >= HIGH_UTILIZATION_THRESHOLD)
            {
                var alert = await CreateOrUpdateAlertAsync(
                    userId,
                    $"CreditUtilizationHigh_{card.LiabilityAccountId}",
                    CreateHighUtilizationAlert(card, utilization.UtilizationPercent, isCritical: false));
                if (alert != null) alerts.Add(alert);
            }
        }

        // Also check aggregate utilization
        var aggregate = _utilizationService.CalculateAggregateUtilization(creditCards);
        if (aggregate.UtilizationPercent >= HIGH_UTILIZATION_THRESHOLD && creditCards.Count > 1)
        {
            var alert = await CreateOrUpdateAlertAsync(
                userId,
                "CreditUtilizationHigh_Aggregate",
                CreateAggregateUtilizationAlert(aggregate.UtilizationPercent, creditCards.Count));
            if (alert != null) alerts.Add(alert);
        }

        _logger.LogInformation("Generated {Count} credit utilization alerts for user {UserId}", alerts.Count, userId);
        return alerts;
    }

    /// <inheritdoc />
    public async Task<List<Alert>> CheckPaymentDueDatesAsync(int userId, int daysAhead = 7)
    {
        var alerts = new List<Alert>();
        var now = DateTime.UtcNow;
        var urgentDate = now.AddDays(PAYMENT_URGENT_DAYS);
        var warningDate = now.AddDays(daysAhead);

        var liabilitiesWithDueDates = await _context.LiabilityAccounts
            .Where(la => la.UserId == userId 
                && la.PaymentDueDate != null 
                && la.PaymentDueDate >= now
                && la.PaymentDueDate <= warningDate)
            .ToListAsync();

        foreach (var liability in liabilitiesWithDueDates)
        {
            var daysUntilDue = (liability.PaymentDueDate!.Value - now).Days;
            var isUrgent = daysUntilDue <= PAYMENT_URGENT_DAYS;

            var alert = await CreateOrUpdateAlertAsync(
                userId,
                $"PaymentDueSoon_{liability.LiabilityAccountId}",
                CreatePaymentDueAlert(liability, daysUntilDue, isUrgent));
            if (alert != null) alerts.Add(alert);
        }

        // Check for overdue payments
        var overduePayments = await _context.LiabilityAccounts
            .Where(la => la.UserId == userId 
                && la.PaymentDueDate != null 
                && la.PaymentDueDate < now
                && la.CurrentBalance > 0)
            .ToListAsync();

        foreach (var overdue in overduePayments)
        {
            var daysOverdue = (now - overdue.PaymentDueDate!.Value).Days;
            var alert = await CreateOrUpdateAlertAsync(
                userId,
                $"PaymentOverdue_{overdue.LiabilityAccountId}",
                CreatePaymentOverdueAlert(overdue, daysOverdue));
            if (alert != null) alerts.Add(alert);
        }

        _logger.LogInformation("Generated {Count} payment due alerts for user {UserId}", alerts.Count, userId);
        return alerts;
    }

    private Alert CreateHighUtilizationAlert(LiabilityAccount card, decimal utilizationPercent, bool isCritical)
    {
        var severity = isCritical ? AlertSeverity.High : AlertSeverity.Medium;
        var title = isCritical 
            ? $"Critical: {card.Lender ?? "Credit Card"} at {utilizationPercent:F0}% utilization"
            : $"High utilization on {card.Lender ?? "Credit Card"}: {utilizationPercent:F0}%";

        var message = isCritical
            ? $"Your {card.Lender ?? "credit card"} is at {utilizationPercent:F0}% of its credit limit (${card.CurrentBalance:N2} of ${card.CreditLimit:N2}). " +
              "This may significantly impact your credit score. Consider paying down the balance as soon as possible."
            : $"Your {card.Lender ?? "credit card"} is at {utilizationPercent:F0}% utilization. " +
              "Try to keep utilization below 30% for optimal credit health.";

        return new Alert
        {
            Title = title,
            Message = message,
            Severity = severity,
            Category = AlertCategory.Credit,
            IsActionable = true,
            ActionUrl = "/liabilities",
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                AlertType = "CreditUtilizationHigh",
                LiabilityAccountId = card.LiabilityAccountId,
                UtilizationPercent = utilizationPercent,
                CurrentBalance = card.CurrentBalance,
                CreditLimit = card.CreditLimit
            }),
            PortfolioImpactScore = isCritical ? 80 : 50
        };
    }

    private Alert CreateAggregateUtilizationAlert(decimal utilizationPercent, int cardCount)
    {
        return new Alert
        {
            Title = $"Overall credit utilization at {utilizationPercent:F0}%",
            Message = $"Your combined credit utilization across {cardCount} cards is {utilizationPercent:F0}%. " +
                      "Consider paying down balances to improve your credit score.",
            Severity = utilizationPercent >= CRITICAL_UTILIZATION_THRESHOLD ? AlertSeverity.High : AlertSeverity.Medium,
            Category = AlertCategory.Credit,
            IsActionable = true,
            ActionUrl = "/liabilities",
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                AlertType = "CreditUtilizationHigh",
                IsAggregate = true,
                UtilizationPercent = utilizationPercent,
                CardCount = cardCount
            }),
            PortfolioImpactScore = utilizationPercent >= CRITICAL_UTILIZATION_THRESHOLD ? 70 : 40
        };
    }

    private Alert CreatePaymentDueAlert(LiabilityAccount liability, int daysUntilDue, bool isUrgent)
    {
        var accountName = liability.Lender ?? liability.LiabilityType ?? "Account";
        var title = isUrgent
            ? $"Urgent: {accountName} payment due in {daysUntilDue} day{(daysUntilDue == 1 ? "" : "s")}"
            : $"{accountName} payment due in {daysUntilDue} days";

        var minimumPayment = liability.MinimumPayment ?? liability.CurrentBalance;
        var message = $"Your {accountName} payment of ${minimumPayment:N2} is due on {liability.PaymentDueDate:MMM dd}. " +
                      (isUrgent ? "Make sure to pay on time to avoid late fees and credit score impact." : "");

        return new Alert
        {
            Title = title,
            Message = message.Trim(),
            Severity = isUrgent ? AlertSeverity.High : AlertSeverity.Medium,
            Category = AlertCategory.Credit,
            IsActionable = true,
            ActionUrl = "/liabilities",
            ExpiresAt = liability.PaymentDueDate,
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                AlertType = "PaymentDueSoon",
                LiabilityAccountId = liability.LiabilityAccountId,
                DaysUntilDue = daysUntilDue,
                PaymentDueDate = liability.PaymentDueDate,
                MinimumPayment = minimumPayment
            }),
            PortfolioImpactScore = isUrgent ? 75 : 50
        };
    }

    private Alert CreatePaymentOverdueAlert(LiabilityAccount liability, int daysOverdue)
    {
        var accountName = liability.Lender ?? liability.LiabilityType ?? "Account";
        var minimumPayment = liability.MinimumPayment ?? liability.CurrentBalance;

        return new Alert
        {
            Title = $"Overdue: {accountName} payment is {daysOverdue} day{(daysOverdue == 1 ? "" : "s")} late",
            Message = $"Your {accountName} payment of ${minimumPayment:N2} was due on {liability.PaymentDueDate:MMM dd}. " +
                      "Late payments can negatively impact your credit score and may incur fees. Pay as soon as possible.",
            Severity = AlertSeverity.Critical,
            Category = AlertCategory.Credit,
            IsActionable = true,
            ActionUrl = "/liabilities",
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                AlertType = "PaymentOverdue",
                LiabilityAccountId = liability.LiabilityAccountId,
                DaysOverdue = daysOverdue,
                PaymentDueDate = liability.PaymentDueDate,
                MinimumPayment = minimumPayment
            }),
            PortfolioImpactScore = 90
        };
    }

    /// <summary>
    /// Creates a new alert or updates an existing one with the same key.
    /// Returns the alert if it was created/updated, null if an identical alert already exists.
    /// </summary>
    private async Task<Alert?> CreateOrUpdateAlertAsync(int userId, string alertKey, Alert newAlert)
    {
        // Look for an existing non-dismissed alert with the same key
        var existingAlert = await _context.Alerts
            .Where(a => a.UserId == userId 
                && !a.IsDismissed 
                && a.Metadata != null 
                && a.Metadata.Contains($"\"AlertKey\":\"{alertKey}\""))
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (existingAlert != null)
        {
            // If the alert is still relevant (within last 24h), don't create a duplicate
            if ((DateTime.UtcNow - existingAlert.CreatedAt).TotalHours < 24)
            {
                return null;
            }

            // Mark old alert as dismissed to prevent duplicates
            existingAlert.IsDismissed = true;
            existingAlert.DismissedAt = DateTime.UtcNow;
        }

        // Add alert key to metadata
        var metadata = System.Text.Json.JsonDocument.Parse(newAlert.Metadata ?? "{}");
        var metadataDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(newAlert.Metadata ?? "{}") 
            ?? new Dictionary<string, object>();
        metadataDict["AlertKey"] = alertKey;
        newAlert.Metadata = System.Text.Json.JsonSerializer.Serialize(metadataDict);

        newAlert.UserId = userId;
        newAlert.CreatedAt = DateTime.UtcNow;

        _context.Alerts.Add(newAlert);
        await _context.SaveChangesAsync();

        return newAlert;
    }
}
