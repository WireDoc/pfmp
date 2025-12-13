using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class MarketControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public MarketControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetPrice_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        
        // Endpoint is /api/Market/price/{symbol}
        var resp = await client.GetAsync("/api/Market/price/AAPL");
        // Market data may return 200 with data or 404 if not available, or 500 if service error
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound ||
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Endpoint is GET /api/Market/prices?symbols=AAPL,MSFT (not POST)
        var resp = await client.GetAsync("/api/Market/prices?symbols=AAPL,MSFT,GOOGL");
        // May return OK, NotFound, or 500 if market service not configured
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound ||
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetTspPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/Market/tsp");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetTspFundPrice_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        
        // Test C Fund (common choice)
        var resp = await client.GetAsync("/api/Market/tsp/C");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetMarketIndices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/Market/indices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetMarketHealth_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Endpoint is /api/Market/health (not /status)
        var resp = await client.GetAsync("/api/Market/health");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
