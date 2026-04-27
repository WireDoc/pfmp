using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Models;
using PFMP_API.Models.Crypto;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services.Crypto;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests.Services;

/// <summary>
/// Wave 13 Phase 4: Connection health, single-asset concentration,
/// and stablecoin de-peg alert generation.
/// </summary>
public class CryptoAlertServiceTests
{
    private static (ApplicationDbContext Ctx, User User) Seed()
    {
        var ctx = TestDbContextFactory.Create();
        var user = new User { Email = "alerts@t.io", FirstName = "A", LastName = "U" };
        ctx.Users.Add(user);
        ctx.SaveChanges();
        return (ctx, user);
    }

    private static ExchangeConnection AddConn(ApplicationDbContext ctx, int userId, ExchangeConnectionStatus status, string? lastError = null, string nickname = "main")
    {
        var conn = new ExchangeConnection
        {
            UserId = userId,
            Provider = "Kraken",
            Nickname = nickname,
            EncryptedApiKey = "x",
            EncryptedApiSecret = "y",
            Status = status,
            LastSyncError = lastError,
        };
        ctx.ExchangeConnections.Add(conn);
        ctx.SaveChanges();
        return conn;
    }

    private static void AddHolding(ApplicationDbContext ctx, int connId, string sym, decimal qty, decimal valueUsd, bool isStaked = false)
    {
        ctx.CryptoHoldings.Add(new CryptoHolding
        {
            ExchangeConnectionId = connId,
            Symbol = sym,
            Quantity = qty,
            MarketValueUsd = valueUsd,
            IsStaked = isStaked,
        });
        ctx.SaveChanges();
    }

    [Fact]
    public async Task NoConnections_ProducesNoAlerts()
    {
        var (ctx, user) = Seed();
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        Assert.Empty(alerts);
        Assert.Empty(ctx.Alerts);
    }

    [Fact]
    public async Task ExpiredConnection_ProducesSecurityAlert()
    {
        var (ctx, user) = Seed();
        AddConn(ctx, user.UserId, ExchangeConnectionStatus.Expired);
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        var alert = Assert.Single(alerts);
        Assert.Equal(AlertCategory.Security, alert.Category);
        Assert.Equal(AlertSeverity.High, alert.Severity);
        Assert.Contains("expired", alert.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CryptoConnectionUnhealthy", alert.Metadata);
    }

    [Fact]
    public async Task ErrorConnection_SurfacesLastSyncError()
    {
        var (ctx, user) = Seed();
        AddConn(ctx, user.UserId, ExchangeConnectionStatus.Error, lastError: "401 Unauthorized");
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        var alert = Assert.Single(alerts);
        Assert.Equal(AlertSeverity.Medium, alert.Severity);
        Assert.Contains("401 Unauthorized", alert.Message);
    }

    [Fact]
    public async Task SingleAssetOver25PctOfAssets_FiresConcentrationAlert()
    {
        var (ctx, user) = Seed();
        var conn = AddConn(ctx, user.UserId, ExchangeConnectionStatus.Active);
        // BTC = $50k; total tracked assets = $50k crypto only, so 100% concentration.
        AddHolding(ctx, conn.ExchangeConnectionId, "BTC", qty: 1m, valueUsd: 50_000m);
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        var concentration = Assert.Single(alerts.Where(a => a.Metadata != null && a.Metadata.Contains("CryptoConcentration")));
        Assert.Equal(AlertSeverity.High, concentration.Severity);
        Assert.Contains("BTC", concentration.Title);
    }

    [Fact]
    public async Task DiversifiedPortfolio_NoConcentrationAlert()
    {
        var (ctx, user) = Seed();
        var conn = AddConn(ctx, user.UserId, ExchangeConnectionStatus.Active);
        // BTC is only 10% of total assets ($10k of $100k).
        AddHolding(ctx, conn.ExchangeConnectionId, "BTC", qty: 1m, valueUsd: 10_000m);
        ctx.CashAccounts.Add(new CashAccount
        {
            UserId = user.UserId,
            Nickname = "Big checking",
            AccountType = "Checking",
            Balance = 90_000m,
        });
        ctx.SaveChanges();
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        Assert.DoesNotContain(alerts, a => a.Metadata != null && a.Metadata.Contains("CryptoConcentration"));
    }

    [Fact]
    public async Task StablecoinTradingOffPeg_FiresDepegAlert()
    {
        var (ctx, user) = Seed();
        var conn = AddConn(ctx, user.UserId, ExchangeConnectionStatus.Active);
        // 1000 USDC valued at $920 -> implied $0.92 -> 8% deviation.
        AddHolding(ctx, conn.ExchangeConnectionId, "USDC", qty: 1000m, valueUsd: 920m);
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        var depeg = Assert.Single(alerts.Where(a => a.Metadata != null && a.Metadata.Contains("CryptoStablecoinDepeg")));
        Assert.Equal(AlertSeverity.High, depeg.Severity);
        Assert.Contains("USDC", depeg.Title);
    }

    [Fact]
    public async Task StablecoinNearPeg_DoesNotFireDepegAlert()
    {
        var (ctx, user) = Seed();
        var conn = AddConn(ctx, user.UserId, ExchangeConnectionStatus.Active);
        // 1000 USDC valued at $999 -> implied $0.999 -> 0.1% deviation.
        AddHolding(ctx, conn.ExchangeConnectionId, "USDC", qty: 1000m, valueUsd: 999m);
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var alerts = await svc.GenerateCryptoAlertsAsync(user.UserId);

        Assert.DoesNotContain(alerts, a => a.Metadata != null && a.Metadata.Contains("CryptoStablecoinDepeg"));
    }

    [Fact]
    public async Task SecondRunWithin24h_DoesNotDuplicateAlerts()
    {
        var (ctx, user) = Seed();
        AddConn(ctx, user.UserId, ExchangeConnectionStatus.Expired);
        var svc = new CryptoAlertService(ctx, NullLogger<CryptoAlertService>.Instance);

        var first = await svc.GenerateCryptoAlertsAsync(user.UserId);
        var second = await svc.GenerateCryptoAlertsAsync(user.UserId);

        Assert.Single(first);
        Assert.Empty(second);
        Assert.Equal(1, ctx.Alerts.Count(a => !a.IsDismissed));
    }
}
