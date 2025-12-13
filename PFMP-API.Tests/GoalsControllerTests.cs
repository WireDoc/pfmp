using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class GoalsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public GoalsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    // Match the actual Goal model - Type and Category are enums serialized as strings
    private record CreateGoalRequest(
        int UserId,
        string Name,
        string? Description,
        string Type,         // GoalType enum as string: EmergencyFund, Retirement, etc.
        string Category,     // GoalCategory enum as string: ShortTerm, MediumTerm, LongTerm, Ongoing
        decimal TargetAmount,
        DateTime? TargetDate,
        int Priority
    );

    private record GoalDto(
        int GoalId,
        string Name,
        string? Description,
        string Type,
        string? Category,
        decimal TargetAmount,
        decimal CurrentAmount,
        DateTime? TargetDate,
        int Priority,
        string Status
    );

    [Fact]
    public async Task ListGoals_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Goals endpoint uses /user/{userId} path pattern
        var resp = await client.GetAsync($"/api/Goals/user/{user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task CreateGoal_ReturnsCreated()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newGoal = new CreateGoalRequest(
            UserId: user!.UserId,
            Name: "Emergency Fund",
            Description: "6 months of expenses",
            Type: "EmergencyFund",
            Category: "ShortTerm",  // Valid GoalCategory enum value
            TargetAmount: 25000m,
            TargetDate: DateTime.UtcNow.AddYears(1),
            Priority: 1
        );

        var resp = await client.PostAsJsonAsync("/api/Goals", newGoal, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }

    [Fact]
    public async Task GetGoal_ReturnsGoal()
    {
        var client = _factory.CreateClient();
        
        // Create a test user and goal
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newGoal = new CreateGoalRequest(
            user!.UserId, "Test Goal", "Description", "EmergencyFund", "ShortTerm", 10000m, null, 1
        );
        var createResp = await client.PostAsJsonAsync("/api/Goals", newGoal, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        
        var created = await createResp.Content.ReadFromJsonAsync<GoalDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // Get by ID
        var getResp = await client.GetAsync($"/api/Goals/{created!.GoalId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
    }

    [Fact]
    public async Task UpdateGoal_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        
        // Create a test user and goal
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newGoal = new CreateGoalRequest(
            user!.UserId, "Update Test", null, "Retirement", "LongTerm", 500000m, null, 2
        );
        var createResp = await client.PostAsJsonAsync("/api/Goals", newGoal, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<GoalDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // Update goal
        var updatePayload = new
        {
            GoalId = created!.GoalId,
            UserId = user.UserId,
            Name = "Updated Goal",
            Type = "Retirement",
            TargetAmount = 600000m,
            CurrentAmount = 0m,
            Priority = 1
        };

        var updateResp = await client.PutAsJsonAsync($"/api/Goals/{created.GoalId}", updatePayload, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.NoContent, updateResp.StatusCode);
    }

    [Fact]
    public async Task DeleteGoal_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        
        // Create a test user and goal
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newGoal = new CreateGoalRequest(
            user!.UserId, "Delete Test", null, "DebtPayoff", "ShortTerm", 5000m, null, 3
        );
        var createResp = await client.PostAsJsonAsync("/api/Goals", newGoal, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<GoalDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // Delete
        var deleteResp = await client.DeleteAsync($"/api/Goals/{created!.GoalId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Verify deleted
        var getResp = await client.GetAsync($"/api/Goals/{created.GoalId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }
}
