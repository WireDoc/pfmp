using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class UsersControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;
    public UsersControllerTests(TestingWebAppFactory factory) => _factory = factory;

    private record CreateUserRequest(string FirstName, string LastName, string Email, decimal EmergencyFundTarget = 0m);

    private record UserDto(
        int UserId, string FirstName, string LastName, string Email,
        string? GovernmentAgency, string? MaritalStatus, string? PayGrade,
        string? EmploymentType, string? RetirementSystem, decimal? AnnualIncome,
        DateTime? DateOfBirth, int? DependentCount);

    private record UserUpdatePayload(
        int UserId, string FirstName, string LastName, string Email,
        decimal EmergencyFundTarget = 0m, string? GovernmentAgency = null,
        string? MaritalStatus = null, string? PayGrade = null,
        string? EmploymentType = null, string? RetirementSystem = null,
        decimal? AnnualIncome = null, DateTime? DateOfBirth = null,
        int? DependentCount = null);

    [Fact]
    public async Task PutUser_PreservesExistingNullableFields_WhenRequestSendsNull()
    {
        var client = _factory.CreateClient();
        var email = $"putuser+{Guid.NewGuid():N}@local";

        // Create a user
        var createResp = await client.PostAsJsonAsync("/api/Users", new CreateUserRequest("Carl", "Mansfield", email));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(created);
        var id = created!.UserId;

        // Set profile fields via PUT with all fields populated
        var fullUpdate = new UserUpdatePayload(
            UserId: id, FirstName: "Carl", LastName: "Mansfield", Email: email,
            GovernmentAgency: "Department of Defense", MaritalStatus: "Married",
            PayGrade: "GS-13", EmploymentType: "Federal", RetirementSystem: "FERS",
            AnnualIncome: 95000m, DateOfBirth: new DateTime(1985, 6, 15, 0, 0, 0, DateTimeKind.Utc),
            DependentCount: 2);
        var putResp = await client.PutAsJsonAsync($"/api/Users/{id}", fullUpdate);
        Assert.Equal(HttpStatusCode.NoContent, putResp.StatusCode);

        // Verify fields are set
        var getResp = await client.GetFromJsonAsync<UserDto>($"/api/Users/{id}");
        Assert.NotNull(getResp);
        Assert.Equal("Department of Defense", getResp!.GovernmentAgency);
        Assert.Equal("Married", getResp.MaritalStatus);
        Assert.Equal("GS-13", getResp.PayGrade);
        Assert.Equal(2, getResp.DependentCount);

        // Now PUT with nulls for all optional fields (simulates partial payload / stale state)
        var partialUpdate = new UserUpdatePayload(
            UserId: id, FirstName: "Carl", LastName: "Mansfield", Email: email);
        var putResp2 = await client.PutAsJsonAsync($"/api/Users/{id}", partialUpdate);
        Assert.Equal(HttpStatusCode.NoContent, putResp2.StatusCode);

        // Verify nullable fields are PRESERVED, not wiped
        var getResp2 = await client.GetFromJsonAsync<UserDto>($"/api/Users/{id}");
        Assert.NotNull(getResp2);
        Assert.Equal("Carl", getResp2!.FirstName);
        Assert.Equal("Mansfield", getResp2.LastName);
        Assert.Equal("Department of Defense", getResp2.GovernmentAgency);
        Assert.Equal("Married", getResp2.MaritalStatus);
        Assert.Equal("GS-13", getResp2.PayGrade);
        Assert.Equal("Federal", getResp2.EmploymentType);
        Assert.Equal("FERS", getResp2.RetirementSystem);
        Assert.Equal(95000m, getResp2.AnnualIncome);
        Assert.Equal(2, getResp2.DependentCount);

        // Cleanup
        await client.DeleteAsync($"/api/Users/{id}");
    }

    [Fact]
    public async Task PutUser_AllowsUpdatingNullableFields_ToNewValues()
    {
        var client = _factory.CreateClient();
        var email = $"putuser+{Guid.NewGuid():N}@local";

        var createResp = await client.PostAsJsonAsync("/api/Users", new CreateUserRequest("Test", "User", email));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(created);
        var id = created!.UserId;

        // Set initial profile
        var update1 = new UserUpdatePayload(
            UserId: id, FirstName: "Test", LastName: "User", Email: email,
            GovernmentAgency: "NASA", PayGrade: "GS-09");
        await client.PutAsJsonAsync($"/api/Users/{id}", update1);

        // Update to different non-null values
        var update2 = new UserUpdatePayload(
            UserId: id, FirstName: "Test", LastName: "User", Email: email,
            GovernmentAgency: "Department of Energy", PayGrade: "GS-12",
            MaritalStatus: "Single");
        var putResp = await client.PutAsJsonAsync($"/api/Users/{id}", update2);
        Assert.Equal(HttpStatusCode.NoContent, putResp.StatusCode);

        var result = await client.GetFromJsonAsync<UserDto>($"/api/Users/{id}");
        Assert.NotNull(result);
        Assert.Equal("Department of Energy", result!.GovernmentAgency);
        Assert.Equal("GS-12", result.PayGrade);
        Assert.Equal("Single", result.MaritalStatus);

        await client.DeleteAsync($"/api/Users/{id}");
    }

    [Fact]
    public async Task PutUser_ReturnsBadRequest_OnIdMismatch()
    {
        var client = _factory.CreateClient();
        var payload = new UserUpdatePayload(UserId: 999, FirstName: "X", LastName: "Y", Email: "x@y.com");
        var resp = await client.PutAsJsonAsync("/api/Users/1", payload);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task PutUser_ReturnsNotFound_ForMissingUser()
    {
        var client = _factory.CreateClient();
        var payload = new UserUpdatePayload(UserId: 99999, FirstName: "X", LastName: "Y", Email: "x@y.com");
        var resp = await client.PutAsJsonAsync("/api/Users/99999", payload);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
