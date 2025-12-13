using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class CashAccountsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public CashAccountsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record CreateCashAccountRequest(
        int UserId,
        string Institution,
        string Nickname,
        string AccountType,
        decimal Balance,
        decimal InterestRateApr,
        string Purpose,
        bool IsEmergencyFund
    );

    private record CashAccountDto(
        Guid CashAccountId,
        int UserId,
        string Institution,
        string Nickname,
        string AccountType,
        decimal Balance,
        decimal InterestRateApr,
        string Purpose,
        bool IsEmergencyFund
    );

    [Fact]
    public async Task ListCashAccounts_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var resp = await client.GetAsync($"/api/cashaccounts?userId={user!.UserId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        
        var accounts = await resp.Content.ReadFromJsonAsync<List<CashAccountDto>>();
        Assert.NotNull(accounts);
    }

    [Fact]
    public async Task CreateCashAccount_ReturnsCreated()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newAccount = new CreateCashAccountRequest(
            UserId: user!.UserId,
            Institution: "Chase",
            Nickname: "Test Checking",
            AccountType: "checking",
            Balance: 1500.00m,
            InterestRateApr: 0.01m,
            Purpose: "Daily expenses",
            IsEmergencyFund: false
        );

        var resp = await client.PostAsJsonAsync("/api/cashaccounts", newAccount);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var created = await resp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(created);
        Assert.Equal("Chase", created!.Institution);
        Assert.Equal(1500.00m, created.Balance);
    }

    [Fact]
    public async Task GetCashAccount_ReturnsAccount()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Create an account
        var newAccount = new CreateCashAccountRequest(
            UserId: user!.UserId,
            Institution: "Wells Fargo",
            Nickname: "Savings",
            AccountType: "savings",
            Balance: 5000.00m,
            InterestRateApr: 4.5m,
            Purpose: "Emergency fund",
            IsEmergencyFund: true
        );

        var createResp = await client.PostAsJsonAsync("/api/cashaccounts", newAccount);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(created);

        // Get the account
        var getResp = await client.GetAsync($"/api/cashaccounts/{created!.CashAccountId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        
        var fetched = await getResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(fetched);
        Assert.Equal(created.CashAccountId, fetched!.CashAccountId);
    }

    [Fact]
    public async Task UpdateCashAccount_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Create an account
        var newAccount = new CreateCashAccountRequest(
            UserId: user!.UserId,
            Institution: "BOA",
            Nickname: "Checking",
            AccountType: "checking",
            Balance: 2000.00m,
            InterestRateApr: 0.01m,
            Purpose: "Bills",
            IsEmergencyFund: false
        );

        var createResp = await client.PostAsJsonAsync("/api/cashaccounts", newAccount);
        var created = await createResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(created);

        // Update the account
        var updatePayload = new { Nickname = "Updated Checking", Balance = 2500.00m };
        var updateResp = await client.PutAsJsonAsync($"/api/cashaccounts/{created!.CashAccountId}", updatePayload);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // Verify update from the response directly (PUT returns the updated account)
        var fetched = await updateResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(fetched);
        Assert.Equal("Updated Checking", fetched!.Nickname);
        Assert.Equal(2500.00m, fetched.Balance);
    }

    [Fact]
    public async Task DeleteCashAccount_ReturnsNoContent()
    {
        var client = _factory.CreateClient();
        
        // Create a test user
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Create an account
        var newAccount = new CreateCashAccountRequest(
            UserId: user!.UserId,
            Institution: "USAA",
            Nickname: "To Delete",
            AccountType: "savings",
            Balance: 100.00m,
            InterestRateApr: 0.5m,
            Purpose: "Test",
            IsEmergencyFund: false
        );

        var createResp = await client.PostAsJsonAsync("/api/cashaccounts", newAccount);
        var created = await createResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(created);

        // Delete the account
        var deleteResp = await client.DeleteAsync($"/api/cashaccounts/{created!.CashAccountId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Verify deletion
        var getResp = await client.GetAsync($"/api/cashaccounts/{created.CashAccountId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }

    [Fact]
    public async Task GetCashAccount_ReturnsNotFound_ForInvalidId()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/cashaccounts/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
