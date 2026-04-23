using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class CashTransactionsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public CashTransactionsControllerTests(TestingWebAppFactory factory)
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
        decimal Balance
    );

    private record CashTransactionDto(
        int CashTransactionId,
        Guid? CashAccountId,
        string TransactionType,
        decimal Amount,
        DateTime TransactionDate,
        string? Description,
        string? Category,
        string? Merchant,
        string? CheckNumber,
        decimal? Fee,
        bool IsPending,
        bool IsRecurring,
        string? Notes
    );

    private record AccountResponseDto(int AccountId, int UserId, string Name);
    private record AccountCreateDto(int UserId, string Name, string Institution, string Type, decimal Balance);
    private record AccountDetailDto(int AccountId, decimal CurrentBalance);

    private async Task<(HttpClient client, CashAccountDto account)> SetupAccountAsync(decimal balance = 1000m)
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, userResp.StatusCode);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var newAccount = new CreateCashAccountRequest(
            UserId: user!.UserId,
            Institution: "TestBank",
            Nickname: "Cash CRUD Test",
            AccountType: "checking",
            Balance: balance,
            InterestRateApr: 0.01m,
            Purpose: "testing",
            IsEmergencyFund: false
        );

        var createResp = await client.PostAsJsonAsync("/api/cashaccounts", newAccount);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(created);
        return (client, created!);
    }

    private async Task<decimal> GetAccountBalanceAsync(HttpClient client, Guid cashAccountId)
    {
        var resp = await client.GetAsync($"/api/cashaccounts/{cashAccountId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var acct = await resp.Content.ReadFromJsonAsync<CashAccountDto>();
        return acct!.Balance;
    }

    [Fact]
    public async Task CreateCashTransaction_Deposit_IncreasesBalance()
    {
        var (client, account) = await SetupAccountAsync(balance: 1000m);

        var resp = await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new
            {
                TransactionType = "Deposit",
                Amount = 250.50m,
                TransactionDate = DateTime.UtcNow,
                Description = "Paycheck",
                Category = "Income"
            });

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var tx = await resp.Content.ReadFromJsonAsync<CashTransactionDto>();
        Assert.NotNull(tx);
        Assert.Equal(250.50m, tx!.Amount);
        Assert.Equal("Deposit", tx.TransactionType);

        // Balance should now be 1250.50
        var newBalance = await GetAccountBalanceAsync(client, account.CashAccountId);
        Assert.Equal(1250.50m, newBalance);
    }

    [Fact]
    public async Task CreateCashTransaction_Withdrawal_DecreasesBalance()
    {
        var (client, account) = await SetupAccountAsync(balance: 1000m);

        var resp = await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new
            {
                TransactionType = "Withdrawal",
                Amount = -100m,
                TransactionDate = DateTime.UtcNow,
                Description = "ATM withdrawal"
            });

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var newBalance = await GetAccountBalanceAsync(client, account.CashAccountId);
        Assert.Equal(900m, newBalance);
    }

    [Fact]
    public async Task CreateCashTransaction_ZeroAmount_ReturnsBadRequest()
    {
        var (client, account) = await SetupAccountAsync();

        var resp = await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new
            {
                TransactionType = "Deposit",
                Amount = 0m,
                TransactionDate = DateTime.UtcNow
            });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task CreateCashTransaction_AccountNotFound_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync(
            $"/api/cash-accounts/{Guid.NewGuid()}/transactions",
            new { TransactionType = "Deposit", Amount = 50m, TransactionDate = DateTime.UtcNow });

        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task UpdateCashTransaction_AmountChange_RebalancesAccount()
    {
        var (client, account) = await SetupAccountAsync(balance: 1000m);

        // Create a $200 deposit -> balance 1200
        var createResp = await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new { TransactionType = "Deposit", Amount = 200m, TransactionDate = DateTime.UtcNow });
        var tx = await createResp.Content.ReadFromJsonAsync<CashTransactionDto>();
        Assert.Equal(1200m, await GetAccountBalanceAsync(client, account.CashAccountId));

        // Change to $500 -> balance should become 1500
        var updateResp = await client.PutAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions/{tx!.CashTransactionId}",
            new { Amount = 500m, Description = "Updated" });

        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        var updated = await updateResp.Content.ReadFromJsonAsync<CashTransactionDto>();
        Assert.Equal(500m, updated!.Amount);
        Assert.Equal("Updated", updated.Description);

        Assert.Equal(1500m, await GetAccountBalanceAsync(client, account.CashAccountId));
    }

    [Fact]
    public async Task DeleteCashTransaction_ReversesBalanceImpact()
    {
        var (client, account) = await SetupAccountAsync(balance: 1000m);

        // Create a -$300 withdrawal -> balance 700
        var createResp = await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new { TransactionType = "Withdrawal", Amount = -300m, TransactionDate = DateTime.UtcNow });
        var tx = await createResp.Content.ReadFromJsonAsync<CashTransactionDto>();
        Assert.Equal(700m, await GetAccountBalanceAsync(client, account.CashAccountId));

        // Delete the transaction -> balance back to 1000
        var deleteResp = await client.DeleteAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions/{tx!.CashTransactionId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        Assert.Equal(1000m, await GetAccountBalanceAsync(client, account.CashAccountId));
    }

    [Fact]
    public async Task DeleteCashTransaction_NotFound_ReturnsNotFound()
    {
        var (client, account) = await SetupAccountAsync();
        var resp = await client.DeleteAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions/999999");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetCashTransactions_ReturnsCreatedTransactions()
    {
        var (client, account) = await SetupAccountAsync(balance: 0m);

        await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new { TransactionType = "Deposit", Amount = 100m, TransactionDate = DateTime.UtcNow });
        await client.PostAsJsonAsync(
            $"/api/cash-accounts/{account.CashAccountId}/transactions",
            new { TransactionType = "Withdrawal", Amount = -25m, TransactionDate = DateTime.UtcNow });

        var listResp = await client.GetAsync($"/api/cash-accounts/{account.CashAccountId}/transactions");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var list = await listResp.Content.ReadFromJsonAsync<List<CashTransactionDto>>();
        Assert.NotNull(list);
        Assert.Equal(2, list!.Count);
    }

    /// <summary>
    /// When transferring from a cash account, a CashTransaction record must be created
    /// to maintain the money trail (regression test for prior gap).
    /// </summary>
    [Fact]
    public async Task Transfer_FromCashAccount_CreatesCashTransactionRecord()
    {
        var client = _factory.CreateClient();

        // Create user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        // Create cash account (source)
        var cashResp = await client.PostAsJsonAsync("/api/cashaccounts", new CreateCashAccountRequest(
            user!.UserId, "TestBank", "Cash Source", "checking", 5000m, 0.01m, "test", false));
        var cash = await cashResp.Content.ReadFromJsonAsync<CashAccountDto>();
        Assert.NotNull(cash);

        // Create investment account (destination)
        var invResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user.UserId, "Brokerage Dest", "Broker", "Brokerage", 0m));
        var inv = await invResp.Content.ReadFromJsonAsync<AccountResponseDto>();
        Assert.NotNull(inv);

        // Transfer $1000 cash -> investment
        var transferResp = await client.PostAsJsonAsync("/api/Transactions/transfer", new
        {
            FromAccountId = cash!.CashAccountId.ToString(),
            FromAccountType = "cash",
            ToAccountId = inv!.AccountId.ToString(),
            ToAccountType = "investment",
            Amount = 1000m,
            Description = "Fund brokerage"
        });
        Assert.Equal(HttpStatusCode.OK, transferResp.StatusCode);

        // Cash account balance: 5000 - 1000 = 4000
        Assert.Equal(4000m, await GetAccountBalanceAsync(client, cash.CashAccountId));

        // Cash account should now have 1 Transfer transaction (audit trail)
        var listResp = await client.GetAsync($"/api/cash-accounts/{cash.CashAccountId}/transactions");
        var list = await listResp.Content.ReadFromJsonAsync<List<CashTransactionDto>>();
        Assert.NotNull(list);
        Assert.Single(list!);
        Assert.Equal("Transfer", list![0].TransactionType);
        Assert.Equal(-1000m, list[0].Amount);
    }

    /// <summary>
    /// When transferring TO a cash account, a CashTransaction record must be created.
    /// </summary>
    [Fact]
    public async Task Transfer_ToCashAccount_CreatesCashTransactionRecord()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);

        var invResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Brokerage Source", "Broker", "Brokerage", 5000m));
        var inv = await invResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var cashResp = await client.PostAsJsonAsync("/api/cashaccounts", new CreateCashAccountRequest(
            user.UserId, "TestBank", "Cash Dest", "checking", 100m, 0.01m, "test", false));
        var cash = await cashResp.Content.ReadFromJsonAsync<CashAccountDto>();

        var transferResp = await client.PostAsJsonAsync("/api/Transactions/transfer", new
        {
            FromAccountId = inv!.AccountId.ToString(),
            FromAccountType = "investment",
            ToAccountId = cash!.CashAccountId.ToString(),
            ToAccountType = "cash",
            Amount = 750m,
            Description = "Withdraw to checking"
        });
        Assert.Equal(HttpStatusCode.OK, transferResp.StatusCode);

        // Cash account balance: 100 + 750 = 850
        Assert.Equal(850m, await GetAccountBalanceAsync(client, cash.CashAccountId));

        var listResp = await client.GetAsync($"/api/cash-accounts/{cash.CashAccountId}/transactions");
        var list = await listResp.Content.ReadFromJsonAsync<List<CashTransactionDto>>();
        Assert.NotNull(list);
        Assert.Single(list!);
        Assert.Equal("Transfer", list![0].TransactionType);
        Assert.Equal(750m, list[0].Amount);
    }
}
