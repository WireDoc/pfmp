using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PFMP_API.Models.Crypto;
using PFMP_API.Services.Crypto;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

/// <summary>
/// Wave 13 / Phase 1: Integration tests for /api/crypto endpoints. The Kraken adapter is replaced
/// with an in-process fake so tests don't hit the live exchange.
/// </summary>
public class CryptoControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public CryptoControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record CreateConnectionDto(string Provider, string? Nickname, string ApiKey, string ApiSecret);
    private record ConnectionDto(int ExchangeConnectionId, string Provider, string? Nickname, ExchangeConnectionStatus Status, DateTime? LastSyncAt, string? LastSyncError, string[] Scopes);
    private record HoldingDto(int CryptoHoldingId, int ExchangeConnectionId, string Provider, string Symbol, decimal Quantity, decimal MarketValueUsd, bool IsStaked);
    private record SyncDto(int HoldingsUpserted, int TransactionsInserted, int TransactionsSkipped, string? Error, DateTime? LastSyncAt);
    private record TaxLotDto(int CryptoTaxLotId, int ExchangeConnectionId, string Provider, string Symbol, DateTime AcquiredAt, decimal OriginalQuantity, decimal RemainingQuantity, decimal CostBasisUsdPerUnit, decimal RealizedShortTermGainUsd, decimal RealizedLongTermGainUsd, bool IsClosed, DateTime? ClosedAt, bool IsRewardLot);
    private record RealizedPnLDto(int? Year, decimal TotalProceedsUsd, decimal TotalCostBasisUsd, decimal TotalShortTermGainUsd, decimal TotalLongTermGainUsd, decimal TotalRealizedGainUsd, RealizedBySymbolDto[] BySymbol);
    private record RealizedBySymbolDto(string Symbol, decimal ProceedsUsd, decimal CostBasisUsd, decimal ShortTermGainUsd, decimal LongTermGainUsd, decimal TotalGainUsd);
    private record StakingSummaryDto(decimal TotalStakedValueUsd, decimal? WeightedApyPercent, decimal YtdRewardsUsd, int StakedAssetCount, StakingByAssetDto[] ByAsset);
    private record StakingByAssetDto(string Symbol, decimal Quantity, decimal MarketValueUsd, decimal? ApyPercent);

    private HttpClient CreateClientWithFakeAdapter(FakeExchangeAdapter fake) =>
        _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Remove ALL real adapter registrations (Kraken + Binance.US) and inject the fake one.
                var descriptors = services.Where(d => d.ServiceType == typeof(IExchangeAdapter)).ToList();
                foreach (var d in descriptors) services.Remove(d);
                services.AddScoped<IExchangeAdapter>(_ => fake);
            });
        }).CreateClient();

    private async Task<int> CreateUserAsync(HttpClient client)
    {
        var resp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var user = await resp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        Assert.NotNull(user);
        return user!.UserId;
    }

    [Fact]
    public async Task CreateConnection_PersistsAndRunsInitialSync()
    {
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = true, IsReadOnly = true, Scopes = new[] { "query_funds" } },
            Holdings = new[]
            {
                new ExchangeHoldingSnapshot { Symbol = "BTC", Quantity = 0.5m, IsStaked = false }
            },
            Transactions = new[]
            {
                new ExchangeTransactionRecord { ExchangeTxId = "tx-1", TransactionType = CryptoTransactionType.Buy, Symbol = "BTC", Quantity = 0.5m, ExecutedAt = DateTime.UtcNow.AddDays(-3) }
            }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);

        var resp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", "Main", "k-1234567890", "s-abcdefghij"));
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var created = await resp.Content.ReadFromJsonAsync<ConnectionDto>(TestJsonOptions.Default);
        Assert.NotNull(created);
        Assert.Equal("Kraken", created!.Provider);
        Assert.Equal(ExchangeConnectionStatus.Active, created.Status);

        var listResp = await client.GetAsync($"/api/crypto/connections?userId={userId}");
        var list = await listResp.Content.ReadFromJsonAsync<ConnectionDto[]>(TestJsonOptions.Default);
        Assert.NotNull(list);
        Assert.Single(list!);

        var holdingsResp = await client.GetAsync($"/api/crypto/holdings?userId={userId}");
        var holdings = await holdingsResp.Content.ReadFromJsonAsync<HoldingDto[]>(TestJsonOptions.Default);
        Assert.NotNull(holdings);
        Assert.Single(holdings!);
        Assert.Equal("BTC", holdings![0].Symbol);
        Assert.Equal(0.5m, holdings[0].Quantity);
    }

    [Fact]
    public async Task CreateConnection_RejectsTradingScopeKey()
    {
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = true, IsReadOnly = false, Scopes = new[] { "trade" } }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);

        var resp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", null, "k-1234567890", "s-abcdefghij"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("read-only", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateConnection_RejectsInvalidKey()
    {
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = false, IsReadOnly = false, ErrorMessage = "EAPI:Invalid key" }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);

        var resp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", null, "k-1234567890", "s-abcdefghij"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task SyncEndpoint_IsIdempotentAcrossRepeatedCalls()
    {
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = true, IsReadOnly = true, Scopes = new[] { "query_funds" } },
            Holdings = new[]
            {
                new ExchangeHoldingSnapshot { Symbol = "ETH", Quantity = 2m, IsStaked = false }
            },
            Transactions = new[]
            {
                new ExchangeTransactionRecord { ExchangeTxId = "tx-eth-1", TransactionType = CryptoTransactionType.Buy, Symbol = "ETH", Quantity = 2m, ExecutedAt = DateTime.UtcNow.AddDays(-1) }
            }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);

        var createResp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", "Idem", "k-key", "s-secret"));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<ConnectionDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        // First manual sync after the initial sync from create — should skip the existing tx.
        var sync1 = await client.PostAsync($"/api/crypto/connections/{created!.ExchangeConnectionId}/sync?userId={userId}", null);
        // Manual sync may be rate limited if the initial sync ran in the same hour; but the manual sync limiter
        // tracks separately, so the first call should succeed. The second one should hit 429.
        Assert.True(sync1.StatusCode == HttpStatusCode.OK, $"Expected 200, got {sync1.StatusCode}");
        var syncBody1 = await sync1.Content.ReadFromJsonAsync<SyncDto>(TestJsonOptions.Default);
        Assert.NotNull(syncBody1);
        Assert.Equal(0, syncBody1!.TransactionsInserted);
        Assert.Equal(1, syncBody1.TransactionsSkipped);

        var sync2 = await client.PostAsync($"/api/crypto/connections/{created.ExchangeConnectionId}/sync?userId={userId}", null);
        Assert.Equal(HttpStatusCode.TooManyRequests, sync2.StatusCode);
    }

    [Fact]
    public async Task DeleteConnection_RemovesAndReturnsNotFoundForUnknown()
    {
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = true, IsReadOnly = true, Scopes = new[] { "query_funds" } }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);

        var createResp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", "Del", "k-key", "s-secret"));
        var created = await createResp.Content.ReadFromJsonAsync<ConnectionDto>(TestJsonOptions.Default);
        Assert.NotNull(created);

        var del = await client.DeleteAsync($"/api/crypto/connections/{created!.ExchangeConnectionId}?userId={userId}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var del2 = await client.DeleteAsync($"/api/crypto/connections/{created.ExchangeConnectionId}?userId={userId}");
        Assert.Equal(HttpStatusCode.NotFound, del2.StatusCode);
    }

    [Fact]
    public async Task TaxLotsAndRealizedPnL_ReturnFifoResults()
    {
        var t0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = true, IsReadOnly = true, Scopes = new[] { "query_funds" } },
            Holdings = new[]
            {
                new ExchangeHoldingSnapshot { Symbol = "BTC", Quantity = 0.5m, IsStaked = false }
            },
            Transactions = new[]
            {
                new ExchangeTransactionRecord { ExchangeTxId = "tx-buy", TransactionType = CryptoTransactionType.Buy, Symbol = "BTC", Quantity = 1m, PriceUsd = 20000m, ExecutedAt = t0 },
                new ExchangeTransactionRecord { ExchangeTxId = "tx-sell", TransactionType = CryptoTransactionType.Sell, Symbol = "BTC", Quantity = -0.5m, PriceUsd = 30000m, ExecutedAt = t0.AddDays(60) }
            }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);
        var createResp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", "Lots", "k-key", "s-secret"));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var lotsResp = await client.GetAsync($"/api/crypto/tax-lots?userId={userId}");
        Assert.Equal(HttpStatusCode.OK, lotsResp.StatusCode);
        var lots = await lotsResp.Content.ReadFromJsonAsync<TaxLotDto[]>(TestJsonOptions.Default);
        Assert.NotNull(lots);
        Assert.Single(lots!);
        Assert.Equal(0.5m, lots![0].RemainingQuantity);
        Assert.Equal(5000m, lots[0].RealizedShortTermGainUsd);

        var pnlResp = await client.GetAsync($"/api/crypto/realized-pnl?userId={userId}&year=2026");
        Assert.Equal(HttpStatusCode.OK, pnlResp.StatusCode);
        var pnl = await pnlResp.Content.ReadFromJsonAsync<RealizedPnLDto>(TestJsonOptions.Default);
        Assert.NotNull(pnl);
        Assert.Equal(5000m, pnl!.TotalShortTermGainUsd);
        Assert.Equal(5000m, pnl.TotalRealizedGainUsd);
        Assert.Single(pnl.BySymbol);
        Assert.Equal("BTC", pnl.BySymbol[0].Symbol);
    }

    [Fact]
    public async Task StakingSummary_ReturnsTotalsForLinkedConnection()
    {
        var fake = new FakeExchangeAdapter
        {
            ValidationResult = new ExchangeKeyValidationResult { IsValid = true, IsReadOnly = true, Scopes = new[] { "query_funds" } },
            Holdings = new[]
            {
                new ExchangeHoldingSnapshot { Symbol = "ETH", Quantity = 5m, IsStaked = true, StakingApyPercent = 4m }
            },
            Transactions = new[]
            {
                new ExchangeTransactionRecord { ExchangeTxId = "rwd-1", TransactionType = CryptoTransactionType.StakingReward, Symbol = "ETH", Quantity = 0.1m, PriceUsd = 2000m, ExecutedAt = new DateTime(DateTime.UtcNow.Year, 1, 15, 0, 0, 0, DateTimeKind.Utc) }
            }
        };
        var client = CreateClientWithFakeAdapter(fake);
        var userId = await CreateUserAsync(client);
        var createResp = await client.PostAsJsonAsync($"/api/crypto/connections?userId={userId}",
            new CreateConnectionDto("Kraken", "Stake", "k-key", "s-secret"));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var resp = await client.GetAsync($"/api/crypto/staking-summary?userId={userId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var summary = await resp.Content.ReadFromJsonAsync<StakingSummaryDto>(TestJsonOptions.Default);
        Assert.NotNull(summary);
        Assert.Equal(1, summary!.StakedAssetCount);
        Assert.Equal(4m, summary.WeightedApyPercent);
        Assert.Equal(200m, summary.YtdRewardsUsd);
        Assert.True(summary.TotalStakedValueUsd > 0);
    }

    /// <summary>In-process fake adapter that returns canned data.</summary>
    private class FakeExchangeAdapter : IExchangeAdapter
    {
        public string Provider => "Kraken";
        public ExchangeKeyValidationResult ValidationResult { get; set; } = new() { IsValid = true, IsReadOnly = true };
        public IEnumerable<ExchangeHoldingSnapshot> Holdings { get; set; } = Array.Empty<ExchangeHoldingSnapshot>();
        public IEnumerable<ExchangeTransactionRecord> Transactions { get; set; } = Array.Empty<ExchangeTransactionRecord>();

        public Task<ExchangeKeyValidationResult> ValidateKeysAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default)
            => Task.FromResult(ValidationResult);
        public Task<IReadOnlyList<ExchangeHoldingSnapshot>> GetHoldingsAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<ExchangeHoldingSnapshot>>(Holdings.ToList());
        public Task<IReadOnlyList<ExchangeTransactionRecord>> GetTransactionsAsync(string apiKey, string apiSecret, DateTime sinceUtc, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<ExchangeTransactionRecord>>(Transactions.ToList());
    }
}
