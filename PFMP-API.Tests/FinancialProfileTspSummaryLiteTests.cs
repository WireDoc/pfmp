using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class FinancialProfileTspSummaryLiteTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public FinancialProfileTspSummaryLiteTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SummaryLite_Returns_Empty_When_No_Positions()
    {
        var client = _factory.CreateClient();
        // Create a test user via admin endpoint
        var createResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", content: null);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(created);
        var userId = created!.UserId;

        var resp = await client.GetAsync($"/api/financial-profile/{userId}/tsp/summary-lite");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<TspSummaryLiteDto>();
        Assert.NotNull(json);
        Assert.NotNull(json!.items);
        Assert.Empty(json.items);
    }

    private class TspSummaryLiteDto
    {
        public List<TspSummaryLiteItemDto> items { get; set; } = new();
        public decimal? totalBalance { get; set; }
        public DateTime? asOfUtc { get; set; }
    }
    private class TspSummaryLiteItemDto
    {
        public string fundCode { get; set; } = string.Empty;
        public decimal? currentPrice { get; set; }
        public decimal units { get; set; }
        public decimal? currentMarketValue { get; set; }
        public decimal? currentMixPercent { get; set; }
    }
}
