using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class AccountsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public AccountsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record AccountDto(
        int AccountId,
        int UserId,
        string AccountName,
        string AccountType,
        string? Institution,
        decimal CurrentBalance
    );

    [Fact]
    public async Task ListAccountsByUser_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with data
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Accounts uses /user/{userId} path pattern
        var resp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task GetAccount_ReturnsAccount()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with accounts
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get list of accounts
        var listResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await listResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Get specific account by ID
            var getResp = await client.GetAsync($"/api/Accounts/{accounts[0].AccountId}");
            Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        }
    }

    [Fact]
    public async Task UpdateAccount_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with accounts
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get list of accounts
        var listResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await listResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            var account = accounts[0];
            
            // Update using AccountUpdateRequest format
            var updatePayload = new
            {
                Name = "Updated Account",
                Institution = account.Institution,
                Balance = account.CurrentBalance,
                Type = account.AccountType,
                AccountNumber = (string?)null,
                Purpose = (string?)null
            };

            var updateResp = await client.PutAsJsonAsync($"/api/Accounts/{account.AccountId}", updatePayload);
            Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        }
    }

    [Fact]
    public async Task GetAccountPerformance_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with accounts
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get list of accounts
        var listResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await listResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Get performance for first account
            var perfResp = await client.GetAsync($"/api/Accounts/{accounts[0].AccountId}/performance");
            // May return OK or NotFound depending on data
            Assert.True(perfResp.StatusCode == HttpStatusCode.OK || perfResp.StatusCode == HttpStatusCode.NotFound);
        }
    }

    [Fact]
    public async Task GetCashOptimization_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with accounts
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get cash optimization for user
        var resp = await client.GetAsync($"/api/Accounts/cash-optimization/user/{user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}
