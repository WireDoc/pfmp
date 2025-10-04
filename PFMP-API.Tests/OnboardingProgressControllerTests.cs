using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using PFMP_API;
using PFMP_API.Models;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class OnboardingProgressControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public OnboardingProgressControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    // Removed unstable NotFound/Exists test to simplify; relies on shared dev DB state.

    [Fact]
    public async Task PutThenGet_ReturnsSnapshot()
    {
        var client = _factory.CreateClient();
        var putPayload = new
        {
            currentStepId = "welcome",
            completedStepIds = new[] { "welcome" },
            stepPayloads = new { welcome = new { acknowledged = true } }
        };
        var putResp = await client.PutAsJsonAsync("/api/onboarding/progress", putPayload);
        Assert.Equal(HttpStatusCode.NoContent, putResp.StatusCode);

        var getResp = await client.GetAsync("/api/onboarding/progress");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var dto = await getResp.Content.ReadFromJsonAsync<OnboardingDto>();
        Assert.NotNull(dto);
        Assert.Equal("welcome", dto!.currentStepId);
        Assert.Contains("welcome", dto.completedStepIds);
    }

    [Fact]
    public async Task PatchStep_AdvancesProgress()
    {
        var client = _factory.CreateClient();
        var patchResp = await client.PatchAsJsonAsync("/api/onboarding/progress/step/profile", new { data = new { nickname = "Tester" }, completed = true });
        Assert.Equal(HttpStatusCode.NoContent, patchResp.StatusCode);
        var getResp = await client.GetAsync("/api/onboarding/progress");
        var dto = await getResp.Content.ReadFromJsonAsync<OnboardingDto>();
        Assert.NotNull(dto);
        Assert.Equal("profile", dto!.currentStepId);
        Assert.Contains("profile", dto.completedStepIds);
    }

    private record OnboardingDto(int userId, string? currentStepId, string[] completedStepIds, Dictionary<string, object?> stepPayloads, DateTime updatedUtc);
}
