using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class DashboardControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public DashboardControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetDashboard_ReturnsOk_WithValidUserId()
    {
        var client = _factory.CreateClient();
        
        // Create a test user first
        var createResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var user = await createResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/dashboard/summary?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        
        // Should have expected dashboard properties
        Assert.True(doc.RootElement.TryGetProperty("netWorth", out _));
        Assert.True(doc.RootElement.TryGetProperty("accounts", out _));
    }

    [Fact]
    public async Task GetDashboard_ReturnsNotFound_WithInvalidUserId()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/dashboard?userId=999999");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
