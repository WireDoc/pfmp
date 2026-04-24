using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Services.Crypto;
using Xunit;

namespace PFMP_API.Tests.Services;

/// <summary>
/// Wave 13 / Phase 2: Unit tests for BinanceUsExchangeAdapter. Stub HTTP handler so no live calls are made.
/// </summary>
public class BinanceUsExchangeAdapterTests
{
    private const string Secret = "testsecret";

    private static IHttpClientFactory CreateFactory(StubHandler handler)
    {
        var client = new HttpClient(handler);
        return new SingleClientFactory(client);
    }

    [Fact]
    public async Task GetHoldings_FiltersZeroBalancesAndNormalizesStablecoins()
    {
        var json = "{\"balances\":[" +
                   "{\"asset\":\"BTC\",\"free\":\"0.5\",\"locked\":\"0\"}," +
                   "{\"asset\":\"ETH\",\"free\":\"0\",\"locked\":\"2.0\"}," +
                   "{\"asset\":\"USDC\",\"free\":\"100.00\",\"locked\":\"0\"}," +
                   "{\"asset\":\"DOGE\",\"free\":\"0\",\"locked\":\"0\"}" +
                   "]}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new BinanceUsExchangeAdapter(CreateFactory(handler), NullLogger<BinanceUsExchangeAdapter>.Instance);

        var holdings = await adapter.GetHoldingsAsync("KEY", Secret);

        Assert.Equal(3, holdings.Count);
        var btc = holdings.Single(h => h.Symbol == "BTC");
        Assert.False(btc.IsStaked);
        Assert.Equal(0.5m, btc.Quantity);

        var eth = holdings.Single(h => h.Symbol == "ETH");
        Assert.True(eth.IsStaked);
        Assert.Equal(2.0m, eth.Quantity);

        // USDC normalized to USD
        var usd = holdings.Single(h => h.Symbol == "USD");
        Assert.Equal(100.00m, usd.Quantity);
    }

    [Fact]
    public async Task GetHoldings_ThrowsWhenBinanceReturnsHttpError()
    {
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            Content = new StringContent("{\"code\":-2014,\"msg\":\"API-key format invalid.\"}", Encoding.UTF8, "application/json")
        });
        var adapter = new BinanceUsExchangeAdapter(CreateFactory(handler), NullLogger<BinanceUsExchangeAdapter>.Instance);

        await Assert.ThrowsAnyAsync<Exception>(() => adapter.GetHoldingsAsync("KEY", Secret));
    }

    [Fact]
    public async Task ValidateKeys_RejectsKeyWithSpotTradingEnabled()
    {
        var json = "{\"enableReading\":true,\"enableSpotAndMarginTrading\":true,\"enableMargin\":false," +
                   "\"enableFutures\":false,\"enableWithdrawals\":false,\"enableInternalTransfer\":false}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new BinanceUsExchangeAdapter(CreateFactory(handler), NullLogger<BinanceUsExchangeAdapter>.Instance);

        var result = await adapter.ValidateKeysAsync("KEY", Secret);

        Assert.True(result.IsValid);
        Assert.False(result.IsReadOnly);
        Assert.Contains("spot_trading", result.Scopes);
    }

    [Fact]
    public async Task ValidateKeys_AcceptsReadOnlyKey()
    {
        var json = "{\"enableReading\":true,\"enableSpotAndMarginTrading\":false,\"enableMargin\":false," +
                   "\"enableFutures\":false,\"enableWithdrawals\":false,\"enableInternalTransfer\":false}";
        var handler = new StubHandler(_ => CreateOk(json));
        var adapter = new BinanceUsExchangeAdapter(CreateFactory(handler), NullLogger<BinanceUsExchangeAdapter>.Instance);

        var result = await adapter.ValidateKeysAsync("KEY", Secret);

        Assert.True(result.IsValid);
        Assert.True(result.IsReadOnly);
        Assert.Contains("reading", result.Scopes);
        Assert.DoesNotContain("spot_trading", result.Scopes);
    }

    [Fact]
    public async Task GetTransactions_MapsDepositsWithdrawalsAndTrades()
    {
        // Route requests by path: /sapi/v1/capital/deposit/hisrec, /sapi/v1/capital/withdraw/history,
        // /api/v3/account (used internally to enumerate trade pairs), /api/v3/myTrades.
        var handler = new StubHandler(req =>
        {
            var path = req.RequestUri!.AbsolutePath;
            if (path == "/sapi/v1/capital/deposit/hisrec")
            {
                var json = "[{\"txId\":\"DEP1\",\"coin\":\"BTC\",\"amount\":\"0.10\",\"insertTime\":1700000000000,\"status\":1}]";
                return CreateOk(json);
            }
            if (path == "/sapi/v1/capital/withdraw/history")
            {
                var json = "[{\"id\":\"WD1\",\"coin\":\"BTC\",\"amount\":\"0.05\",\"transactionFee\":\"0.0001\"," +
                           "\"applyTime\":\"2025-06-01 12:34:56\",\"status\":6}]";
                return CreateOk(json);
            }
            if (path == "/api/v3/account")
            {
                var json = "{\"balances\":[{\"asset\":\"BTC\",\"free\":\"0.5\",\"locked\":\"0\"}]}";
                return CreateOk(json);
            }
            if (path == "/api/v3/myTrades")
            {
                var json = "[{\"id\":42,\"symbol\":\"BTCUSD\",\"price\":\"60000.00\",\"qty\":\"0.01\"," +
                           "\"commission\":\"0.5\",\"commissionAsset\":\"USD\",\"time\":1700001000000,\"isBuyer\":true}]";
                return CreateOk(json);
            }
            return new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("not found") };
        });

        var adapter = new BinanceUsExchangeAdapter(CreateFactory(handler), NullLogger<BinanceUsExchangeAdapter>.Instance);
        var records = await adapter.GetTransactionsAsync("KEY", Secret, DateTime.UtcNow.AddYears(-1));

        Assert.Equal(3, records.Count);

        var deposit = records.Single(r => r.ExchangeTxId == "dep:DEP1");
        Assert.Equal(PFMP_API.Models.Crypto.CryptoTransactionType.Deposit, deposit.TransactionType);
        Assert.Equal("BTC", deposit.Symbol);
        Assert.Equal(0.10m, deposit.Quantity);

        var withdrawal = records.Single(r => r.ExchangeTxId == "wdr:WD1");
        Assert.Equal(PFMP_API.Models.Crypto.CryptoTransactionType.Withdrawal, withdrawal.TransactionType);
        Assert.Equal(-0.05m, withdrawal.Quantity);
        Assert.Equal(0.0001m, withdrawal.FeeUsd);

        var trade = records.Single(r => r.ExchangeTxId == "trd:BTCUSD:42");
        Assert.Equal(PFMP_API.Models.Crypto.CryptoTransactionType.Buy, trade.TransactionType);
        Assert.Equal(0.01m, trade.Quantity);
        Assert.Equal(60000.00m, trade.PriceUsd);
        Assert.Equal(0.5m, trade.FeeUsd);
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
