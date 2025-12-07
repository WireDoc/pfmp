using PFMP_API.DTOs;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services;

/// <summary>
/// Service for calculating debt payoff strategies (Avalanche vs Snowball)
/// </summary>
public class DebtPayoffService
{
    private readonly ILogger<DebtPayoffService> _logger;
    private readonly AmortizationService _amortizationService;

    public DebtPayoffService(ILogger<DebtPayoffService> logger, AmortizationService amortizationService)
    {
        _logger = logger;
        _amortizationService = amortizationService;
    }

    /// <summary>
    /// Compare debt payoff strategies for a user's debts
    /// </summary>
    public DebtPayoffStrategiesResponse CompareStrategies(
        IEnumerable<LiabilityAccount> debts, 
        decimal extraMonthlyPayment = 0)
    {
        var debtList = debts.Where(d => d.CurrentBalance > 0).ToList();
        
        if (!debtList.Any())
        {
            return CreateEmptyResponse();
        }

        var debtItems = debtList.Select(d => new DebtItem
        {
            LiabilityAccountId = d.LiabilityAccountId,
            LiabilityType = d.LiabilityType,
            Lender = d.Lender,
            Balance = d.CurrentBalance,
            InterestRate = d.InterestRateApr ?? 0,
            MinimumPayment = d.MinimumPayment ?? CalculateMinimumPayment(d)
        }).ToList();

        var totalDebt = debtItems.Sum(d => d.Balance);
        var totalMinimum = debtItems.Sum(d => d.MinimumPayment);
        var weightedAvgRate = CalculateWeightedAverageRate(debtItems);

        // Calculate each strategy
        var avalanche = CalculateAvalancheStrategy(debtItems, extraMonthlyPayment);
        var snowball = CalculateSnowballStrategy(debtItems, extraMonthlyPayment);
        var minimumOnly = CalculateMinimumOnlyStrategy(debtItems);

        return new DebtPayoffStrategiesResponse
        {
            TotalDebt = totalDebt,
            WeightedAverageInterestRate = Math.Round(weightedAvgRate, 2),
            TotalMinimumPayment = totalMinimum,
            ExtraMonthlyPayment = extraMonthlyPayment,
            Debts = debtItems,
            Avalanche = avalanche,
            Snowball = snowball,
            MinimumOnly = minimumOnly
        };
    }

    /// <summary>
    /// Avalanche method: Pay highest interest rate first
    /// Mathematically optimal - saves the most interest
    /// </summary>
    private PayoffStrategy CalculateAvalancheStrategy(List<DebtItem> debts, decimal extraPayment)
    {
        // Sort by interest rate descending (highest first)
        var orderedDebts = debts.OrderByDescending(d => d.InterestRate).ToList();
        return SimulatePayoff(orderedDebts, extraPayment, "Avalanche", 
            "Pay highest interest rate first. Saves the most money mathematically.");
    }

    /// <summary>
    /// Snowball method: Pay lowest balance first
    /// Psychological wins from paying off debts faster
    /// </summary>
    private PayoffStrategy CalculateSnowballStrategy(List<DebtItem> debts, decimal extraPayment)
    {
        // Sort by balance ascending (lowest first)
        var orderedDebts = debts.OrderBy(d => d.Balance).ToList();
        return SimulatePayoff(orderedDebts, extraPayment, "Snowball",
            "Pay lowest balance first. Quick wins for motivation.");
    }

    /// <summary>
    /// Minimum only: Just pay minimums (baseline comparison)
    /// </summary>
    private PayoffStrategy CalculateMinimumOnlyStrategy(List<DebtItem> debts)
    {
        return SimulatePayoff(debts.ToList(), 0, "Minimum Only",
            "Pay only minimum payments. Takes longest and costs most.");
    }

