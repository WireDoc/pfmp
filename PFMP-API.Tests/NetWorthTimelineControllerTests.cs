using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class NetWorthTimelineControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public NetWorthTimelineControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetNetWorthTimeline_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Route is at /api/dashboard/net-worth/timeline with ?userId= query param
        var resp = await client.GetAsync($"/api/dashboard/net-worth/timeline?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetNetWorthTimeline_WithPeriod_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Test with different periods
        var periods = new[] { "1M", "3M", "6M", "1Y", "YTD", "ALL" };
        foreach (var period in periods)
        {
            var resp = await client.GetAsync($"/api/dashboard/net-worth/timeline?userId={user!.UserId}&period={period}");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
    }

    [Fact]
    public async Task GetCurrentNetWorth_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Route is at /api/dashboard/net-worth/current
        var resp = await client.GetAsync($"/api/dashboard/net-worth/current?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetNetWorthSparkline_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Route is at /api/dashboard/net-worth/sparkline
        var resp = await client.GetAsync($"/api/dashboard/net-worth/sparkline?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
