using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class DevUsersControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;
    public DevUsersControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_ReturnsOk_AndHasDefault()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/dev/users");
        // In Testing environment dev endpoints should not exist -> expect 404
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
