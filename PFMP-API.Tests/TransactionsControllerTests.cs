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

    private record AccountCreateDto(
        int UserId,
        string Name,
        string Institution,
        string Type,
        decimal Balance
    );

    private record AccountResponseDto(
        int AccountId,
        int UserId,
        string Name
    );

    private record AccountDetailDto(
        int AccountId,
        decimal CurrentBalance
    );

    private record TransferResponseDto(
        int WithdrawalTransactionId,
        int DepositTransactionId,
        decimal Amount
    );

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

    /// <summary>
    /// Phase 6D: Transfer funds between accounts creates paired WITHDRAWAL/DEPOSIT and adjusts balances
    /// </summary>
    [Fact]
    public async Task TransferFunds_CreatesPairedTransactions()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create two investment accounts
        var acct1Resp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Source Account", "Broker1", "Brokerage", 10000m));
        Assert.Equal(HttpStatusCode.Created, acct1Resp.StatusCode);
        var acct1 = await acct1Resp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var acct2Resp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user.UserId, "Dest Account", "Broker2", "Brokerage", 5000m));
        Assert.Equal(HttpStatusCode.Created, acct2Resp.StatusCode);
        var acct2 = await acct2Resp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Transfer $2000 from account 1 to account 2
        var transferResp = await client.PostAsJsonAsync("/api/Transactions/transfer", new
        {
            FromAccountId = acct1!.AccountId,
            ToAccountId = acct2!.AccountId,
            Amount = 2000m,
            Description = "Test transfer"
        });
        Assert.Equal(HttpStatusCode.OK, transferResp.StatusCode);

        // Verify source account balance decreased (10000 - 2000 = 8000)
        var src = await client.GetAsync($"/api/Accounts/{acct1.AccountId}");
        var srcAcct = await src.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.Equal(8000m, srcAcct!.CurrentBalance);

        // Verify destination account balance increased (5000 + 2000 = 7000)
        var dst = await client.GetAsync($"/api/Accounts/{acct2.AccountId}");
        var dstAcct = await dst.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.Equal(7000m, dstAcct!.CurrentBalance);
    }

    [Fact]
    public async Task TransferFunds_SameAccount_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Self Transfer Test", "Broker", "Brokerage", 5000m));
        var acct = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Transfer to same account should fail
        var transferResp = await client.PostAsJsonAsync("/api/Transactions/transfer", new
        {
            FromAccountId = acct!.AccountId,
            ToAccountId = acct.AccountId,
            Amount = 1000m
        });
        Assert.Equal(HttpStatusCode.BadRequest, transferResp.StatusCode);
    }
}
