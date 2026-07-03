using Microsoft.Extensions.Caching.Memory;

namespace PFMP_API.Services.Properties;

/// <summary>
/// FHFA House Price Index walk-forward valuation. Not an AVM — takes a trusted
/// anchor value (lender estimate, appraisal, purchase price) with its as-of date
/// and appreciates it by the property's STATE-level FHFA all-transactions index:
///
///     estimate = anchorValue × (latestIndex / indexAtAnchorQuarter)
///
/// Data: the public quarterly CSV at fhfa.gov — no API key, no cost, updated
/// quarterly (~2 month lag after quarter end). State-level is coarser than
/// metro-level but requires no address→MSA mapping; good enough for tracking
/// a personal net-worth number between appraisals.
///
/// Returns null when the property has no anchor value/date or the state isn't
/// found in the index (e.g. territories).
/// </summary>
public class FhfaHpiValuationProvider : IPropertyValuationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FhfaHpiValuationProvider> _logger;

    // FHFA publishes the state all-transactions index as a headerless-ish CSV.
    // Row shape (current format): state,yr,qtr,index[,index_sa...]. The parser
    // below is tolerant: it keeps any row whose first field is a 2-letter state,
    // second/third parse as year/quarter ints, fourth as a decimal.
    private const string CsvUrl = "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_state.csv";
    private const string CacheKey = "FhfaHpi:StateQuarterly";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromDays(7);

    public string ProviderName => "fhfa-hpi";

    // No credentials needed — the CSV is public.
    public bool IsConfigured => true;

    public FhfaHpiValuationProvider(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<FhfaHpiValuationProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<PropertyValuation?> GetValuationAsync(PropertyValuationRequest req)
    {
        if (req.AnchorValue is not > 0 || req.AnchorDate == null)
        {
            _logger.LogInformation(
                "FHFA-HPI needs an anchor value + date (property in {State}); none set — skipping",
                req.State);
            return null;
        }

        var state = req.State.Trim().ToUpperInvariant();
        if (state.Length != 2)
        {
            _logger.LogWarning("FHFA-HPI requires a 2-letter state code; got '{State}'", req.State);
            return null;
        }

        var index = await GetStateIndexAsync();
        if (index == null || !index.TryGetValue(state, out var series) || series.Count == 0)
        {
            _logger.LogWarning("FHFA-HPI has no series for state {State}", state);
            return null;
        }

        // Index value at (or nearest before) the anchor quarter.
        var anchor = req.AnchorDate.Value;
        var anchorQuarter = new QuarterKey(anchor.Year, (anchor.Month - 1) / 3 + 1);
        var anchorPoint = series
            .Where(p => p.Quarter.CompareTo(anchorQuarter) <= 0)
            .OrderByDescending(p => p.Quarter)
            .FirstOrDefault();
        if (anchorPoint == default)
        {
            _logger.LogWarning(
                "FHFA-HPI series for {State} has no data at or before {Year}Q{Q}",
                state, anchorQuarter.Year, anchorQuarter.Q);
            return null;
        }

        var latestPoint = series.OrderByDescending(p => p.Quarter).First();
        if (anchorPoint.Index <= 0) return null;

        var estimate = Math.Round(req.AnchorValue.Value * (latestPoint.Index / anchorPoint.Index), 0);

        _logger.LogInformation(
            "FHFA-HPI walk-forward for {State}: anchor ${Anchor:N0} @ {AY}Q{AQ} (idx {AIdx:F2}) → ${Est:N0} @ {LY}Q{LQ} (idx {LIdx:F2})",
            state, req.AnchorValue.Value, anchorPoint.Quarter.Year, anchorPoint.Quarter.Q, anchorPoint.Index,
            estimate, latestPoint.Quarter.Year, latestPoint.Quarter.Q, latestPoint.Index);

        return new PropertyValuation(
            EstimatedValue: estimate,
            LowEstimate: null,   // an index walk has no meaningful per-property band
            HighEstimate: null,
            Source: ProviderName,
            FetchedAt: DateTime.UtcNow,
            ConfidenceScore: null
        );
    }

    private readonly record struct QuarterKey(int Year, int Q) : IComparable<QuarterKey>
    {
        public int CompareTo(QuarterKey other) =>
            Year != other.Year ? Year.CompareTo(other.Year) : Q.CompareTo(other.Q);
    }

    private readonly record struct IndexPoint(QuarterKey Quarter, decimal Index);

    /// <summary>
    /// Downloads + parses the FHFA state quarterly CSV, cached for 7 days.
    /// Returns state → chronological index points, or null on download failure
    /// (a previously cached copy keeps serving until TTL even if a refresh fails).
    /// </summary>
    private async Task<Dictionary<string, List<IndexPoint>>?> GetStateIndexAsync()
    {
        return await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            try
            {
                var client = _httpClientFactory.CreateClient("Fhfa");
                client.Timeout = TimeSpan.FromSeconds(60);
                var csv = await client.GetStringAsync(CsvUrl);
                var parsed = ParseCsv(csv);
                _logger.LogInformation(
                    "FHFA-HPI CSV loaded: {States} states, {Points} index points",
                    parsed.Count, parsed.Values.Sum(v => v.Count));
                return parsed;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "FHFA-HPI CSV download failed from {Url}", CsvUrl);
                // Cache the null briefly so a hard outage doesn't hammer fhfa.gov
                // on every valuation attempt.
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                return null;
            }
        });
    }

    private static Dictionary<string, List<IndexPoint>> ParseCsv(string csv)
    {
        var result = new Dictionary<string, List<IndexPoint>>(StringComparer.OrdinalIgnoreCase);
        foreach (var rawLine in csv.Split('\n'))
        {
            var line = rawLine.Trim().TrimEnd('\r');
            if (line.Length == 0) continue;

            var parts = line.Split(',');
            if (parts.Length < 4) continue;

            var state = parts[0].Trim().Trim('"');
            if (state.Length != 2 || !state.All(char.IsLetter)) continue; // header/disclaimer rows
            if (!int.TryParse(parts[1].Trim().Trim('"'), out var year) || year < 1970 || year > 2100) continue;
            if (!int.TryParse(parts[2].Trim().Trim('"'), out var quarter) || quarter is < 1 or > 4) continue;
            if (!decimal.TryParse(parts[3].Trim().Trim('"'), System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var idx) || idx <= 0) continue;

            if (!result.TryGetValue(state.ToUpperInvariant(), out var list))
            {
                list = new List<IndexPoint>();
                result[state.ToUpperInvariant()] = list;
            }
            list.Add(new IndexPoint(new QuarterKey(year, quarter), idx));
        }
        return result;
    }
}
