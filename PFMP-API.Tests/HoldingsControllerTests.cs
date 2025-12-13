using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class HoldingsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public HoldingsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record HoldingDto(
        int HoldingId,
        int AccountId,
        string Symbol,
        string? SecurityName,
        decimal Shares,
        decimal CurrentPrice,
        decimal MarketValue
    );

    private record AccountDto(
        int AccountId,
        int UserId,
        string AccountName,
        string AccountType
    );

    [Fact]
    public async Task ListHoldings_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with data
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Get accounts first
        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Holdings endpoint uses ?accountId= query param
            var resp = await client.GetAsync($"/api/Holdings?accountId={accounts[0].AccountId}");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
    }

    [Fact]
    public async Task GetHolding_ReturnsHolding()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with data
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get accounts
        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Get holdings for account
            var listResp = await client.GetAsync($"/api/Holdings?accountId={accounts[0].AccountId}");
            var holdings = await listResp.Content.ReadFromJsonAsync<List<HoldingDto>>();

            if (holdings != null && holdings.Count > 0)
            {
                // Get specific holding
                var getResp = await client.GetAsync($"/api/Holdings/{holdings[0].HoldingId}");
                Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
            }
        }
    }

    [Fact]
    public async Task GetHoldingPriceHistory_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with data
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get accounts
        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Get holdings for account
            var listResp = await client.GetAsync($"/api/Holdings?accountId={accounts[0].AccountId}");
            var holdings = await listResp.Content.ReadFromJsonAsync<List<HoldingDto>>();

            if (holdings != null && holdings.Count > 0)
            {
                // Get price history for holding
                var historyResp = await client.GetAsync($"/api/Holdings/{holdings[0].HoldingId}/price-history");
                Assert.Equal(HttpStatusCode.OK, historyResp.StatusCode);
            }
        }
    }

    [Fact]
    public async Task RefreshPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // POST to refresh prices
        var resp = await client.PostAsync("/api/Holdings/refresh-prices", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
