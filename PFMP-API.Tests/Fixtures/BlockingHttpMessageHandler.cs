using System.Net.Http;

namespace PFMP_API.Tests.Fixtures;

/// <summary>
/// Primary <see cref="HttpMessageHandler"/> installed on every <see cref="IHttpClientFactory"/>-produced
/// client during integration tests. Throws on any outbound HTTP request so that accidental external API
/// calls (RentCast, OpenRouter, FMP, Plaid, Kraken, BinanceUS, CoinGecko, USPS, TSP, etc.) fail loudly
/// instead of consuming live quotas.
/// </summary>
public sealed class BlockingHttpMessageHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException(
            $"External HTTP request blocked in test environment: {request.Method} {request.RequestUri}. " +
            "Tests must not call live external services. Mock the dependency or override the named HttpClient.");
    }
}
