using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class UserAdminControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;
    public UserAdminControllerTests(TestingWebAppFactory factory) => _factory = factory;

    private record CreateUserRequest(string FirstName, string LastName, string Email, decimal EmergencyFundTarget = 0m);
    public record UserDto(int UserId, string FirstName, string LastName, string Email, bool IsTestAccount, bool BypassAuthentication);

    [Fact]
    public async Task CreateAndDeleteUser_Works()
    {
        var client = _factory.CreateClient();
        var email = $"admincreate+{Guid.NewGuid():N}@local";
        var createResp = await client.PostAsJsonAsync("/api/admin/users", new CreateUserRequest("First","Last", email));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(created);
        var del = await client.DeleteAsync($"/api/admin/users/{created!.UserId}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        // second delete returns 404
        var del2 = await client.DeleteAsync($"/api/admin/users/{created.UserId}");
        Assert.Equal(HttpStatusCode.NotFound, del2.StatusCode);
    }

    [Theory]
    [InlineData("fresh")]
    [InlineData("mid")]
    [InlineData("done")]
    public async Task CreateTestUser_Scenarios(string scenario)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsync($"/api/admin/users/test?scenario={scenario}", null);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }
}
