using PFMP_API.Models;
using PFMP_API.Models.Spending;
using PFMP_API.Services.Spending;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Wave 14 P3: pure-function tests for <see cref="HeuristicRecurringDetector"/>'s
/// clustering + cadence inference. Frequency bands are the critical
/// invariant — a typo in the day windows silently moves rent into the wrong bucket.
/// </summary>
public class HeuristicRecurringTests
{
    [Fact]
    public void ClusterByAmount_TightCluster_AllOneGroup()
    {
        // 4 amounts within ±5%
        var txs = new[]
        {
            MakeTx(-100m, new DateTime(2026, 1, 1)),
            MakeTx(-101m, new DateTime(2026, 1, 15)),
            MakeTx(-99m, new DateTime(2026, 2, 1)),
            MakeTx(-100.50m, new DateTime(2026, 2, 15)),
        };
        var clusters = HeuristicRecurringDetector.ClusterByAmount(txs);
        Assert.Single(clusters);
        Assert.Equal(4, clusters[0].Count);
    }

    [Fact]
    public void ClusterByAmount_DistinctAmounts_SeparateGroups()
    {
        // Two distinct subscription tiers — $10 and $50 — should produce 2 clusters
        var txs = new[]
        {
            MakeTx(-10m, new DateTime(2026, 1, 1)),
            MakeTx(-10.40m, new DateTime(2026, 2, 1)),
            MakeTx(-50m, new DateTime(2026, 1, 15)),
            MakeTx(-50.20m, new DateTime(2026, 2, 15)),
        };
        var clusters = HeuristicRecurringDetector.ClusterByAmount(txs);
        Assert.Equal(2, clusters.Count);
    }

    [Theory]
    [InlineData(7, RecurringStreamFrequency.Weekly)]
    [InlineData(14, RecurringStreamFrequency.Biweekly)]
    [InlineData(15, RecurringStreamFrequency.Biweekly)] // 13-16 band catches biweekly first
    [InlineData(30, RecurringStreamFrequency.Monthly)]
    [InlineData(31, RecurringStreamFrequency.Monthly)]
    [InlineData(365, RecurringStreamFrequency.Annual)]
    [InlineData(45, RecurringStreamFrequency.Unknown)] // out of band
    public void InferFrequency_TypicalGaps_MatchBands(int gapDays, RecurringStreamFrequency expected)
    {
        var dates = new[]
        {
            new DateTime(2026, 1, 1),
            new DateTime(2026, 1, 1).AddDays(gapDays),
            new DateTime(2026, 1, 1).AddDays(gapDays * 2),
            new DateTime(2026, 1, 1).AddDays(gapDays * 3),
        };
        var freq = HeuristicRecurringDetector.InferFrequency(dates);
        Assert.Equal(expected, freq);
    }

    [Fact]
    public void InferFrequency_TooFewDates_ReturnsUnknown()
    {
        Assert.Equal(RecurringStreamFrequency.Unknown,
            HeuristicRecurringDetector.InferFrequency(new[] { new DateTime(2026, 1, 1) }));
    }

    private static CashTransaction MakeTx(decimal amount, DateTime date) => new()
    {
        Amount = amount,
        TransactionDate = DateTime.SpecifyKind(date, DateTimeKind.Utc),
        Merchant = "Netflix",
        TransactionType = amount >= 0 ? "Deposit" : "Withdrawal",
        Source = "Manual",
        CreatedAt = DateTime.UtcNow,
    };
}
