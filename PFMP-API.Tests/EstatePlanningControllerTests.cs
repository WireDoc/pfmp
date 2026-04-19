using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class EstatePlanningControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public EstatePlanningControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record EstatePlanningDto(
        int EstatePlanningProfileId,
        int UserId,
        bool HasWill,
        DateTime? WillLastReviewedDate,
        bool HasTrust,
        string? TrustType,
        DateTime? TrustLastReviewedDate,
        bool HasFinancialPOA,
        bool HasHealthcarePOA,
        bool HasAdvanceDirective,
        string? AttorneyName,
        DateTime? AttorneyLastConsultDate,
        string? Notes,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    private record SaveRequest(
        bool HasWill = false,
        DateTime? WillLastReviewedDate = null,
        bool HasTrust = false,
        string? TrustType = null,
        DateTime? TrustLastReviewedDate = null,
        bool HasFinancialPOA = false,
        bool HasHealthcarePOA = false,
        bool HasAdvanceDirective = false,
        string? AttorneyName = null,
        DateTime? AttorneyLastConsultDate = null,
        string? Notes = null
    );

    private async Task<int> CreateTestUser(HttpClient client)
    {
        var resp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var user = await resp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);
        return user!.UserId;
    }

    [Fact]
    public async Task GetByUser_ReturnsOk_WhenNoProfile()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        var resp = await client.GetAsync($"/api/EstatePlanning/user/{userId}");
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    [Fact]
    public async Task Save_CreatesProfile_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        var request = new SaveRequest(
            HasWill: true,
            WillLastReviewedDate: new DateTime(2024, 6, 15),
            HasTrust: true,
            TrustType: "Revocable",
            HasFinancialPOA: true,
            HasHealthcarePOA: true,
            HasAdvanceDirective: false,
            AttorneyName: "Jane Smith, Esq.",
            Notes: "Review trust annually"
        );

        var resp = await client.PostAsJsonAsync($"/api/EstatePlanning/user/{userId}", request);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<EstatePlanningDto>();
        Assert.NotNull(result);
        Assert.Equal(userId, result!.UserId);
        Assert.True(result.HasWill);
        Assert.True(result.HasTrust);
        Assert.Equal("Revocable", result.TrustType);
        Assert.True(result.HasFinancialPOA);
        Assert.True(result.HasHealthcarePOA);
        Assert.False(result.HasAdvanceDirective);
        Assert.Equal("Jane Smith, Esq.", result.AttorneyName);
        Assert.Equal("Review trust annually", result.Notes);
    }

    [Fact]
    public async Task Save_UpdatesExistingProfile()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        // Create initial
        var initial = new SaveRequest(HasWill: true, HasFinancialPOA: false);
        await client.PostAsJsonAsync($"/api/EstatePlanning/user/{userId}", initial);

        // Update
        var updated = new SaveRequest(
            HasWill: true,
            HasFinancialPOA: true,
            HasHealthcarePOA: true,
            HasAdvanceDirective: true,
            AttorneyName: "Updated Attorney"
        );
        var resp = await client.PostAsJsonAsync($"/api/EstatePlanning/user/{userId}", updated);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<EstatePlanningDto>();
        Assert.NotNull(result);
        Assert.True(result!.HasFinancialPOA);
        Assert.True(result.HasHealthcarePOA);
        Assert.True(result.HasAdvanceDirective);
        Assert.Equal("Updated Attorney", result.AttorneyName);
    }

    [Fact]
    public async Task GetByUser_ReturnsProfile_AfterSave()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        var request = new SaveRequest(
            HasWill: true,
            HasTrust: false,
            HasFinancialPOA: true,
            AttorneyName: "Test Attorney"
        );
        await client.PostAsJsonAsync($"/api/EstatePlanning/user/{userId}", request);

        var resp = await client.GetAsync($"/api/EstatePlanning/user/{userId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<EstatePlanningDto>();
        Assert.NotNull(result);
        Assert.Equal(userId, result!.UserId);
        Assert.True(result.HasWill);
        Assert.False(result.HasTrust);
        Assert.True(result.HasFinancialPOA);
        Assert.Equal("Test Attorney", result.AttorneyName);
    }
}
