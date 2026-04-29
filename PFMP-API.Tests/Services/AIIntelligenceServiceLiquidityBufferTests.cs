using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services.AI;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests.Services;

/// <summary>
/// Tests for Wave 16 §8.5 — Reliable income offset for cash-buffer warnings.
/// Verifies that the LIQUIDITY BUFFER ANALYSIS block in BuildFullFinancialContextAsync
/// subtracts guaranteed monthly income (VA disability, in-payment pension/SS, or
/// explicit IsGuaranteed) from required cash buffer math, and that salary/rental
/// income are NEVER counted because the buffer exists to cover their loss.
/// </summary>
public class AIIntelligenceServiceLiquidityBufferTests
{
    private const string BlockHeader = "=== LIQUIDITY BUFFER ANALYSIS ===";

    private static AIIntelligenceService CreateService(out ApplicationDbContext db)
    {
        db = TestDbContextFactory.Create();
        // The block under test does not invoke _dualAI or _memory, so we pass null!.
        return new AIIntelligenceService(db, null!, null!, NullLogger<AIIntelligenceService>.Instance);
    }

    private static User SeedUser(ApplicationDbContext db, int userId, decimal? bufferMonths = 6m)
    {
        var user = new User
        {
            UserId = userId,
            FirstName = "Test",
            LastName = "User",
            Email = $"user{userId}@example.com",
            LiquidityBufferMonths = bufferMonths
        };
        db.Users.Add(user);
        return user;
    }

    private static void SeedCash(ApplicationDbContext db, int userId, decimal balance)
    {
        db.CashAccounts.Add(new CashAccount
        {
            CashAccountId = Guid.NewGuid(),
            UserId = userId,
            Nickname = "Checking",
            AccountType = "checking",
            Balance = balance
        });
    }

    private static void SeedExpense(ApplicationDbContext db, int userId, decimal monthly, string category = "Total")
    {
        db.ExpenseBudgets.Add(new ExpenseBudget
        {
            UserId = userId,
            Category = category,
            MonthlyAmount = monthly
        });
    }

    private static void SeedIncome(ApplicationDbContext db, int userId, string name, string type, decimal monthly, bool guaranteed = false)
    {
        db.IncomeStreams.Add(new IncomeStreamProfile
        {
            IncomeStreamId = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            IncomeType = type,
            MonthlyAmount = monthly,
            AnnualAmount = monthly * 12m,
            IsGuaranteed = guaranteed,
            IsActive = true
        });
    }

    [Fact]
    public async Task LiquidityBuffer_VADisabilityCoversPart_RequiresOnlyNetGap()
    {
        // VA disability $2,500/mo, expenses $2,698/mo, 6 mo buffer
        // Net gap = $198, required buffer = $1,188 (NOT $16,188)
        const int userId = 101;
        var svc = CreateService(out var db);
        SeedUser(db, userId, bufferMonths: 6m);
        SeedCash(db, userId, balance: 37_130m);
        SeedExpense(db, userId, monthly: 2_698m);
        SeedIncome(db, userId, "VA Disability", "va_disability", 2_500m);
        await db.SaveChangesAsync();

        var ctx = await svc.BuildFullFinancialContextAsync(userId);

        Assert.Contains(BlockHeader, ctx);
        Assert.Contains("Guaranteed monthly income: $2,500", ctx);
        Assert.Contains("Net monthly gap after guaranteed income: $198", ctx);
        Assert.Contains("Required cash buffer (6.0 mo \u00d7 $198): $1,188", ctx);
        Assert.Contains("Surplus over buffer: $35,942", ctx);
        // Sanity: must NOT use the un-offset buffer figure.
        Assert.DoesNotContain("$16,188", ctx);
    }

    [Fact]
    public async Task LiquidityBuffer_GuaranteedExceedsExpenses_RequiresZero()
    {
        // VA disability $3,000/mo, expenses $2,500/mo => required = $0
        const int userId = 102;
        var svc = CreateService(out var db);
        SeedUser(db, userId, bufferMonths: 6m);
        SeedCash(db, userId, balance: 20_000m);
        SeedExpense(db, userId, monthly: 2_500m);
        SeedIncome(db, userId, "VA Disability", "va_disability", 3_000m);
        await db.SaveChangesAsync();

        var ctx = await svc.BuildFullFinancialContextAsync(userId);

        Assert.Contains(BlockHeader, ctx);
        Assert.Contains("Guaranteed income fully covers monthly expenses", ctx);
        Assert.Contains("required cash buffer for expense coverage: $0", ctx);
        Assert.Contains("Current cash: $20,000", ctx);
    }

    [Fact]
    public async Task LiquidityBuffer_NoGuaranteedIncome_BlockOmitted()
    {
        // Salary only — buffer block must NOT render; AI falls back to original framing.
        const int userId = 103;
        var svc = CreateService(out var db);
        SeedUser(db, userId, bufferMonths: 6m);
        SeedCash(db, userId, balance: 10_000m);
        SeedExpense(db, userId, monthly: 4_000m);
        SeedIncome(db, userId, "DoD Salary", "salary", 7_500m);
        await db.SaveChangesAsync();

        var ctx = await svc.BuildFullFinancialContextAsync(userId);

        Assert.DoesNotContain(BlockHeader, ctx);
    }

    [Fact]
    public async Task LiquidityBuffer_RentalIncomeNotSubtracted_EvenIfMarkedGuaranteed()
    {
        // Rental income $1,800/mo flagged IsGuaranteed=true must still NOT count.
        // No other guaranteed income → block must be omitted entirely.
        const int userId = 104;
        var svc = CreateService(out var db);
        SeedUser(db, userId, bufferMonths: 6m);
        SeedCash(db, userId, balance: 15_000m);
        SeedExpense(db, userId, monthly: 3_000m);
        SeedIncome(db, userId, "Rental Property", "rental", 1_800m, guaranteed: true);
        await db.SaveChangesAsync();

        var ctx = await svc.BuildFullFinancialContextAsync(userId);

        Assert.DoesNotContain(BlockHeader, ctx);
    }

    [Fact]
    public async Task LiquidityBuffer_MultipleGuaranteedSources_SumsCorrectly()
    {
        // VA $2,500 + Pension $1,200 = $3,700 guaranteed; expenses $4,500
        // Net gap = $800, required buffer (6 mo) = $4,800
        const int userId = 105;
        var svc = CreateService(out var db);
        SeedUser(db, userId, bufferMonths: 6m);
        SeedCash(db, userId, balance: 50_000m);
        SeedExpense(db, userId, monthly: 4_500m);
        SeedIncome(db, userId, "VA Disability", "va_disability", 2_500m);
        SeedIncome(db, userId, "Military Pension", "pension", 1_200m);
        SeedIncome(db, userId, "Day Job", "salary", 6_000m); // must be ignored
        await db.SaveChangesAsync();

        var ctx = await svc.BuildFullFinancialContextAsync(userId);

        Assert.Contains(BlockHeader, ctx);
        Assert.Contains("Guaranteed monthly income: $3,700", ctx);
        Assert.Contains("Net monthly gap after guaranteed income: $800", ctx);
        Assert.Contains("Required cash buffer (6.0 mo \u00d7 $800): $4,800", ctx);
    }
}
