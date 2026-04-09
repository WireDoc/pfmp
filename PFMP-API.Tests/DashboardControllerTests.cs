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

    // --- Health Score ---

    [Fact]
    public async Task GetHealthScore_ReturnsOk_WithValidUserId()
    {
        var client = _factory.CreateClient();
        var createResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var user = await createResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/dashboard/health-score?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("overallScore", out var scoreProp));
        var score = scoreProp.GetInt32();
        Assert.InRange(score, 0, 100);
        Assert.True(doc.RootElement.TryGetProperty("grade", out _));
        Assert.True(doc.RootElement.TryGetProperty("breakdown", out _));
    }

    [Fact]
    public async Task GetHealthScore_ReturnsNotFound_WithInvalidUserId()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/dashboard/health-score?userId=999999");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // --- Cash Flow Summary ---

    [Fact]
    public async Task GetCashFlowSummary_ReturnsOk_WithValidUserId()
    {
        var client = _factory.CreateClient();
        var createResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var user = await createResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/dashboard/cash-flow-summary?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("totalMonthlyIncome", out _));
        Assert.True(doc.RootElement.TryGetProperty("totalMonthlyExpenses", out _));
        Assert.True(doc.RootElement.TryGetProperty("netCashFlow", out _));
        Assert.True(doc.RootElement.TryGetProperty("savingsRate", out _));
        Assert.True(doc.RootElement.TryGetProperty("incomeBreakdown", out _));
        Assert.True(doc.RootElement.TryGetProperty("expenseBreakdown", out _));
    }

    [Fact]
    public async Task GetCashFlowSummary_ReturnsNotFound_WithInvalidUserId()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/dashboard/cash-flow-summary?userId=999999");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // --- Upcoming Obligations ---

    [Fact]
    public async Task GetUpcomingObligations_ReturnsOk_WithValidUserId()
    {
        var client = _factory.CreateClient();
        var createResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var user = await createResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/dashboard/upcoming-obligations?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("obligations", out var oblArr));
        Assert.Equal(JsonValueKind.Array, oblArr.ValueKind);
        Assert.True(doc.RootElement.TryGetProperty("total", out _));
    }

    [Fact]
    public async Task GetUpcomingObligations_ReturnsNotFound_WithInvalidUserId()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/dashboard/upcoming-obligations?userId=999999");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
