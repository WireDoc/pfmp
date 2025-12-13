using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class TasksControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public TasksControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    // Match actual CreateTaskRequest model - enums sent as strings
    // Valid TaskType: Rebalancing, StockPurchase, TaxLossHarvesting, CashOptimization, GoalAdjustment, InsuranceReview, EmergencyFundContribution, TSPAllocationChange
    // Valid TaskPriority: Low, Medium, High, Critical
    private record CreateTaskRequest(
        int UserId,
        string Title,
        string Description,   // Required in the API
        string Type,          // TaskType enum as string
        string Priority,      // TaskPriority enum as string  
        DateTime? DueDate
    );

    // Response DTO - enums serialize as strings due to JsonStringEnumConverter
    private record TaskDto(
        int TaskId,
        int UserId,
        string Title,
        string? Description,
        string Type,
        string Status,
        string Priority,
        int ProgressPercentage,
        DateTime CreatedDate
    );

    [Fact]
    public async Task ListTasks_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/Tasks?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task CreateTask_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newTask = new CreateTaskRequest(
            UserId: user!.UserId,
            Title: "Rebalance Portfolio",
            Description: "Annual portfolio rebalancing review",
            Type: "Rebalancing",
            Priority: "Medium",
            DueDate: DateTime.UtcNow.AddDays(7)
        );

        var resp = await client.PostAsJsonAsync("/api/Tasks", newTask, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetTask_ReturnsTask()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newTask = new CreateTaskRequest(
            user!.UserId, "Get Test Task", "Task description", "StockPurchase", "High", null
        );
        var createResp = await client.PostAsJsonAsync("/api/Tasks", newTask, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        
        var created = await createResp.Content.ReadFromJsonAsync<TaskDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var getResp = await client.GetAsync($"/api/Tasks/{created!.TaskId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
    }

    [Fact]
    public async Task UpdateTaskProgress_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newTask = new CreateTaskRequest(
            user!.UserId, "Progress Test", "Test progress update", "CashOptimization", "Medium", null
        );
        var createResp = await client.PostAsJsonAsync("/api/Tasks", newTask, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<TaskDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // API expects just int, not an object
        var updateResp = await client.PatchAsJsonAsync($"/api/Tasks/{created!.TaskId}/progress", 50);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
    }

    [Fact]
    public async Task UpdateTaskStatus_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newTask = new CreateTaskRequest(
            user!.UserId, "Status Test", "Test status update", "Rebalancing", "Low", null
        );
        var createResp = await client.PostAsJsonAsync("/api/Tasks", newTask, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<TaskDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // API expects TaskStatus enum as string (with JsonStringEnumConverter)
        var updateResp = await client.PatchAsJsonAsync($"/api/Tasks/{created!.TaskId}/status", "InProgress", TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
    }

    [Fact]
    public async Task CompleteTask_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newTask = new CreateTaskRequest(
            user!.UserId, "Complete Test", "Test completion", "TaxLossHarvesting", "High", null
        );
        var createResp = await client.PostAsJsonAsync("/api/Tasks", newTask, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<TaskDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // API is PATCH, accepts optional CompleteTaskRequest (can send null body)
        var completeResp = await client.PatchAsJsonAsync($"/api/Tasks/{created!.TaskId}/complete", (object?)null);
        Assert.Equal(HttpStatusCode.OK, completeResp.StatusCode);
    }

    [Fact]
    public async Task DismissTask_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newTask = new CreateTaskRequest(
            user!.UserId, "Dismiss Test", "Test dismissal", "InsuranceReview", "Low", null
        );
        var createResp = await client.PostAsJsonAsync("/api/Tasks", newTask, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<TaskDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // API is PATCH, accepts optional string dismissalNotes (can send null)
        var dismissResp = await client.PatchAsJsonAsync($"/api/Tasks/{created!.TaskId}/dismiss", (string?)null);
        Assert.Equal(HttpStatusCode.OK, dismissResp.StatusCode);
    }
}
