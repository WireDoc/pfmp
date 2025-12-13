using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class TransactionsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public TransactionsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record TransactionDto(
        int TransactionId,
        int AccountId,
        string Type,
        decimal Shares,
        decimal PricePerShare,
        decimal TotalAmount,
        DateTime TransactionDate
    );

    private record AccountDto(
        int AccountId,
        int UserId,
        string AccountName,
        string AccountType
    );

    [Fact]
    public async Task ListTransactions_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with data
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        Assert.Equal(HttpStatusCode.Created, createUserResp.StatusCode);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Get accounts first
        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Transactions endpoint uses ?accountId= query param
            var resp = await client.GetAsync($"/api/Transactions?accountId={accounts[0].AccountId}");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
    }

    [Fact]
    public async Task GetTransaction_ReturnsTransaction()
    {
        var client = _factory.CreateClient();
        
        // Create a test user with data
        var createUserResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await createUserResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Get accounts
        var accountsResp = await client.GetAsync($"/api/Accounts/user/{user!.UserId}");
        var accounts = await accountsResp.Content.ReadFromJsonAsync<List<AccountDto>>();
        
        if (accounts != null && accounts.Count > 0)
        {
            // Get transactions for account
            var listResp = await client.GetAsync($"/api/Transactions?accountId={accounts[0].AccountId}");
            var transactions = await listResp.Content.ReadFromJsonAsync<List<TransactionDto>>();

            if (transactions != null && transactions.Count > 0)
            {
                // Get specific transaction
                var getResp = await client.GetAsync($"/api/Transactions/{transactions[0].TransactionId}");
                Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
            }
        }
    }
}
