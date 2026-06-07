using PFMP_API.Models.Spending;
using PFMP_API.Services.Spending;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Wave 14 P4: pure-function tests for the forecast math — σ computation,
/// frequency-to-step-days, contribution scaling. The full ForecastAsync path
/// is covered by manual end-to-end verification; these tests lock in the
/// numeric primitives.
/// </summary>
public class CashFlowForecastTests
{
    [Fact]
    public void StandardDeviation_TwoPoints_MatchesFormula()
    {
        // Population stddev would be 0.5; sample stddev (n-1 denominator) = 1/√2 ≈ 0.7071
        var stddev = CashFlowForecastService.StandardDeviation(new List<decimal> { 1m, 2m });
        Assert.True(Math.Abs(stddev - 0.7071m) < 0.001m, $"Expected ≈0.7071, got {stddev}");
    }

    [Fact]
    public void StandardDeviation_SinglePoint_ReturnsZero()
    {
        Assert.Equal(0m, CashFlowForecastService.StandardDeviation(new List<decimal> { 42m }));
    }

    [Fact]
    public void StandardDeviation_EmptyList_ReturnsZero()
    {
        Assert.Equal(0m, CashFlowForecastService.StandardDeviation(new List<decimal>()));
    }

    [Theory]
    [InlineData(RecurringStreamFrequency.Weekly, 7)]
    [InlineData(RecurringStreamFrequency.Biweekly, 14)]
    [InlineData(RecurringStreamFrequency.SemiMonthly, 15)]
    [InlineData(RecurringStreamFrequency.Monthly, 30)]
    [InlineData(RecurringStreamFrequency.Annual, 365)]
    [InlineData(RecurringStreamFrequency.Unknown, 0)]
    public void StepDaysFor_MatchesCadence(RecurringStreamFrequency freq, int expectedDays)
    {
        Assert.Equal(expectedDays, CashFlowForecastService.StepDaysFor(freq));
    }

    [Fact]
    public void BuildContributions_BiweeklyOutflow_ScalesByHorizon()
    {
        // $450 every 2 weeks ≈ $975/mo; over 90 days = $975 × 90/30 = $2925
        var stream = new RecurringTransactionStream
        {
            StreamId = 1,
            UserId = 20,
            Source = RecurringStreamSource.PlaidRecurring,
            MerchantName = "Allotment",
            Direction = RecurringStreamDirection.Outflow,
            AverageAmount = 450m,
            LastAmount = 450m,
            Frequency = RecurringStreamFrequency.Biweekly,
            LastDate = DateTime.UtcNow.AddDays(-7),
            IsActive = true,
            Status = RecurringStreamStatus.Mature,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow,
        };
        var contributions = CashFlowForecastService.BuildContributions(new[] { stream }, horizonDays: 90);
        Assert.Single(contributions);
        var c = contributions[0];
        Assert.Equal(975m, Math.Round(c.MonthlyAverage, 2));
        Assert.Equal(2925m, Math.Round(c.HorizonContribution, 2));
        Assert.Equal("Outflow", c.Direction);
        Assert.Equal("PlaidRecurring", c.Source);
    }

    [Fact]
    public void BuildContributions_OrdersByHorizonContributionDesc()
    {
        var rent = new RecurringTransactionStream
        {
            StreamId = 1, UserId = 20, MerchantName = "Rent",
            Direction = RecurringStreamDirection.Outflow, AverageAmount = 2000m,
            Frequency = RecurringStreamFrequency.Monthly,
            Source = RecurringStreamSource.PlaidRecurring,
            DateCreated = DateTime.UtcNow, DateUpdated = DateTime.UtcNow,
            IsActive = true, Status = RecurringStreamStatus.Mature,
        };
        var netflix = new RecurringTransactionStream
        {
            StreamId = 2, UserId = 20, MerchantName = "Netflix",
            Direction = RecurringStreamDirection.Outflow, AverageAmount = 15m,
            Frequency = RecurringStreamFrequency.Monthly,
            Source = RecurringStreamSource.Heuristic,
            DateCreated = DateTime.UtcNow, DateUpdated = DateTime.UtcNow,
            IsActive = true, Status = RecurringStreamStatus.Mature,
        };
        var contributions = CashFlowForecastService.BuildContributions(new[] { netflix, rent }, horizonDays: 90);
        Assert.Equal("Rent", contributions[0].MerchantName);
        Assert.Equal("Netflix", contributions[1].MerchantName);
    }
}
