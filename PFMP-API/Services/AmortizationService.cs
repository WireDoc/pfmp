using PFMP_API.DTOs;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services;

/// <summary>
/// Service for calculating amortization schedules and loan payoff projections
/// </summary>
public class AmortizationService
{
    private readonly ILogger<AmortizationService> _logger;

    public AmortizationService(ILogger<AmortizationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Calculate monthly payment using standard amortization formula
    /// PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
    /// </summary>
    public decimal CalculateMonthlyPayment(decimal principal, decimal annualRate, int termMonths)
    {
        if (termMonths <= 0) return 0;
        if (annualRate <= 0) return principal / termMonths; // No interest loan

        var monthlyRate = annualRate / 100 / 12;
        var factor = (double)Math.Pow(1 + (double)monthlyRate, termMonths);
        var payment = principal * monthlyRate * (decimal)factor / ((decimal)factor - 1);
        
        return Math.Round(payment, 2);
    }

    /// <summary>
    /// Generate full amortization schedule from loan start to payoff
    /// </summary>
    public AmortizationScheduleResponse GenerateAmortizationSchedule(LiabilityAccount loan)
    {
        if (loan.OriginalLoanAmount == null || loan.LoanTermMonths == null || loan.LoanStartDate == null)
        {
            _logger.LogWarning("Loan {LiabilityAccountId} missing required fields for amortization", loan.LiabilityAccountId);
            return CreateEmptySchedule(loan);
        }

        var principal = loan.OriginalLoanAmount.Value;
        var annualRate = loan.InterestRateApr ?? 0;
        var termMonths = loan.LoanTermMonths.Value;
        var startDate = loan.LoanStartDate.Value;
        var currentBalance = loan.CurrentBalance;
        
        // Use the calculated amortized payment for the schedule rather than
        // the minimum payment from Plaid.  Plaid sometimes reports a very low
        // minimum (e.g. $25) for income-driven repayment plans that would make
        // the schedule diverge (payment < monthly interest).  We still show the
        // actual minimum payment on the detail card via loan.MinimumPayment.
        var calculatedPayment = CalculateMonthlyPayment(principal, annualRate, termMonths);
        var monthlyPayment = loan.MinimumPayment ?? calculatedPayment;

        // If the minimum payment doesn't cover monthly interest on the current
        // balance, use the calculated amortizing payment for the schedule so
        // we produce a meaningful table.  The detail card will still surface
        // the real minimum so the user can compare.
        var monthlyRate = annualRate / 100 / 12;
        var monthlyInterestOnCurrent = currentBalance * monthlyRate;
        if (monthlyPayment <= monthlyInterestOnCurrent && calculatedPayment > monthlyPayment)
        {
            _logger.LogWarning(
                "Loan {Id}: min payment ${Min}/mo < monthly interest ${Interest}/mo on current balance. Using calculated payment ${Calc}/mo for schedule.",
                loan.LiabilityAccountId, monthlyPayment, Math.Round(monthlyInterestOnCurrent, 2), calculatedPayment);
            monthlyPayment = calculatedPayment;
        }

        var schedule = new List<AmortizationPayment>();
        var balance = principal;
        var cumulativePrincipal = 0m;
        var cumulativeInterest = 0m;

        for (int i = 1; i <= termMonths && balance > 0; i++)
        {
            var interest = Math.Round(balance * monthlyRate, 2);
            var principalPaid = Math.Min(monthlyPayment - interest, balance);
            
            // Handle final payment adjustment
            if (balance < monthlyPayment)
            {
                principalPaid = balance;
            }

            // Safety: if payment still doesn't cover interest, stop to avoid infinite growth
            if (principalPaid <= 0 && balance > 0)
            {
                _logger.LogWarning("Loan {Id}: schedule diverging at payment {Num}, stopping",
                    loan.LiabilityAccountId, i);
                break;
            }

            balance -= principalPaid;
            cumulativePrincipal += principalPaid;
            cumulativeInterest += interest;

            schedule.Add(new AmortizationPayment
            {
                PaymentNumber = i,
                Date = startDate.AddMonths(i),
                Payment = principalPaid + interest,
                Principal = principalPaid,
                Interest = interest,
                Balance = Math.Max(0, balance),
                CumulativePrincipal = cumulativePrincipal,
                CumulativeInterest = cumulativeInterest
            });

            if (balance <= 0) break;
        }

        // --- Percent Paid Off ---
        // Use actual current balance vs original amount for an accurate real-world figure.
        // This handles negative-amortization / income-driven plans where the balance
        // may exceed the original amount (clamp to 0).
        var amountPaid = principal - currentBalance;
        var percentPaid = principal > 0 ? Math.Max(0, (amountPaid / principal) * 100) : 0;

        // Calculate where we are in the schedule
        var today = DateTime.UtcNow;
        var monthsElapsed = (int)Math.Floor((today - startDate).TotalDays / 30.44);
        var paymentsMade = Math.Min(monthsElapsed, schedule.Count);
        var paymentsRemaining = schedule.Count - paymentsMade;

        // Calculate totals
        var totalPayments = schedule.Sum(p => p.Payment);
        var totalInterest = schedule.Sum(p => p.Interest);

        // Interest already paid: use the schedule for payments made so far
        var interestPaidSoFar = schedule.Take(paymentsMade).Sum(p => p.Interest);
        var interestRemaining = schedule.Skip(paymentsMade).Sum(p => p.Interest);

        // If current balance exceeds original (negative amortisation), the schedule
        // interest may understate reality.  Adjust by adding the shortfall.
        if (currentBalance > principal)
        {
            var excessBalance = currentBalance - principal;
            interestPaidSoFar += excessBalance; // extra interest that accrued
        }

        var estimatedPayoffDate = schedule.LastOrDefault()?.Date;

        return new AmortizationScheduleResponse
        {
            LiabilityAccountId = loan.LiabilityAccountId,
            LoanDetails = new LoanDetailsResponse
            {
                LiabilityAccountId = loan.LiabilityAccountId,
                LiabilityType = loan.LiabilityType,
                Lender = loan.Lender,
                OriginalAmount = principal,
                CurrentBalance = currentBalance,
                InterestRate = annualRate,
                MonthlyPayment = monthlyPayment,
                ActualMinimumPayment = loan.MinimumPayment,
                TermMonths = termMonths,
                StartDate = startDate,
                EstimatedPayoffDate = estimatedPayoffDate,
                PaymentsRemaining = paymentsRemaining,
                PercentPaidOff = Math.Round(percentPaid, 1),
                TotalInterestPaid = Math.Round(interestPaidSoFar, 2),
                TotalInterestRemaining = Math.Round(interestRemaining, 2)
            },
            Schedule = schedule,
            Summary = new AmortizationSummary
            {
                TotalPayments = totalPayments,
                TotalInterest = totalInterest,
                TotalPrincipal = principal,
                PercentPaid = Math.Round(percentPaid, 1),
                PaymentsRemaining = paymentsRemaining,
                PaymentsMade = paymentsMade
            }
        };
    }

    /// <summary>
    /// Calculate payoff with extra monthly payment
    /// </summary>
    public PayoffCalculatorResponse CalculatePayoff(LiabilityAccount loan, decimal extraMonthlyPayment)
    {
        var currentBalance = loan.CurrentBalance;
        var annualRate = loan.InterestRateApr ?? 0;
        var monthlyRate = annualRate / 100 / 12;
        var minimumPayment = loan.MinimumPayment ?? 0;

        if (minimumPayment <= 0 || currentBalance <= 0)
        {
            return CreateEmptyPayoffResult(loan);
        }

        // Calculate current plan (no extra payment)
        var currentPlan = CalculatePayoffPlan(currentBalance, monthlyRate, minimumPayment, DateTime.UtcNow);

        // Calculate accelerated plan (with extra payment)
        var acceleratedPayment = minimumPayment + extraMonthlyPayment;
        var acceleratedPlan = CalculatePayoffPlan(currentBalance, monthlyRate, acceleratedPayment, DateTime.UtcNow);

        return new PayoffCalculatorResponse
        {
            LiabilityAccountId = loan.LiabilityAccountId,
            CurrentPlan = currentPlan,
            AcceleratedPlan = acceleratedPlan,
            Savings = new PayoffSavings
            {
                MonthsSaved = currentPlan.MonthsRemaining - acceleratedPlan.MonthsRemaining,
                YearsSaved = Math.Round((currentPlan.MonthsRemaining - acceleratedPlan.MonthsRemaining) / 12.0m, 1),
                InterestSaved = currentPlan.TotalInterest - acceleratedPlan.TotalInterest,
                TotalSaved = currentPlan.TotalCost - acceleratedPlan.TotalCost
            }
        };
    }

    private PayoffPlan CalculatePayoffPlan(decimal balance, decimal monthlyRate, decimal monthlyPayment, DateTime startDate)
    {
        var months = 0;
        var totalInterest = 0m;
        var totalPaid = 0m;
        var currentBalance = balance;

        while (currentBalance > 0 && months < 600) // Cap at 50 years
        {
            var interest = currentBalance * monthlyRate;
            var principal = Math.Min(monthlyPayment - interest, currentBalance);
            
            if (monthlyPayment <= interest)
            {
                // Payment doesn't cover interest - will never pay off
                return new PayoffPlan
                {
                    PayoffDate = DateTime.MaxValue,
                    TotalInterest = decimal.MaxValue,
                    TotalCost = decimal.MaxValue,
                    MonthsRemaining = int.MaxValue,
                    MonthlyPayment = monthlyPayment
                };
            }

            currentBalance -= principal;
            totalInterest += interest;
            totalPaid += monthlyPayment;
            months++;
        }

        return new PayoffPlan
        {
            PayoffDate = startDate.AddMonths(months),
            TotalInterest = Math.Round(totalInterest, 2),
            TotalCost = Math.Round(balance + totalInterest, 2),
            MonthsRemaining = months,
            MonthlyPayment = monthlyPayment
        };
    }

    private AmortizationScheduleResponse CreateEmptySchedule(LiabilityAccount loan)
    {
        return new AmortizationScheduleResponse
        {
            LiabilityAccountId = loan.LiabilityAccountId,
            LoanDetails = new LoanDetailsResponse
            {
                LiabilityAccountId = loan.LiabilityAccountId,
                LiabilityType = loan.LiabilityType,
                Lender = loan.Lender,
                CurrentBalance = loan.CurrentBalance,
                InterestRate = loan.InterestRateApr ?? 0
            },
            Schedule = new List<AmortizationPayment>(),
            Summary = new AmortizationSummary()
        };
    }

    private PayoffCalculatorResponse CreateEmptyPayoffResult(LiabilityAccount loan)
    {
        return new PayoffCalculatorResponse
        {
            LiabilityAccountId = loan.LiabilityAccountId,
            CurrentPlan = new PayoffPlan(),
            AcceleratedPlan = new PayoffPlan(),
            Savings = new PayoffSavings()
        };
    }
}
