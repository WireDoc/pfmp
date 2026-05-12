using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
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

    private record AccountDetailDto(
        int AccountId,
        int UserId,
        string AccountName,
        decimal CurrentBalance
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
        decimal? Fee,
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

        // Add a holding
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
    /// Phase 6: CreateHolding debits Account.CurrentBalance when purchasing shares (no more $CASH holdings)
    /// </summary>
    [Fact]
    public async Task CreateHolding_ManualAccount_DebitsCurrentBalance()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account with $10,000 balance
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Brokerage 2", "TestBroker", "Brokerage", 10000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Verify no $CASH holding exists (Phase 6: cash is tracked at account level)
        var holdingsResp = await client.GetAsync($"/api/Holdings?accountId={account!.AccountId}");
        var holdings = await holdingsResp.Content.ReadFromJsonAsync<List<HoldingResponseDto>>();
        Assert.DoesNotContain(holdings!, h => h.Symbol == "$CASH");

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

        // Verify CurrentBalance was debited by the purchase amount (10000 - 1500 = 8500)
        var acctCheckResp = await client.GetAsync($"/api/Accounts/{account.AccountId}");
        Assert.Equal(HttpStatusCode.OK, acctCheckResp.StatusCode);
        var updatedAccount = await acctCheckResp.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.Equal(8500m, updatedAccount!.CurrentBalance);
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
    /// Phase 6: Account creation does not create $CASH holdings; balance is tracked on Account.CurrentBalance
    /// </summary>
    [Fact]
    public async Task CreateAccount_NoCashHolding()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account with $8000 balance
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Brokerage NoCash", "TestBroker", "Brokerage", 8000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Verify no holdings at all were created (no $CASH)
        var holdingsResp = await client.GetAsync($"/api/Holdings?accountId={account!.AccountId}");
        var holdings = await holdingsResp.Content.ReadFromJsonAsync<List<HoldingResponseDto>>();
        Assert.Empty(holdings!);

        // Verify a DEPOSIT transaction was created (not INITIAL_BALANCE for $CASH)
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var depositTx = transactions!.FirstOrDefault(t => t.TransactionType == "DEPOSIT");
        Assert.NotNull(depositTx);
        Assert.Equal(8000m, depositTx!.Amount);
    }

    /// <summary>
    /// AddShares creates a BUY transaction and recalculates holding via sync service
    /// </summary>
    [Fact]
    public async Task AddShares_BuyMore_RecalculatesHolding()
    {
        var client = _factory.CreateClient();

        // Create a test user
        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        // Create a manual investment account
        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Test Add Shares", "TestBroker", "Brokerage", 50000m));
        Assert.Equal(HttpStatusCode.Created, acctResp.StatusCode);
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Create initial holding: 10 shares at $100
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "TEST",
            Name = "Test Stock",
            AssetType = 0,
            Quantity = 10m,
            AverageCostBasis = 100m,
            CurrentPrice = 120m,
            FundingSource = 2 // ExternalDeposit — no cash debit
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Add 5 more shares at $150
        var addResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/add-shares", new
        {
            Quantity = 5m,
            PricePerShare = 150m,
            TransactionType = "BUY",
            FundingSource = 2 // ExternalDeposit
        });
        Assert.Equal(HttpStatusCode.OK, addResp.StatusCode);
        var updated = await addResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // New quantity should be 15
        Assert.Equal(15m, updated!.Quantity);
        // New avg cost: (10*100 + 5*150) / 15 = 1750/15 ≈ 116.67
        Assert.InRange(updated.AverageCostBasis, 116.66m, 116.67m);
    }

    /// <summary>
    /// AddShares records fee on the transaction when provided
    /// </summary>
    [Fact]
    public async Task AddShares_WithFee_RecordsFeeOnTransaction()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Fee Test", "TestBroker", "Brokerage", 50000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "FEE",
            Name = "Fee Test Stock",
            AssetType = 0,
            Quantity = 10m,
            AverageCostBasis = 100m,
            CurrentPrice = 110m,
            FundingSource = 2
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Add shares with a fee and CashBalance funding source
        var addResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/add-shares", new
        {
            Quantity = 5m,
            PricePerShare = 110m,
            TransactionType = "BUY",
            FundingSource = 0, // CashBalance
            Fee = 9.99m
        });
        Assert.Equal(HttpStatusCode.OK, addResp.StatusCode);

        // Verify the transaction has the fee recorded
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=BUY");
        Assert.Equal(HttpStatusCode.OK, txResp.StatusCode);
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var buyTx = transactions!.FirstOrDefault(t => t.Symbol == "FEE" && t.Quantity == 5m);
        Assert.NotNull(buyTx);
        Assert.Equal(9.99m, buyTx!.Fee);
    }

    /// <summary>
    /// AddShares supports DIVIDEND_REINVEST transaction type
    /// </summary>
    [Fact]
    public async Task AddShares_Drip_CreatesReinvestTransaction()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "DRIP Test", "TestBroker", "Brokerage", 50000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // Create initial holding: 100 shares at $50
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "DIV",
            Name = "Dividend Stock",
            AssetType = 0,
            Quantity = 100m,
            AverageCostBasis = 50m,
            CurrentPrice = 55m,
            FundingSource = 2
        });
        Assert.Equal(HttpStatusCode.Created, holdingResp.StatusCode);
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // DRIP: reinvest 2 shares at $55
        var addResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/add-shares", new
        {
            Quantity = 2m,
            PricePerShare = 55m,
            TransactionType = "DIVIDEND_REINVEST",
            Notes = "Q1 2026 dividend reinvestment"
        });
        Assert.Equal(HttpStatusCode.OK, addResp.StatusCode);
        var updated = await addResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        Assert.Equal(102m, updated!.Quantity);

        // Verify DIVIDEND_REINVEST transaction was created
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=DIVIDEND_REINVEST");
        Assert.Equal(HttpStatusCode.OK, txResp.StatusCode);
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var dripTx = transactions!.FirstOrDefault(t => t.Symbol == "DIV");
        Assert.NotNull(dripTx);
        Assert.Equal(2m, dripTx!.Quantity);
        Assert.Equal(55m, dripTx.Price);
    }

    /// <summary>
    /// AddShares rejects invalid transaction types
    /// </summary>
    [Fact]
    public async Task AddShares_InvalidType_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Invalid Type Test", "TestBroker", "Brokerage", 10000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "BAD",
            Name = "Bad Test",
            AssetType = 0,
            Quantity = 10m,
            AverageCostBasis = 100m,
            CurrentPrice = 100m,
            FundingSource = 2
        });
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        var addResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/add-shares", new
        {
            Quantity = 5m,
            PricePerShare = 100m,
            TransactionType = "SELL"
        });
        Assert.Equal(HttpStatusCode.BadRequest, addResp.StatusCode);
    }

    /// <summary>
    /// SellShares reduces holding qty, credits account cash with net proceeds, and records realized gain.
    /// </summary>
    [Fact]
    public async Task SellShares_PartialSale_CreditsCashAndRecalculatesHolding()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Sell Test", "TestBroker", "Brokerage", 10000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        // 20 shares @ $50 cost basis
        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "SELL",
            Name = "Sell Test Stock",
            AssetType = 0,
            Quantity = 20m,
            AverageCostBasis = 50m,
            CurrentPrice = 80m,
            FundingSource = 2
        });
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Cash before sale
        var beforeResp = await client.GetAsync($"/api/Accounts/{account.AccountId}");
        var before = await beforeResp.Content.ReadFromJsonAsync<AccountDetailDto>();
        var cashBefore = before!.CurrentBalance;

        // Sell 5 shares @ $80, $5 fee → gross $400, net $395, realized gain (80-50)*5 - 5 = $145
        var sellResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/sell-shares", new
        {
            Quantity = 5m,
            PricePerShare = 80m,
            Fee = 5m
        });
        Assert.Equal(HttpStatusCode.OK, sellResp.StatusCode);
        var updated = await sellResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        Assert.Equal(15m, updated!.Quantity);
        // Avg cost basis unchanged on partial sell (proportional reduction)
        Assert.InRange(updated.AverageCostBasis, 49.99m, 50.01m);

        // Cash credited by net proceeds
        var afterResp = await client.GetAsync($"/api/Accounts/{account.AccountId}");
        var after = await afterResp.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.Equal(cashBefore + 395m, after!.CurrentBalance);

        // Verify SELL transaction persisted with net proceeds as Amount and realized gain breakdown
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=SELL");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var sellTx = transactions!.FirstOrDefault(t => t.Symbol == "SELL");
        Assert.NotNull(sellTx);
        Assert.Equal(5m, sellTx!.Quantity);
        Assert.Equal(80m, sellTx.Price);
        Assert.Equal(5m, sellTx.Fee);
        // Amount must equal net proceeds (gross 400 - fee 5 = 395) so it matches the cash credit
        Assert.Equal(395m, sellTx.Amount);
    }

    /// <summary>
    /// SellShares blocks attempts to sell more shares than the holding has.
    /// </summary>
    [Fact]
    public async Task SellShares_OverQuantity_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Over Qty Test", "TestBroker", "Brokerage", 5000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "OVER",
            Name = "Over Test",
            AssetType = 0,
            Quantity = 10m,
            AverageCostBasis = 100m,
            CurrentPrice = 100m,
            FundingSource = 2
        });
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        var sellResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/sell-shares", new
        {
            Quantity = 11m,
            PricePerShare = 100m
        });
        Assert.Equal(HttpStatusCode.BadRequest, sellResp.StatusCode);
    }

    /// <summary>
    /// Selling the entire position deletes the holding row but preserves transaction history and
    /// any related PriceHistory rows by nulling their HoldingId FKs.
    /// Regression: real Postgres FK_PriceHistory_Holdings_HoldingId previously blocked the delete.
    /// </summary>
    [Fact]
    public async Task SellShares_FullSale_DeletesHoldingAndPreservesRelatedRows()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Full Sale Test", "TestBroker", "Brokerage", 1000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "FULL",
            Name = "Full Sale Stock",
            AssetType = 0,
            Quantity = 4m,
            AverageCostBasis = 25m,
            CurrentPrice = 30m,
            FundingSource = 2
        });
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Seed a PriceHistory row tied to this holding so the FK cleanup path is exercised.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PFMP_API.ApplicationDbContext>();
            db.PriceHistory.Add(new PFMP_API.Models.PriceHistory
            {
                HoldingId = holding!.HoldingId,
                Symbol = "FULL",
                Date = DateTime.UtcNow.Date.AddDays(-1),
                Open = 29m,
                High = 31m,
                Low = 28m,
                Close = 30m,
                Volume = 100,
            });
            await db.SaveChangesAsync();
        }

        var sellResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/sell-shares", new
        {
            Quantity = 4m,
            PricePerShare = 30m
        });
        Assert.Equal(HttpStatusCode.OK, sellResp.StatusCode);

        // Holding row should be gone
        var getResp = await client.GetAsync($"/api/Holdings/{holding.HoldingId}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);

        // SELL transaction should still exist (HoldingId nulled)
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=SELL");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var sellTx = transactions!.FirstOrDefault(t => t.Symbol == "FULL");
        Assert.NotNull(sellTx);
        Assert.Null(sellTx!.HoldingId);

        // PriceHistory rows should also survive with HoldingId=null
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PFMP_API.ApplicationDbContext>();
            var orphaned = db.PriceHistory.Where(p => p.Symbol == "FULL").ToList();
            Assert.NotEmpty(orphaned);
            Assert.All(orphaned, p => Assert.Null(p.HoldingId));
        }
    }

    /// <summary>
    /// RecordCashDividend creates a DIVIDEND transaction and credits cash without changing share quantity.
    /// </summary>
    [Fact]
    public async Task RecordCashDividend_CreditsCashAndLeavesSharesUnchanged()
    {
        var client = _factory.CreateClient();

        var userResp = await client.PostAsync("/api/admin/users/test?scenario=done", null);
        var user = await userResp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();

        var acctResp = await client.PostAsJsonAsync("/api/Accounts", new AccountCreateDto(
            user!.UserId, "Cash Div Test", "TestBroker", "Brokerage", 2000m));
        var account = await acctResp.Content.ReadFromJsonAsync<AccountResponseDto>();

        var holdingResp = await client.PostAsJsonAsync("/api/Holdings", new
        {
            AccountId = account!.AccountId,
            Symbol = "CDIV",
            Name = "Cash Div Stock",
            AssetType = 0,
            Quantity = 50m,
            AverageCostBasis = 40m,
            CurrentPrice = 45m,
            FundingSource = 2
        });
        var holding = await holdingResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        var beforeResp = await client.GetAsync($"/api/Accounts/{account.AccountId}");
        var before = await beforeResp.Content.ReadFromJsonAsync<AccountDetailDto>();
        var cashBefore = before!.CurrentBalance;

        var divResp = await client.PostAsJsonAsync($"/api/Holdings/{holding!.HoldingId}/dividend-cash", new
        {
            Amount = 37.50m,
            IsQualifiedDividend = true,
            Notes = "Q2 2026 cash dividend"
        });
        Assert.Equal(HttpStatusCode.OK, divResp.StatusCode);
        var updated = await divResp.Content.ReadFromJsonAsync<HoldingResponseDto>();

        // Quantity unchanged
        Assert.Equal(50m, updated!.Quantity);

        // Cash credited
        var afterResp = await client.GetAsync($"/api/Accounts/{account.AccountId}");
        var after = await afterResp.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.Equal(cashBefore + 37.50m, after!.CurrentBalance);

        // DIVIDEND transaction persisted
        var txResp = await client.GetAsync($"/api/Transactions?accountId={account.AccountId}&transactionType=DIVIDEND");
        var transactions = await txResp.Content.ReadFromJsonAsync<List<TransactionDto>>();
        var divTx = transactions!.FirstOrDefault(t => t.Symbol == "CDIV");
        Assert.NotNull(divTx);
        Assert.Equal(37.50m, divTx!.Amount);
    }
}
