using System.Net;
using System.Net.Http.Json;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class HoldingsControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public HoldingsControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record HoldingDto(
        int HoldingId,
        int AccountId,
        string Symbol,
        string? SecurityName,
        decimal Shares,
        decimal CurrentPrice,
        decimal MarketValue
    );

    private record HoldingResponseDto(
        int HoldingId,
        int AccountId,
        string Symbol,
        string? Name,
        string AssetType,
        decimal Quantity,
        decimal AverageCostBasis,
        decimal CurrentPrice,
        decimal CurrentValue
    );

    private record AccountDto(
        int AccountId,
        int UserId,
        string AccountName,
        string AccountType
    );

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

    private record TransactionDto(
        int TransactionId,
        int AccountId,
        int? HoldingId,
        string TransactionType,
        string? Symbol,
        decimal? Quantity,
        decimal? Price,
        decimal Amount,
        string? Description
    );

    [Fact]
    public async Task ListHoldings_ReturnsOk()
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
            // Holdings endpoint uses ?accountId= query param
            var resp = await client.GetAsync($"/api/Holdings?accountId={accounts[0].AccountId}");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
    }

    [Fact]
    public async Task GetHolding_ReturnsHolding()
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
            // Get holdings for account
            var listResp = await client.GetAsync($"/api/Holdings?accountId={accounts[0].AccountId}");
            var holdings = await listResp.Content.ReadFromJsonAsync<List<HoldingDto>>();

            if (holdings != null && holdings.Count > 0)
            {
                // Get specific holding
                var getResp = await client.GetAsync($"/api/Holdings/{holdings[0].HoldingId}");
                Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
            }
        }
    }

    [Fact]
    public async Task GetHoldingPriceHistory_ReturnsOk()
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
            // Get holdings for account
            var listResp = await client.GetAsync($"/api/Holdings?accountId={accounts[0].AccountId}");
            var holdings = await listResp.Content.ReadFromJsonAsync<List<HoldingDto>>();

            if (holdings != null && holdings.Count > 0)
            {
                // Get price history for holding
                var historyResp = await client.GetAsync($"/api/Holdings/{holdings[0].HoldingId}/price-history");
                Assert.Equal(HttpStatusCode.OK, historyResp.StatusCode);
            }
        }
    }

    [Fact]
    public async Task RefreshPrices_ReturnsOk()
    {
        var client = _factory.CreateClient();
        
        // POST to refresh prices
        var resp = await client.PostAsync("/api/Holdings/refresh-prices", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    /// <summary>
    /// Phase 5B: CreateHolding auto-creates INITIAL_BALANCE transaction for manual accounts
    /// </summary>
    [Fact]
    public async Task CreateHolding_ManualAccount_CreatesInitialBalanceTransaction()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Brokerage", "TestBroker", "Brokerage", 10000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Add a non-$CASH holding
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "AAPL",
            Name = "Apple Inc",
            AssetType = 0, // Stock
            Quantity = 10m,
            AverageCostBasis = 150m,
            CurrentPrice = 155m,
            PurchaseDate = DateTime.UtcNow.AddDays(-30)
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Verify INITIAL_BALANCE transaction was auto-created
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=INITIAL_BALANCE");
        Assert.Equal(HttpStatusCode.OK, txResp.StatusCode);
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();

        // Should find at least one INITIAL_BALANCE for AAPL
        var aaplTx = transactions!.FirstOrDefault(t => t.Symbol == "AAPL");
        Assert.NotNull(aaplTx);
        Assert.Equal(holding!.HoldingId, aaplTx!.HoldingId);
        Assert.Equal(10m, aaplTx.Quantity);
        Assert.Equal(150m, aaplTx.Price);
        Assert.Equal(1500m, aaplTx.Amount); // 10 * 150
    }

    /// <summary>
    /// Phase 5C: CreateHolding auto-debits $CASH holding when purchasing shares
    /// </summary>
    [Fact]
    public async Task CreateHolding_ManualAccount_DebitsCashHolding()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account (this also creates a $CASH holding)
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Brokerage 2", "TestBroker", "Brokerage", 10000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Get $CASH holding and note its initial quantity
        var holdingsResp = await client.GetAsync($"/api/Holdings?accountId={account!.AccountId}");
        var holdings = await holdingsResp.Content.ReadFromJsonAsync<List<HoldingResponseDto>>();
        var cashBefore = holdings!.FirstOrDefault(h => h.Symbol == "$CASH");
        Assert.NotNull(cashBefore);
        var cashQtyBefore = cashBefore!.Quantity;

        // Add a stock holding: 10 shares at $150 = $1500 purchase
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account.AccountId,
            Symbol = "MSFT",
            Name = "Microsoft Corp",
            AssetType = 0, // Stock
            Quantity = 10m,
            AverageCostBasis = 150m,
            CurrentPrice = 155m,
            PurchaseDate = DateTime.UtcNow.AddDays(-7)
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);

        // Verify $CASH was debited by the purchase amount
        holdingsResp = await client.GetAsync($"/api/Holdings?accountId={account.AccountId}");
        holdings = await holdingsResp.Content.ReadFromJsonAsync<List<HoldingResponseDto>>();
        var cashAfter = holdings!.First(h => h.Symbol == "$CASH");

        var expectedCash = cashQtyBefore - (10m * 150m);
        Assert.Equal(expectedCash, cashAfter.Quantity);

        // Verify a $CASH debit transaction was created
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var cashDebitTx = transactions!.FirstOrDefault(t => t.Symbol == "$CASH" && t.Amount < 0);
        Assert.NotNull(cashDebitTx);
        Assert.Equal(-1500m, cashDebitTx!.Amount);
        Assert.Contains("MSFT", cashDebitTx.Description ?? "");
    }

    /// <summary>
    /// DeleteHolding cascades: removes transactions and price history before deleting
    /// </summary>
    [Fact]
    public async Task DeleteHolding_RemovesAssociatedTransactions()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Brokerage 3", "TestBroker", "Brokerage", 5000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Add a holding (which auto-creates INITIAL_BALANCE transaction)
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "GOOG",
            Name = "Alphabet Inc",
            AssetType = 0,
            Quantity = 5m,
            AverageCostBasis = 140m,
            CurrentPrice = 145m,
            PurchaseDate = DateTime.UtcNow.AddDays(-14)
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Verify transaction exists
        var txResp = await client.GetAsync($"/api/Transactions?holdingId={holding!.HoldingId}");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        Assert.NotEmpty(transactions!);

        // Delete the holding
        var deleteResp = await client.DeleteAsync($"/api/Holdings/{holding.HoldingId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Verify holding is gone
        var getResp = await client.GetAsync($"/api/Holdings/{holding.HoldingId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);

        // Verify transactions for that holding are also gone
        txResp = await client.GetAsync($"/api/Transactions?holdingId={holding.HoldingId}");
        transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        Assert.Empty(transactions!);
    }

    /// <summary>
    /// $CASH holding itself should NOT trigger auto-transaction or $CASH debit
    /// </summary>
    [Fact]
    public async Task CreateHolding_CashSymbol_NoAutoTransaction()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Brokerage 4", "TestBroker", "Brokerage", 8000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // PostAccount creates $CASH with its own INITIAL_BALANCE. Count those.
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account!.AccountId}&transactionType=INITIAL_BALANCE");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var cashInitTx = transactions!.Where(t => t.Symbol == "$CASH").ToList();
        var cashCountBefore = cashInitTx.Count;

        // Manually add another $CASH holding (simulating duplicate add) — should NOT create extra auto-transaction
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account.AccountId,
            Symbol = "$CASH",
            Name = "Cash Extra",
            AssetType = 7, // Cash
            Quantity = 500m,
            AverageCostBasis = 1m,
            CurrentPrice = 1m
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);

        // Re-check: $CASH INITIAL_BALANCE count should NOT have increased
        txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=INITIAL_BALANCE");
        transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var cashCountAfter = transactions!.Count(t => t.Symbol == "$CASH");
        Assert.Equal(cashCountBefore, cashCountAfter); // No new auto-tx for $CASH
    }
}
