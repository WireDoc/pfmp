using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Services.NetWorth;

/// <summary>
/// Wave 26 — the ONE net-worth calculator (cleanup queue item 3).
///
/// Before this service there were three near-copies with drift: the dashboard
/// summary (had the Wave-26 crypto/529/metals investment types but no
/// account-IsActive filter), the NetWorthSnapshotJob (stale investment type
/// list, no linked-mortgage dedup), and the financial-profile snapshot
/// (no TSP, no crypto, no holdings pricing — ~$161k off the dashboard).
/// All three now consume this breakdown.
/// </summary>
public record NetWorthBreakdown(
    decimal Cash,
    decimal Investments,
    decimal Tsp,
    decimal PropertyValue,
    decimal Crypto,
    decimal StandaloneLiabilities,
    decimal PropertyMortgageDebt,
    decimal UnlinkedPropertyMortgageDebt)
{
    public decimal TotalAssets => Cash + Investments + Tsp + PropertyValue + Crypto;

    /// <summary>Mortgages already linked to a LiabilityAccount are inside
    /// <see cref="StandaloneLiabilities"/> — only unlinked ones are added here,
    /// so nothing is double-counted.</summary>
    public decimal TotalLiabilities => StandaloneLiabilities + UnlinkedPropertyMortgageDebt;

    public decimal NetWorth => TotalAssets - TotalLiabilities;

    /// <summary>Display equity: full value minus ALL mortgage debt regardless
    /// of where the mortgage row lives.</summary>
    public decimal PropertyEquity => PropertyValue - PropertyMortgageDebt;
}

public interface INetWorthCalculationService
{
    Task<NetWorthBreakdown> ComputeAsync(int userId, CancellationToken ct = default);
}

public class NetWorthCalculationService : INetWorthCalculationService
{
    // Every type the onboarding investments section can create, plus HSA.
    // Mirrors FinancialProfileService.InvestmentSectionAccountTypes — keep in sync.
    private static readonly AccountType[] InvestmentAccountTypes =
    {
        AccountType.Brokerage,
        AccountType.RetirementAccountIRA,
        AccountType.RetirementAccount401k,
        AccountType.RetirementAccountRoth,
        AccountType.HSA,
        AccountType.CryptocurrencyExchange,
        AccountType.Education529,
        AccountType.PreciousMetals,
    };

    private readonly ApplicationDbContext _db;

    public NetWorthCalculationService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<NetWorthBreakdown> ComputeAsync(int userId, CancellationToken ct = default)
    {
        var cash = await _db.CashAccounts
            .Where(c => c.UserId == userId)
            .SumAsync(c => (decimal?)c.Balance, ct) ?? 0m;

        // CurrentBalance (uninvested cash) + holdings at their latest price.
        var investmentAccounts = await _db.Accounts
            .Include(a => a.Holdings)
            .Where(a => a.UserId == userId && a.IsActive && InvestmentAccountTypes.Contains(a.AccountType))
            .ToListAsync(ct);
        var investments = investmentAccounts
            .Sum(a => a.CurrentBalance + (a.Holdings?.Sum(h => h.Quantity * h.CurrentPrice) ?? 0m));

        var tsp = await ComputeTspAsync(userId, ct);

        var properties = await _db.Properties
            .Where(p => p.UserId == userId)
            .Select(p => new { p.EstimatedValue, p.MortgageBalance, p.LinkedMortgageLiabilityId })
            .ToListAsync(ct);
        var propertyValue = properties.Sum(p => p.EstimatedValue);
        var mortgageDebt = properties.Sum(p => p.MortgageBalance ?? 0m);
        var unlinkedMortgageDebt = properties
            .Where(p => !p.LinkedMortgageLiabilityId.HasValue)
            .Sum(p => p.MortgageBalance ?? 0m);

        var liabilities = await _db.LiabilityAccounts
            .Where(l => l.UserId == userId)
            .SumAsync(l => (decimal?)l.CurrentBalance, ct) ?? 0m;

        var crypto = await _db.CryptoHoldings
            .Where(h => _db.ExchangeConnections
                .Any(c => c.ExchangeConnectionId == h.ExchangeConnectionId && c.UserId == userId))
            .SumAsync(h => (decimal?)h.MarketValueUsd, ct) ?? 0m;

        return new NetWorthBreakdown(
            Cash: cash,
            Investments: investments,
            Tsp: tsp,
            PropertyValue: propertyValue,
            Crypto: crypto,
            StandaloneLiabilities: liabilities,
            PropertyMortgageDebt: mortgageDebt,
            UnlinkedPropertyMortgageDebt: unlinkedMortgageDebt);
    }

    private async Task<decimal> ComputeTspAsync(int userId, CancellationToken ct)
    {
        var positions = await _db.TspLifecyclePositions
            .Where(p => p.UserId == userId && p.Units > 0)
            .Select(p => new { p.FundCode, p.Units })
            .ToListAsync(ct);
        if (positions.Count == 0) return 0m;

        var cachedPrices = await _db.TSPFundPrices
            .OrderByDescending(p => p.PriceDate)
            .FirstOrDefaultAsync(ct);
        if (cachedPrices == null) return 0m;

        decimal total = 0m;
        foreach (var position in positions)
        {
            var price = Jobs.NetWorthSnapshotJob.GetCachedTspFundPrice(cachedPrices, position.FundCode);
            if (price.HasValue)
            {
                total += position.Units * price.Value;
            }
        }
        return total;
    }
}
