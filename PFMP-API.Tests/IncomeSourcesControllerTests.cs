using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class IncomeSourcesControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public IncomeSourcesControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    // Match actual IncomeSource model - enums as strings
    private record CreateIncomeSourceRequest(
        int UserId,
        string Name,
        string Type,           // IncomeType enum as string
        string Frequency,      // IncomeFrequency enum as string
        decimal Amount,
        bool IsActive
    );

    private record IncomeSourceDto(
        int IncomeSourceId,
        string Name,
        string Type,
        string Frequency,
        decimal Amount,
        bool IsActive
    );

    [Fact]
    public async Task ListIncomeSources_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/IncomeSources/user/{user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task CreateIncomeSource_ReturnsCreated()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newIncome = new CreateIncomeSourceRequest(
            UserId: user!.UserId,
            Name: "Primary Salary",
            Type: "Salary",
            Frequency: "Monthly",
            Amount: 5000m,
            IsActive: true
        );

        var resp = await client.PostAsJsonAsync("/api/IncomeSources", newIncome, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }

    [Fact]
    public async Task GetIncomeSource_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newIncome = new CreateIncomeSourceRequest(
            user!.UserId, "Test Salary", "Salary", "BiWeekly", 2500m, true
        );
        var createResp = await client.PostAsJsonAsync("/api/IncomeSources", newIncome, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        
        var created = await createResp.Content.ReadFromJsonAsync<IncomeSourceDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var getResp = await client.GetAsync($"/api/IncomeSources/{created!.IncomeSourceId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
    }

    [Fact]
    public async Task UpdateIncomeSource_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newIncome = new CreateIncomeSourceRequest(
            user!.UserId, "Update Test", "Pension", "Monthly", 3000m, true
        );
        var createResp = await client.PostAsJsonAsync("/api/IncomeSources", newIncome, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<IncomeSourceDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var updatePayload = new
        {
            IncomeSourceId = created!.IncomeSourceId,
            UserId = user.UserId,
            Name = "Updated Income",
            Type = "Pension",
            Frequency = "Monthly",
            Amount = 3500m,
            IsActive = true
        };

        var updateResp = await client.PutAsJsonAsync($"/api/IncomeSources/{created.IncomeSourceId}", updatePayload, TestJsonOptions.Default);
        Assert.Equal(HttpStatusCode.NoContent, updateResp.StatusCode);
    }

    [Fact]
    public async Task DeleteIncomeSource_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var newIncome = new CreateIncomeSourceRequest(
            user!.UserId, "Delete Test", "SocialSecurity", "Monthly", 2000m, true
        );
        var createResp = await client.PostAsJsonAsync("/api/IncomeSources", newIncome, TestJsonOptions.Default);
        var created = await createResp.Content.ReadFromJsonAsync<IncomeSourceDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var deleteResp = await client.DeleteAsync($"/api/IncomeSources/{created!.IncomeSourceId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        var getResp = await client.GetAsync($"/api/IncomeSources/{created.IncomeSourceId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }
}
