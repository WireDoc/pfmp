using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class HealthEndpointTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public HealthEndpointTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Health_Returns_OK_Status_Json()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("OK", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal("PFMP-API", doc.RootElement.GetProperty("service").GetString());
    }
}
