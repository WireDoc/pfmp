using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class FederalBenefitsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public FederalBenefitsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record SaveRequest(
        decimal? High3AverageSalary,
        bool HasFegliBasic,
        bool HasFegliOptionA,
        bool HasFegliOptionB,
        bool HasFegliOptionC,
        bool HasFedvipDental,
        bool HasFedvipVision,
        bool HasFltcip,
        bool HasFsa,
        bool HasHsa,
        string? FehbPlanName = null,
        string? FehbCoverageLevel = null,
        decimal? FehbMonthlyPremium = null,
        decimal? FegliBasicCoverage = null,
        decimal? FegliTotalMonthlyPremium = null
    );

    private record FederalBenefitsDto(
        int FederalBenefitsProfileId,
        int UserId,
        decimal? High3AverageSalary,
        bool HasFegliBasic,
        bool HasFegliOptionA,
        bool HasFegliOptionB,
        bool HasFegliOptionC,
        string? FehbPlanName,
        string? FehbCoverageLevel,
        decimal? FehbMonthlyPremium,
        bool HasFedvipDental,
        bool HasFedvipVision,
        bool HasFltcip,
        bool HasFsa,
        bool HasHsa,
        string? LastLesFileName
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

        var resp = await client.GetAsync($"/api/FederalBenefits/user/{userId}");
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    [Fact]
    public async Task Save_CreatesProfile_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        var request = new SaveRequest(
            High3AverageSalary: 120000m,
            HasFegliBasic: true,
            HasFegliOptionA: true,
            HasFegliOptionB: false,
            HasFegliOptionC: false,
            HasFedvipDental: true,
            HasFedvipVision: false,
            HasFltcip: false,
            HasFsa: true,
            HasHsa: false,
            FehbPlanName: "Blue Cross Basic",
            FehbCoverageLevel: "Self Plus One",
            FehbMonthlyPremium: 450m,
            FegliBasicCoverage: 150000m,
            FegliTotalMonthlyPremium: 35.50m
        );

        var resp = await client.PostAsJsonAsync($"/api/FederalBenefits/user/{userId}", request);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<FederalBenefitsDto>();
        Assert.NotNull(result);
        Assert.Equal(userId, result!.UserId);
        Assert.Equal(120000m, result.High3AverageSalary);
        Assert.True(result.HasFegliBasic);
        Assert.Equal("Blue Cross Basic", result.FehbPlanName);
        Assert.True(result.HasFedvipDental);
        Assert.True(result.HasFsa);
    }

    [Fact]
    public async Task Save_UpdatesExistingProfile()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        // Create initial
        var req1 = new SaveRequest(
            High3AverageSalary: 100000m,
            HasFegliBasic: false,
            HasFegliOptionA: false,
            HasFegliOptionB: false,
            HasFegliOptionC: false,
            HasFedvipDental: false,
            HasFedvipVision: false,
            HasFltcip: false,
            HasFsa: false,
            HasHsa: false
        );
        await client.PostAsJsonAsync($"/api/FederalBenefits/user/{userId}", req1);

        // Update
        var req2 = new SaveRequest(
            High3AverageSalary: 130000m,
            HasFegliBasic: true,
            HasFegliOptionA: true,
            HasFegliOptionB: true,
            HasFegliOptionC: false,
            HasFedvipDental: true,
            HasFedvipVision: true,
            HasFltcip: false,
            HasFsa: false,
            HasHsa: true,
            FegliBasicCoverage: 160000m
        );
        var resp = await client.PostAsJsonAsync($"/api/FederalBenefits/user/{userId}", req2);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<FederalBenefitsDto>();
        Assert.NotNull(result);
        Assert.Equal(130000m, result!.High3AverageSalary);
        Assert.True(result.HasFegliBasic);
        Assert.True(result.HasFedvipVision);
        Assert.True(result.HasHsa);
    }

    [Fact]
    public async Task GetByUser_ReturnsProfile_AfterSave()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        var request = new SaveRequest(
            High3AverageSalary: 95000m,
            HasFegliBasic: true,
            HasFegliOptionA: false,
            HasFegliOptionB: false,
            HasFegliOptionC: false,
            HasFedvipDental: false,
            HasFedvipVision: false,
            HasFltcip: true,
            HasFsa: false,
            HasHsa: false,
            FehbPlanName: "GEHA Standard"
        );
        await client.PostAsJsonAsync($"/api/FederalBenefits/user/{userId}", request);

        var resp = await client.GetAsync($"/api/FederalBenefits/user/{userId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<FederalBenefitsDto>();
        Assert.NotNull(result);
        Assert.Equal(95000m, result!.High3AverageSalary);
        Assert.Equal("GEHA Standard", result.FehbPlanName);
        Assert.True(result.HasFltcip);
    }

    [Fact]
    public async Task Delete_RemovesProfile()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        // Create
        var request = new SaveRequest(
            High3AverageSalary: 80000m,
            HasFegliBasic: false,
            HasFegliOptionA: false,
            HasFegliOptionB: false,
            HasFegliOptionC: false,
            HasFedvipDental: false,
            HasFedvipVision: false,
            HasFltcip: false,
            HasFsa: false,
            HasHsa: false
        );
        await client.PostAsJsonAsync($"/api/FederalBenefits/user/{userId}", request);

        // Delete
        var resp = await client.DeleteAsync($"/api/FederalBenefits/user/{userId}");
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        // Confirm gone — returns 204 NoContent when no profile exists
        var getResp = await client.GetAsync($"/api/FederalBenefits/user/{userId}");
        Assert.Equal(HttpStatusCode.NoContent, getResp.StatusCode);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenNoProfile()
    {
        var client = _factory.CreateClient();
        var userId = await CreateTestUser(client);

        var resp = await client.DeleteAsync($"/api/FederalBenefits/user/{userId}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task UploadLes_ReturnsBadRequest_NoPdf()
    {
        var client = _factory.CreateClient();

        var content = new MultipartFormDataContent();
        var resp = await client.PostAsync("/api/FederalBenefits/upload-les", content);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }
}
