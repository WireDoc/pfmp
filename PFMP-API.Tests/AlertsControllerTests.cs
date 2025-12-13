using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class AlertsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public AlertsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    // Match the actual Alert model structure - enums as strings
    private record CreateAlertRequest(
        int UserId, 
        string Title, 
        string Message, 
        string Category,   // AlertCategory enum as string: Portfolio, Goal, etc.
        string Severity    // AlertSeverity enum as string: Low, Medium, High, Critical
    );
    
    private record AlertDto(
        int AlertId, 
        int UserId, 
        string Title, 
        string Message, 
        string Category, 
        string Severity, 
        bool IsRead, 
        bool IsDismissed,
        DateTime CreatedAt
    );

    [Fact]
    public async Task ListAlerts_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/Alerts?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task CreateAlert_ReturnsCreated()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newAlert = new CreateAlertRequest(
            UserId: user!.UserId,
            Title: "Rate Alert",
            Message: "Your HYSA rate dropped below 4%",
            Category: "Portfolio",
            Severity: "Medium"
        );

        var resp = await client.PostAsJsonAsync("/api/Alerts", newAlert, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var created = await resp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.NotNull(created);
        Assert.Equal("Rate Alert", created!.Title);
        Assert.False(created.IsRead);
        Assert.False(created.IsDismissed);
    }

    [Fact]
    public async Task MarkAlertRead_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        
        var newAlert = new CreateAlertRequest(user!.UserId, "Test", "Test message", "Portfolio", "Low");
        var createResp = await client.PostAsJsonAsync("/api/Alerts", newAlert, TestJsonOptions.Default);
        var alert = await createResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.NotNull(alert);

        // Mark as read
        var markReadResp = await client.PatchAsync($"/api/Alerts/{alert!.AlertId}/read", null);
        Assert.Equal(HttpStatusCode.OK, markReadResp.StatusCode);

        // Verify
        var getResp = await client.GetAsync($"/api/Alerts/{alert.AlertId}");
        var updated = await getResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.True(updated!.IsRead);
    }

    [Fact]
    public async Task DismissAlert_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        
        var newAlert = new CreateAlertRequest(user!.UserId, "Dismiss Test", "Test message", "Portfolio", "Low");
        var createResp = await client.PostAsJsonAsync("/api/Alerts", newAlert, TestJsonOptions.Default);
        var alert = await createResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.NotNull(alert);

        // Dismiss
        var dismissResp = await client.PatchAsync($"/api/Alerts/{alert!.AlertId}/dismiss", null);
        Assert.Equal(HttpStatusCode.OK, dismissResp.StatusCode);

        // Verify
        var getResp = await client.GetAsync($"/api/Alerts/{alert.AlertId}");
        var updated = await getResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.True(updated!.IsDismissed);
    }

    [Fact]
    public async Task UndismissAlert_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        
        var newAlert = new CreateAlertRequest(user!.UserId, "Undismiss Test", "Test message", "Portfolio", "Low");
        var createResp = await client.PostAsJsonAsync("/api/Alerts", newAlert, TestJsonOptions.Default);
        var alert = await createResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.NotNull(alert);

        // Dismiss then undismiss
        await client.PatchAsync($"/api/Alerts/{alert!.AlertId}/dismiss", null);
        var undismissResp = await client.PatchAsync($"/api/Alerts/{alert.AlertId}/undismiss", null);
        Assert.Equal(HttpStatusCode.OK, undismissResp.StatusCode);

        // Verify
        var getResp = await client.GetAsync($"/api/Alerts/{alert.AlertId}");
        var updated = await getResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.False(updated!.IsDismissed);
    }

    [Fact]
    public async Task DeleteAlert_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        
        var newAlert = new CreateAlertRequest(user!.UserId, "Delete Test", "Test message", "Portfolio", "Low");
        var createResp = await client.PostAsJsonAsync("/api/Alerts", newAlert, TestJsonOptions.Default);
        var alert = await createResp.Content.ReadFromJsonAsync<AlertDto>(TestJsonOptions.Default);
        Assert.NotNull(alert);

        // Delete
        var deleteResp = await client.DeleteAsync($"/api/Alerts/{alert!.AlertId}");
        Assert.Equal(HttpStatusCode.OK, deleteResp.StatusCode);

        // Verify deleted
        var getResp = await client.GetAsync($"/api/Alerts/{alert.AlertId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }
}