    /// <summary>
    /// Simulate debt payoff with given order and extra payment
    /// </summary>
    private PayoffStrategy SimulatePayoff(List<DebtItem> orderedDebts, decimal extraPayment, 
        string strategyName, string description)
    {
        // Create working copies
        var balances = orderedDebts.ToDictionary(d => d.LiabilityAccountId, d => d.Balance);
        var rates = orderedDebts.ToDictionary(d => d.LiabilityAccountId, d => d.InterestRate / 100 / 12);
        var minimums = orderedDebts.ToDictionary(d => d.LiabilityAccountId, d => d.MinimumPayment);
        
        var payoffOrder = new List<int>();
        var totalInterest = 0m;
        var months = 0;
        var maxMonths = 600; // 50 years cap
        var firstDebtPayoffMonth = 0;

        var activeDebts = new HashSet<int>(orderedDebts.Select(d => d.LiabilityAccountId));
        
        // Track snowball effect: freed up payments roll into extra
        var snowballExtra = extraPayment;

        while (activeDebts.Any() && months < maxMonths)
        {
            months++;
            var extraToApply = snowballExtra;

            foreach (var debt in orderedDebts.Where(d => activeDebts.Contains(d.LiabilityAccountId)))
            {
                var id = debt.LiabilityAccountId;
                var balance = balances[id];
                var monthlyRate = rates[id];
                var minimum = minimums[id];

                // Calculate interest for this month
                var interest = balance * monthlyRate;
                totalInterest += interest;

                // Add interest to balance
                balance += interest;

                // Determine payment amount
                var payment = minimum;
                
                // For first active debt in order, apply all extra payment
                if (debt == orderedDebts.First(d => activeDebts.Contains(d.LiabilityAccountId)))
                {
                    payment += extraToApply;
                    extraToApply = 0;
                }

                // Cap payment at remaining balance
                payment = Math.Min(payment, balance);

                // Apply payment to balance
                balance -= payment;
                
                if (balance <= 0.01m) // Account for floating point
                {
                    // Debt paid off!
                    balance = 0;
                    activeDebts.Remove(id);
                    payoffOrder.Add(id);
                    
                    // Track first debt payoff
                    if (firstDebtPayoffMonth == 0)
                    {
                        firstDebtPayoffMonth = months;
                    }
                    
                    // Snowball effect: freed up minimum payment adds to extra for future months
                    snowballExtra += minimum;
                }

                balances[id] = balance;
            }
        }

        // Add any remaining debts that didn't get paid off
        payoffOrder.AddRange(activeDebts);

        var totalPaid = orderedDebts.Sum(d => d.Balance) + totalInterest;

        return new PayoffStrategy
        {
            Name = strategyName,
            Description = description,
            PayoffDate = DateTime.UtcNow.AddMonths(months),
            TotalInterest = Math.Round(totalInterest, 2),
            TotalCost = Math.Round(totalPaid, 2),
            MonthsToPayoff = months,
            FirstDebtPayoffMonth = firstDebtPayoffMonth,
            PayoffOrder = payoffOrder
        };
    }

    /// <summary>
    /// Calculate weighted average interest rate
    /// </summary>
    private decimal CalculateWeightedAverageRate(List<DebtItem> debts)
    {
        var totalBalance = debts.Sum(d => d.Balance);
        if (totalBalance == 0) return 0;

        var weightedSum = debts.Sum(d => d.Balance * d.InterestRate);
        return weightedSum / totalBalance;
    }

    /// <summary>
    /// Estimate minimum payment if not provided (2% of balance or $25, whichever is greater)
    /// </summary>
    private decimal CalculateMinimumPayment(LiabilityAccount debt)
    {
        var twoPercent = debt.CurrentBalance * 0.02m;
        return Math.Max(25, Math.Round(twoPercent, 2));
    }

    private DebtPayoffStrategiesResponse CreateEmptyResponse()
    {
        var emptyStrategy = new PayoffStrategy
        {
            Name = "N/A",
            Description = "No debts to analyze",
            PayoffDate = DateTime.UtcNow,
            TotalInterest = 0,
            TotalCost = 0,
            MonthsToPayoff = 0,
            PayoffOrder = new List<int>()
        };

        return new DebtPayoffStrategiesResponse
        {
            TotalDebt = 0,
            WeightedAverageInterestRate = 0,
            TotalMinimumPayment = 0,
            ExtraMonthlyPayment = 0,
            Debts = new List<DebtItem>(),
            Avalanche = emptyStrategy,
            Snowball = emptyStrategy,
            MinimumOnly = emptyStrategy
        };
    }
}
