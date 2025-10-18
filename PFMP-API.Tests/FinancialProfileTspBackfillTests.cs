using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace PFMP_API.Tests;

public class FinancialProfileTspBackfillTests : IClassFixture<WebApplicationFactory<PFMP_API.Program>>
{
    private readonly WebApplicationFactory<PFMP_API.Program> _factory;

    public FinancialProfileTspBackfillTests(WebApplicationFactory<PFMP_API.Program> factory)
    {
        _factory = factory.WithWebHostBuilder(_ => { });
    }

    [Fact]
    public async Task Backfill_BaseFunds_DryRun_And_Execute()
    {
        var client = _factory.CreateClient();
        // Create user
        var createResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", content: null);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(created);
        var userId = created!.UserId;

        // Dry run
        var dryResp = await client.PostAsync($"/api/financial-profile/{userId}/tsp/backfill/base-funds?dryRun=true", content: null);
        Assert.Equal(HttpStatusCode.OK, dryResp.StatusCode);

        // Execute
        var execResp = await client.PostAsync($"/api/financial-profile/{userId}/tsp/backfill/base-funds?dryRun=false", content: null);
        Assert.Equal(HttpStatusCode.OK, execResp.StatusCode);

        // Idempotent: second execute should create zero
        var execResp2 = await client.PostAsync($"/api/financial-profile/{userId}/tsp/backfill/base-funds?dryRun=false", content: null);
        Assert.Equal(HttpStatusCode.OK, execResp2.StatusCode);
    }
}
