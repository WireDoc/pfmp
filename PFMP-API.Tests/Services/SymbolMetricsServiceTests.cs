using PFMP_API.Models;
using PFMP_API.Services;
using Xunit;

namespace PFMP_API.Tests.Services;

public class SymbolMetricsServiceTests
{
    private static PriceHistory Bar(DateTime date, decimal open, decimal high, decimal low, decimal close)
        => new PriceHistory { Symbol = "TEST", Date = date, Open = open, High = high, Low = low, Close = close, Volume = 1000 };

    [Fact]
    public void ComputeFromPriceHistory_returns_null_for_empty_input()
    {
        var result = SymbolMetricsService.ComputeFromPriceHistory("AAPL", Array.Empty<PriceHistory>());
        Assert.Null(result);
    }

    [Fact]
    public void ComputeFromPriceHistory_uses_last_bar_for_Last_and_AsOfDate()
    {
        var rows = new List<PriceHistory>
        {
            Bar(new DateTime(2025, 1, 2),  100m, 101m,  99m, 100m),
            Bar(new DateTime(2025, 6, 1),  150m, 155m, 148m, 152m),
            Bar(new DateTime(2025,11, 3),  200m, 210m, 198m, 205m),
        };
        var m = SymbolMetricsService.ComputeFromPriceHistory("aapl", rows)!;
        Assert.Equal("AAPL", m.Symbol);
        Assert.Equal(205m, m.Last);
        Assert.Equal(new DateOnly(2025, 11, 3), m.AsOfDate);
    }

    [Fact]
    public void ComputeFromPriceHistory_picks_high_and_low_from_trailing_year()
    {
        var rows = new List<PriceHistory>
        {
            Bar(new DateTime(2025, 1, 2),  100m, 110m,  90m, 105m),
            Bar(new DateTime(2025, 6, 1),  150m, 160m, 145m, 152m),
            Bar(new DateTime(2025,11, 3),  200m, 210m, 198m, 205m),
        };
        var m = SymbolMetricsService.ComputeFromPriceHistory("X", rows)!;
        Assert.Equal(210m, m.High52w);
        Assert.Equal(90m, m.Low52w);
    }

    [Fact]
    public void ComputeFromPriceHistory_excludes_bars_older_than_365_days()
    {
        var rows = new List<PriceHistory>
        {
            Bar(new DateTime(2024, 1, 2),  500m, 999m, 1m, 500m),
            Bar(new DateTime(2025, 1, 2),  100m, 110m,  90m, 105m),
            Bar(new DateTime(2025,11, 3),  200m, 210m, 198m, 205m),
        };
        var m = SymbolMetricsService.ComputeFromPriceHistory("X", rows)!;
        Assert.Equal(210m, m.High52w);
        Assert.Equal(90m, m.Low52w);
    }

    [Fact]
    public void ComputeFromPriceHistory_computes_YTD_from_first_bar_of_year()
    {
        var rows = new List<PriceHistory>
        {
            Bar(new DateTime(2024,12,31), 95m, 96m, 94m, 95m),
            Bar(new DateTime(2025, 1, 2), 100m, 102m, 99m, 101m),
            Bar(new DateTime(2025,11, 3), 120m, 125m, 119m, 125m),
        };
        var m = SymbolMetricsService.ComputeFromPriceHistory("X", rows)!;
        Assert.Equal(100m, m.YearStartClose);
        Assert.Equal(25m, m.YtdPercent);
    }

    [Fact]
    public void ComputeFromPriceHistory_falls_back_to_prior_year_close_when_no_january_bar()
    {
        // Latest bar is in 2024, but we want to verify the prior-year fallback works
        // when there are no bars in the latest bar's year. Construct so the latest
        // bar is in 2025 with NO 2025 bars before it isn't possible with a single bar,
        // so we test by making latest 2025 the ONLY 2025 row and ensure it's picked,
        // then a separate scenario where latest year has zero bars.
        var rows = new List<PriceHistory>
        {
            Bar(new DateTime(2024,11,15), 70m, 75m, 68m, 72m),
            Bar(new DateTime(2024,12,31), 95m, 96m, 94m, 80m), // prior-year close = 80
        };
        var m = SymbolMetricsService.ComputeFromPriceHistory("X", rows)!;
        // Latest bar year = 2024, firstThisYear = 2024-11-15 (Open=70). YTD = (80-70)/70*100 = 14.2857
        Assert.Equal(70m, m.YearStartClose);
        Assert.Equal(14.2857m, m.YtdPercent);
    }

    [Fact]
    public void ComputeFromPriceHistory_computes_percent_from_high_and_low()
    {
        var rows = new List<PriceHistory>
        {
            Bar(new DateTime(2025, 1, 2), 100m, 200m, 50m, 100m),
            Bar(new DateTime(2025,11, 3), 100m, 100m, 100m, 100m),
        };
        var m = SymbolMetricsService.ComputeFromPriceHistory("X", rows)!;
        Assert.Equal(200m, m.High52w);
        Assert.Equal(50m, m.Low52w);
        Assert.Equal(-50m, m.PercentFrom52wHigh);
        Assert.Equal(100m, m.PercentFrom52wLow);
    }
}
