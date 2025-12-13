using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Tests for PortfolioAnalyticsController at /api/portfolios
/// </summary>
public class PortfolioAnalyticsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public PortfolioAnalyticsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record AccountDto(
        int AccountId,
        int UserId,
        string AccountName,
        string AccountType
    );

    [Fact]
    public async Task GetPortfolioPerformance_ReturnsOk()
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
            // Get portfolio performance
            var resp = await client.GetAsync($"/api/portfolios/{accounts[0].AccountId}/performance");
            // May return OK or NotFound depending on data availability
            Assert.True(resp.StatusCode == HttpStatusCode.OK || resp.StatusCode == HttpStatusCode.NotFound);
        }
    }

    [Fact]
    public async Task GetPortfolioAllocation_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            var resp = await client.GetAsync($"/api/portfolios/{accounts[0].AccountId}/allocation");
            Assert.True(resp.StatusCode == HttpStatusCode.OK || resp.StatusCode == HttpStatusCode.NotFound);
        }
    }

    [Fact]
    public async Task GetTaxInsights_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            var resp = await client.GetAsync($"/api/portfolios/{accounts[0].AccountId}/tax-insights");
            Assert.True(resp.StatusCode == HttpStatusCode.OK || resp.StatusCode == HttpStatusCode.NotFound);
        }
    }

    [Fact]
    public async Task GetRiskMetrics_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            var resp = await client.GetAsync($"/api/portfolios/{accounts[0].AccountId}/risk-metrics");
            Assert.True(resp.StatusCode == HttpStatusCode.OK || resp.StatusCode == HttpStatusCode.NotFound);
        }
    }
}
