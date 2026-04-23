using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Services.Crypto;
using Xunit;

namespace PFMP_API.Tests.Services;

/// <summary>
/// Wave 13: Unit tests for KrakenExchangeAdapter. Uses a stub HTTP handler so no live calls are made.
/// </summary>
public class KrakenExchangeAdapterTests
{
    private static IHttpClientFactory CreateFactory(StubHandler handler)
    {
        var client = new HttpClient(handler);
        var factory = new SingleClientFactory(client);
        return factory;
    }

    [Fact]
    public async Task GetHoldings_ParsesAndNormalizesAssetCodes()
    {
        var json = "{\"error\":[],\"result\":{\"XXBT\":\"0.50000000\",\"ETH.S\":\"3.0\",\"ZUSD\":\"125.42\"}}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new KrakenExchangeAdapter(CreateFactory(handler), NullLogger<KrakenExchangeAdapter>.Instance);

        var holdings = await adapter.GetHoldingsAsync("KEY", Convert.ToBase64String(new byte[] { 1, 2, 3 }));

        Assert.Equal(3, holdings.Count);
        var btc = holdings.Single(h => h.Symbol == "BTC");
        Assert.False(btc.IsStaked);
        Assert.Equal(0.5m, btc.Quantity);

        var eth = holdings.Single(h => h.Symbol == "ETH");
        Assert.True(eth.IsStaked);
        Assert.Equal(3m, eth.Quantity);

        var usd = holdings.Single(h => h.Symbol == "USD");
        Assert.Equal(125.42m, usd.Quantity);
    }

    [Fact]
    public async Task GetHoldings_ThrowsWhenKrakenReturnsErrors()
    {
        var json = "{\"error\":[\"EAPI:Invalid key\"],\"result\":null}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new KrakenExchangeAdapter(CreateFactory(handler), NullLogger<KrakenExchangeAdapter>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            adapter.GetHoldingsAsync("KEY", Convert.ToBase64String(new byte[] { 1, 2, 3 })));
    }

    [Fact]
    public async Task GetTransactions_MapsLedgerEntriesAndStakingRewards()
    {
        var json = "{\"error\":[],\"result\":{\"ledger\":{" +
                   "\"L1\":{\"refid\":\"X\",\"time\":1700000000,\"type\":\"deposit\",\"asset\":\"XXBT\",\"amount\":\"0.1\",\"fee\":\"0\"}," +
                   "\"L2\":{\"refid\":\"Y\",\"time\":1700001000,\"type\":\"staking\",\"asset\":\"ETH.S\",\"amount\":\"0.05\",\"fee\":\"0\"}," +
                   "\"L3\":{\"refid\":\"Z\",\"time\":1700002000,\"type\":\"trade\",\"asset\":\"XXBT\",\"amount\":\"-0.01\",\"fee\":\"0.0001\"}" +
                   "},\"count\":3}}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new KrakenExchangeAdapter(CreateFactory(handler), NullLogger<KrakenExchangeAdapter>.Instance);

        var records = await adapter.GetTransactionsAsync("KEY", Convert.ToBase64String(new byte[] { 1, 2, 3 }), DateTime.UtcNow.AddYears(-1));

        Assert.Equal(3, records.Count);
        var deposit = records.Single(r => r.ExchangeTxId == "L1");
        Assert.Equal(PFMP_API.Models.Crypto.CryptoTransactionType.Deposit, deposit.TransactionType);
        Assert.Equal("BTC", deposit.Symbol);
        Assert.Equal(0.1m, deposit.Quantity);

        var staking = records.Single(r => r.ExchangeTxId == "L2");
        Assert.Equal(PFMP_API.Models.Crypto.CryptoTransactionType.StakingReward, staking.TransactionType);
        Assert.Equal("ETH", staking.Symbol);

        var trade = records.Single(r => r.ExchangeTxId == "L3");
        // Mapped initially as Buy; sign-based correction (Buy with negative qty -> Sell) happens at sync layer, not adapter.
        Assert.Equal(PFMP_API.Models.Crypto.CryptoTransactionType.Buy, trade.TransactionType);
        Assert.Equal(-0.01m, trade.Quantity);
        Assert.Equal(0.0001m, trade.FeeUsd);
    }

    [Fact]
    public async Task ValidateKeys_ReturnsReadOnlyTrueForSuccessfulBalanceCall()
    {
        var json = "{\"error\":[],\"result\":{}}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new KrakenExchangeAdapter(CreateFactory(handler), NullLogger<KrakenExchangeAdapter>.Instance);

        var result = await adapter.ValidateKeysAsync("KEY", Convert.ToBase64String(new byte[] { 1, 2, 3 }));

        Assert.True(result.IsValid);
        Assert.True(result.IsReadOnly);
        Assert.Contains("query_funds", result.Scopes);
    }

    [Fact]
    public async Task ValidateKeys_ReturnsInvalidWhenKrakenReportsError()
    {
        var json = "{\"error\":[\"EAPI:Invalid key\"],\"result\":null}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new KrakenExchangeAdapter(CreateFactory(handler), NullLogger<KrakenExchangeAdapter>.Instance);

        var result = await adapter.ValidateKeysAsync("KEY", Convert.ToBase64String(new byte[] { 1, 2, 3 }));

        Assert.False(result.IsValid);
        Assert.Contains("Invalid key", result.ErrorMessage);
    }

    private static HttpResponseMessage CreateOk(string json) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(json, Encoding.UTF8, "application/json")
    };

    private class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;
        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) => _responder = responder;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_responder(request));
    }

    private class SingleClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;
        public SingleClientFactory(HttpClient client) => _client = client;
        public HttpClient CreateClient(string name) => _client;
    }
}
