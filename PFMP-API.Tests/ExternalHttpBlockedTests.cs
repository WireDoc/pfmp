using Microsoft.Extensions.DependencyInjection;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Sentinel tests that prove no test-environment HttpClient can reach an external service.
/// If any of these fail, the test isolation harness has regressed and unit tests may be
/// charging real money against paid APIs (FMP, RentCast, OpenRouter, etc.).
/// </summary>
public class ExternalHttpBlockedTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public ExternalHttpBlockedTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("https://financialmodelingprep.com/api/v3/quote/AAPL")]
    [InlineData("https://api.rentcast.io/v1/avm/value")]
    [InlineData("https://api.coingecko.com/api/v3/simple/price")]
    [InlineData("https://openrouter.ai/api/v1/chat/completions")]
    [InlineData("https://api.dailytsp.com/")]
    [InlineData("https://api.kraken.com/0/public/Ticker")]
    public async Task DefaultHttpClient_BlocksExternalCalls(string url)
    {
        using var scope = _factory.Services.CreateScope();
        var factory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var client = factory.CreateClient();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => client.GetAsync(url));
        Assert.Contains("External HTTP request blocked", ex.Message);
    }

    [Theory]
    [InlineData("FMP")]
    [InlineData("RentCast")]
    [InlineData("OpenRouter")]
    [InlineData("TSPClient")]
    public async Task NamedHttpClient_BlocksExternalCalls(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var factory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var client = factory.CreateClient(name);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => client.GetAsync("https://example.com/test"));
        Assert.Contains("External HTTP request blocked", ex.Message);
    }
}
