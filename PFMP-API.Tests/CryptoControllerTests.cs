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

    private HttpClient CreateClientWithFakeAdapter(FakeExchangeAdapter fake) =>
        _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Remove the real Kraken adapter registration and inject the fake one.
                var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IExchangeAdapter));
                if (descriptor is not null) services.Remove(descriptor);
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
