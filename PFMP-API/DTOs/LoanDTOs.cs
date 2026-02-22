namespace PFMP_API.DTOs;

/// <summary>
/// Loan details response with current state information
/// </summary>
public class LoanDetailsResponse
{
    public int LiabilityAccountId { get; set; }
    public string LiabilityType { get; set; } = string.Empty;
    public string? Lender { get; set; }
    public decimal OriginalAmount { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal InterestRate { get; set; }
    public decimal MonthlyPayment { get; set; }
    /// <summary>
    /// The actual minimum payment reported by Plaid/user, which may differ from
    /// the amortized MonthlyPayment when the minimum is insufficient to cover interest.
    /// </summary>
    public decimal? ActualMinimumPayment { get; set; }
    public int TermMonths { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EstimatedPayoffDate { get; set; }
    public int PaymentsRemaining { get; set; }
    public decimal PercentPaidOff { get; set; }
    public decimal TotalInterestPaid { get; set; }
    public decimal TotalInterestRemaining { get; set; }
}

/// <summary>
/// Single payment in an amortization schedule
/// </summary>
public class AmortizationPayment
{
    public int PaymentNumber { get; set; }
    public DateTime Date { get; set; }
    public decimal Payment { get; set; }
    public decimal Principal { get; set; }
    public decimal Interest { get; set; }
    public decimal Balance { get; set; }
    public decimal CumulativePrincipal { get; set; }
    public decimal CumulativeInterest { get; set; }
}

/// <summary>
/// Full amortization schedule response
/// </summary>
public class AmortizationScheduleResponse
{
    public int LiabilityAccountId { get; set; }
    public LoanDetailsResponse LoanDetails { get; set; } = null!;
    public List<AmortizationPayment> Schedule { get; set; } = new();
    public AmortizationSummary Summary { get; set; } = null!;
}

/// <summary>
/// Summary totals for amortization schedule
/// </summary>
public class AmortizationSummary
{
    public decimal TotalPayments { get; set; }
    public decimal TotalInterest { get; set; }
    public decimal TotalPrincipal { get; set; }
    public decimal PercentPaid { get; set; }
    public int PaymentsRemaining { get; set; }
    public int PaymentsMade { get; set; }
}

/// <summary>
/// Request for payoff calculator
/// </summary>
public class PayoffCalculatorRequest
{
    public decimal ExtraMonthlyPayment { get; set; }
}

/// <summary>
/// Payoff plan details (current or accelerated)
/// </summary>
public class PayoffPlan
{
    public DateTime PayoffDate { get; set; }
    public decimal TotalInterest { get; set; }
    public decimal TotalCost { get; set; }
    public int MonthsRemaining { get; set; }
    public decimal MonthlyPayment { get; set; }
}

/// <summary>
/// Savings from extra payments
/// </summary>
public class PayoffSavings
{
    public int MonthsSaved { get; set; }
    public decimal YearsSaved { get; set; }
    public decimal InterestSaved { get; set; }
    public decimal TotalSaved { get; set; }
}

/// <summary>
/// Payoff calculator response
/// </summary>
public class PayoffCalculatorResponse
{
    public int LiabilityAccountId { get; set; }
    public PayoffPlan CurrentPlan { get; set; } = null!;
    public PayoffPlan AcceleratedPlan { get; set; } = null!;
    public PayoffSavings Savings { get; set; } = null!;
}

/// <summary>
/// Credit card utilization response
/// </summary>
public class CreditUtilizationResponse
{
    public int LiabilityAccountId { get; set; }
    public string? Lender { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal AvailableCredit { get; set; }
    public decimal UtilizationPercent { get; set; }
    public string UtilizationStatus { get; set; } = string.Empty; // Good, Fair, Poor
    public string UtilizationColor { get; set; } = string.Empty; // green, yellow, red
    public decimal? InterestRate { get; set; }
    public decimal? MinimumPayment { get; set; }
    public DateTime? PaymentDueDate { get; set; }
    public decimal? StatementBalance { get; set; }
}

/// <summary>
/// Individual debt for payoff strategies
/// </summary>
public class DebtItem
{
    public int LiabilityAccountId { get; set; }
    public string LiabilityType { get; set; } = string.Empty;
    public string? Lender { get; set; }
    public decimal Balance { get; set; }
    public decimal InterestRate { get; set; }
    public decimal MinimumPayment { get; set; }
}

/// <summary>
/// A payoff strategy result
/// </summary>
public class PayoffStrategy
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime PayoffDate { get; set; }
    public decimal TotalInterest { get; set; }
    public decimal TotalCost { get; set; }
    public int MonthsToPayoff { get; set; }
    public int FirstDebtPayoffMonth { get; set; } // Month when first debt is paid off
    public List<int> PayoffOrder { get; set; } = new(); // LiabilityAccountIds in order
}

/// <summary>
/// Debt payoff strategies comparison response
/// </summary>
public class DebtPayoffStrategiesResponse
{
    public decimal TotalDebt { get; set; }
    public decimal WeightedAverageInterestRate { get; set; }
    public decimal TotalMinimumPayment { get; set; }
    public decimal ExtraMonthlyPayment { get; set; }
    public List<DebtItem> Debts { get; set; } = new();
    public PayoffStrategy Avalanche { get; set; } = null!;
    public PayoffStrategy Snowball { get; set; } = null!;
    public PayoffStrategy MinimumOnly { get; set; } = null!;
}
