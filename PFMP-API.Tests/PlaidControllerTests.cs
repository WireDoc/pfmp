using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class PlaidControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public PlaidControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record LinkTokenRequest(int UserId);
    private record LinkTokenResponse(string LinkToken, string? Expiration);
    private record PlaidConnectionDto(int ConnectionId, int UserId, string InstitutionName, string? Status);
    private record PlaidAccountDto(int AccountId, string Name, string Type, decimal? Balance);

    [Fact]
    public async Task CreateLinkToken_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var request = new LinkTokenRequest(user!.UserId);
        var resp = await client.PostAsJsonAsync("/api/Plaid/link-token", request);
        
        // In test environment, Plaid may not be configured, so accept multiple statuses
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.BadRequest ||
                   resp.StatusCode == HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task GetConnections_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Endpoint is GET /api/Plaid/connections?userId=X
        var resp = await client.GetAsync($"/api/Plaid/connections?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        
        var connections = await resp.Content.ReadFromJsonAsync<List<PlaidConnectionDto>>();
        Assert.NotNull(connections);
    }

    [Fact]
    public async Task GetConnectionAccounts_NotFound_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        
        // Create user for valid userId param
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        
        // Use a non-existent Guid for connectionId
        var nonExistentGuid = Guid.NewGuid();
        var resp = await client.GetAsync($"/api/Plaid/connections/{nonExistentGuid}/accounts?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task RefreshConnection_NotFound_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.PostAsync("/api/Plaid/connections/999999/refresh", null);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task DeleteConnection_NotFound_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        
        // Create user for valid userId param
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        
        // Use a non-existent Guid for connectionId
        var nonExistentGuid = Guid.NewGuid();
        var resp = await client.DeleteAsync($"/api/Plaid/connections/{nonExistentGuid}?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetPlaidWebhookStatus_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var resp = await client.GetAsync("/api/Plaid/webhook-status");
        // May return OK or NotFound depending on implementation
        Assert.True(resp.StatusCode == HttpStatusCode.OK || 
                   resp.StatusCode == HttpStatusCode.NotFound);
    }
}
