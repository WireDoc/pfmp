using PFMP_API.Services.Spending;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Wave 14 P3: pure-function tests for the IQR math used by
/// <see cref="AnomalyDetectionService"/>. Covers median, quartiles, and a
/// hand-computed deviation case so the algorithm can't silently drift.
/// </summary>
public class AnomalyDetectionTests
{
    [Theory]
    [InlineData(new[] { 1d }, 1)]
    [InlineData(new[] { 1d, 2 }, 1.5)]
    [InlineData(new[] { 1d, 2, 3 }, 2)]
    [InlineData(new[] { 1d, 2, 3, 4 }, 2.5)]
    [InlineData(new[] { 1d, 2, 3, 4, 5 }, 3)]
    public void Median_MatchesExpected(double[] inputs, double expected)
    {
        var sorted = inputs.Select(x => (decimal)x).OrderBy(x => x).ToList();
        Assert.Equal((decimal)expected, AnomalyDetectionService.Median(sorted));
    }

    [Fact]
    public void Quartile_R7Interpolation_MatchesExcel()
    {
        // Excel QUARTILE.INC for {1..7}: Q1 = 2.5, Q3 = 5.5
        var sorted = new List<decimal> { 1m, 2m, 3m, 4m, 5m, 6m, 7m };
        Assert.Equal(2.5m, AnomalyDetectionService.Quartile(sorted, 0.25));
        Assert.Equal(5.5m, AnomalyDetectionService.Quartile(sorted, 0.75));
    }

    [Fact]
    public void Quartile_SingleElement_ReturnsThatElement()
    {
        var sorted = new List<decimal> { 42m };
        Assert.Equal(42m, AnomalyDetectionService.Quartile(sorted, 0.25));
        Assert.Equal(42m, AnomalyDetectionService.Quartile(sorted, 0.75));
    }

    [Fact]
    public void Deviation_Calculation_HandComputedFood()
    {
        // 6 grocery transactions, typical ~$80. One $400 outlier.
        // sorted = {72, 75, 78, 82, 88, 400}
        // median = (78 + 82) / 2 = 80
        // Q1 = ? at pos 0.25*5 = 1.25 → 75 + 0.25*(78-75) = 75.75
        // Q3 = ? at pos 0.75*5 = 3.75 → 82 + 0.75*(88-82) = 86.5
        // IQR = 86.5 - 75.75 = 10.75
        // deviation for $400 = |400 - 80| / 10.75 = 29.77... → way > 2× threshold
        var sorted = new List<decimal> { 72m, 75m, 78m, 82m, 88m, 400m };
        var median = AnomalyDetectionService.Median(sorted);
        var q1 = AnomalyDetectionService.Quartile(sorted, 0.25);
        var q3 = AnomalyDetectionService.Quartile(sorted, 0.75);
        var iqr = q3 - q1;

        Assert.Equal(80m, median);
        Assert.Equal(75.75m, q1);
        Assert.Equal(86.5m, q3);
        Assert.Equal(10.75m, iqr);

        var deviation = Math.Abs(400m - median) / iqr;
        Assert.True(deviation > 2m, $"deviation {deviation} should exceed 2× threshold");
        Assert.True(deviation > 4m, $"deviation {deviation} should also exceed 4× (High severity) threshold");
    }
}
