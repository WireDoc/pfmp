using Going.Plaid.Entity;
using PFMP_API.Models.Spending;
using PFMP_API.Services.Plaid;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Wave 14 P3B: lock in the Plaid → PFMP enum mappings. The Going.Plaid SDK
/// can rename or reorder its enum values between releases, so any silent drift
/// here would corrupt the dashboard taxonomy. These tests catch that.
/// </summary>
public class PlaidRecurringMappingTests
{
    [Theory]
    [InlineData(TransactionStreamStatus.Mature, RecurringStreamStatus.Mature)]
    [InlineData(TransactionStreamStatus.EarlyDetection, RecurringStreamStatus.EarlyDetection)]
    [InlineData(TransactionStreamStatus.Tombstoned, RecurringStreamStatus.Tombstoned)]
    public void MapPlaidStatus_KnownValues_MapAsDocumented(
        TransactionStreamStatus plaid, RecurringStreamStatus expected)
    {
        Assert.Equal(expected, PlaidService.MapPlaidStatus(plaid));
    }

    [Theory]
    [InlineData(RecurringTransactionFrequency.Weekly, RecurringStreamFrequency.Weekly)]
    [InlineData(RecurringTransactionFrequency.Biweekly, RecurringStreamFrequency.Biweekly)]
    [InlineData(RecurringTransactionFrequency.SemiMonthly, RecurringStreamFrequency.SemiMonthly)]
    [InlineData(RecurringTransactionFrequency.Monthly, RecurringStreamFrequency.Monthly)]
    [InlineData(RecurringTransactionFrequency.Annually, RecurringStreamFrequency.Annual)]
    [InlineData(RecurringTransactionFrequency.Unknown, RecurringStreamFrequency.Unknown)]
    public void MapPlaidFrequency_KnownValues_MapAsDocumented(
        RecurringTransactionFrequency plaid, RecurringStreamFrequency expected)
    {
        Assert.Equal(expected, PlaidService.MapPlaidFrequency(plaid));
    }
}
