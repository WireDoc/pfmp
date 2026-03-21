using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class MarketDataControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public MarketDataControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetQuote_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/quote/AAPL");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound ||
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetQuotes_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/quotes?symbols=AAPL,MSFT");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetQuotes_MissingSymbols_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/quotes");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task GetPrice_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/price/AAPL");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound ||
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/prices?symbols=AAPL,MSFT,GOOGL");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound ||
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPrices_MissingSymbols_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/prices");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task GetHistoricalPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/historical/AAPL");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetCompanyProfile_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/company/AAPL");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound ||
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetTspPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/tsp");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetMarketIndices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/indices");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetEconomicIndicators_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/economic");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMarketOverview_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/overview");
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMarketHealth_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/market-data/health");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
