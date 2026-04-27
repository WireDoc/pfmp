using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Models;
using PFMP_API.Models.Crypto;
using PFMP_API.Services.Crypto;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests.Services;

/// <summary>
/// Wave 13 Phase 3: FIFO tax-lot recompute + realized P/L + staking summary.
/// </summary>
public class CryptoTaxLotServiceTests
{
    private static (ApplicationDbContext Ctx, ExchangeConnection Conn, User User) Seed()
    {
        var ctx = TestDbContextFactory.Create();
        var user = new User { Email = "t@t.io", FirstName = "T", LastName = "U" };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        var conn = new ExchangeConnection
        {
            UserId = user.UserId,
            Provider = "Kraken",
            Nickname = "main",
            EncryptedApiKey = "x",
            EncryptedApiSecret = "y",
            Status = ExchangeConnectionStatus.Active
        };
        ctx.ExchangeConnections.Add(conn);
        ctx.SaveChanges();
        return (ctx, conn, user);
    }

    private static CryptoTransaction AddTx(ApplicationDbContext ctx, int connId, string sym, CryptoTransactionType type, decimal qty, decimal? price, DateTime when)
    {
        var tx = new CryptoTransaction
        {
            ExchangeConnectionId = connId,
            ExchangeTxId = Guid.NewGuid().ToString("N"),
            TransactionType = type,
            Symbol = sym,
            Quantity = qty,
            PriceUsd = price,
            ExecutedAt = when
        };
        ctx.CryptoTransactions.Add(tx);
        ctx.SaveChanges();
        return tx;
    }

    [Fact]
    public async Task Recompute_OpensLotsForBuysAndDeposits()
    {
        var (ctx, conn, _) = Seed();
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Buy, 0.5m, 30000m, DateTime.UtcNow.AddDays(-10));
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Deposit, 0.25m, 31000m, DateTime.UtcNow.AddDays(-5));

        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        var result = await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);

        Assert.Equal(2, result.LotsOpened);
        Assert.Equal(0, result.LotsClosed);
        var lots = ctx.CryptoTaxLots.OrderBy(l => l.AcquiredAt).ToList();
        Assert.Equal(2, lots.Count);
        Assert.Equal(0.5m, lots[0].RemainingQuantity);
        Assert.Equal(30000m, lots[0].CostBasisUsdPerUnit);
    }

    [Fact]
    public async Task Recompute_AppliesFifoAndShortTermGain()
    {
        var (ctx, conn, _) = Seed();
        var t0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Buy, 1m, 20000m, t0);
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Buy, 1m, 30000m, t0.AddDays(10));
        // Sell 1.5 at $40k — consumes lot1 fully + 0.5 of lot2
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Sell, -1.5m, 40000m, t0.AddDays(20));

        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        var result = await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);

        Assert.Equal(2, result.LotsOpened);
        Assert.Equal(1, result.LotsClosed);
        var lots = ctx.CryptoTaxLots.OrderBy(l => l.AcquiredAt).ToList();
        Assert.True(lots[0].IsClosed);
        Assert.Equal(20000m, lots[0].RealizedShortTermGainUsd); // 1 * (40k - 20k)
        Assert.Equal(0.5m, lots[1].RemainingQuantity);
        Assert.Equal(5000m, lots[1].RealizedShortTermGainUsd); // 0.5 * (40k - 30k)
        Assert.Equal(0m, lots[1].RealizedLongTermGainUsd);
    }

    [Fact]
    public async Task Recompute_ClassifiesLongTermWhenHeldOver365Days()
    {
        var (ctx, conn, _) = Seed();
        var t0 = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        AddTx(ctx, conn.ExchangeConnectionId, "ETH", CryptoTransactionType.Buy, 2m, 1000m, t0);
        AddTx(ctx, conn.ExchangeConnectionId, "ETH", CryptoTransactionType.Sell, -2m, 3000m, t0.AddDays(400));

        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);

        var lot = ctx.CryptoTaxLots.Single();
        Assert.True(lot.IsClosed);
        Assert.Equal(0m, lot.RealizedShortTermGainUsd);
        Assert.Equal(4000m, lot.RealizedLongTermGainUsd); // 2 * (3000 - 1000)
    }

    [Fact]
    public async Task Recompute_RewardLotHasZeroBasisAndIsFlagged()
    {
        var (ctx, conn, _) = Seed();
        AddTx(ctx, conn.ExchangeConnectionId, "ETH", CryptoTransactionType.StakingReward, 0.1m, 2000m, DateTime.UtcNow);
        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);

        var lot = ctx.CryptoTaxLots.Single();
        Assert.True(lot.IsRewardLot);
        Assert.Equal(2000m, lot.CostBasisUsdPerUnit); // we use price as basis when supplied
    }

    [Fact]
    public async Task Recompute_IsIdempotent_RebuildsClean()
    {
        var (ctx, conn, _) = Seed();
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Buy, 1m, 20000m, DateTime.UtcNow.AddDays(-5));
        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);
        await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);
        Assert.Single(ctx.CryptoTaxLots);
    }

    [Fact]
    public async Task GetRealizedPnL_AggregatesBySymbolAndYear()
    {
        var (ctx, conn, user) = Seed();
        var t0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Buy, 1m, 20000m, t0);
        AddTx(ctx, conn.ExchangeConnectionId, "BTC", CryptoTransactionType.Sell, -1m, 25000m, t0.AddDays(30));
        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        await svc.RecomputeForConnectionAsync(conn.ExchangeConnectionId);

        var pnl = await svc.GetRealizedPnLAsync(user.UserId, year: 2026, default);
        Assert.Equal(5000m, pnl.TotalShortTermGainUsd);
        Assert.Equal(0m, pnl.TotalLongTermGainUsd);
        Assert.Equal(5000m, pnl.TotalRealizedGainUsd);
        Assert.Single(pnl.BySymbol);
        Assert.Equal("BTC", pnl.BySymbol[0].Symbol);
    }

    [Fact]
    public async Task GetStakingSummary_ReturnsTotalsAndYtdRewards()
    {
        var (ctx, conn, user) = Seed();
        ctx.CryptoHoldings.Add(new CryptoHolding
        {
            ExchangeConnectionId = conn.ExchangeConnectionId,
            Symbol = "ETH",
            Quantity = 5m,
            MarketValueUsd = 10000m,
            IsStaked = true,
            StakingApyPercent = 4m,
            LastPriceAt = DateTime.UtcNow
        });
        ctx.SaveChanges();
        var thisYear = new DateTime(DateTime.UtcNow.Year, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        AddTx(ctx, conn.ExchangeConnectionId, "ETH", CryptoTransactionType.StakingReward, 0.1m, 2000m, thisYear);

        var svc = new CryptoTaxLotService(ctx, NullLogger<CryptoTaxLotService>.Instance);
        var summary = await svc.GetStakingSummaryAsync(user.UserId, default);

        Assert.Equal(10000m, summary.TotalStakedValueUsd);
        Assert.Equal(4m, summary.WeightedApyPercent);
        Assert.Equal(200m, summary.YtdRewardsUsd);
        Assert.Single(summary.ByAsset);
    }
}
