using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Spending;
using PFMP_API.Tests.Fixtures;
using Xunit;

namespace PFMP_API.Tests;

public class SpendingControllerTests : IClassFixture<TestingWebAppFactory>
{
    private readonly TestingWebAppFactory _factory;

    public SpendingControllerTests(TestingWebAppFactory factory)
    {
        _factory = factory;
    }

    private record BudgetDto(
        int ExpenseBudgetId,
        int UserId,
        string Category,
        decimal MonthlyAmount,
        bool IsEstimated,
        string? Notes,
        string PeriodType,
        DateTime EffectiveFrom,
        DateTime? EffectiveTo,
        bool RolloverEnabled,
        decimal RolloverAmount,
        string? PlaidPrimaryCategory,
        string? PlaidDetailedCategory);

    private record RuleDto(
        int RuleId,
        int UserId,
        string MatchType,
        string MatchValue,
        string AssignedPrimaryCategory,
        string? AssignedDetailedCategory,
        int Priority,
        bool IsActive);

    private record MonthlySummaryDto(
        DateTime From,
        DateTime To,
        decimal TotalInflows,
        decimal TotalOutflows,
        decimal Net,
        int TransactionCount);

    private record CashFlowSummaryDto(
        decimal TotalMonthlyInflows,
        decimal TotalMonthlyOutflows,
        decimal NetMonthlyCashFlow,
        InflowSectionDto Inflows,
        OutflowSectionDto Outflows,
        List<VarianceDto> Variances,
        DateTime AsOfUtc);

    private record InflowSectionDto(
        List<InflowByTypeDto> ByIncomeType,
        List<SavingsAllotmentDto> SavingsAllotments);

    private record InflowByTypeDto(string Type, decimal Amount, string Source, bool IsProfileOnly, bool IsAmbiguousAllotment);

    private record SavingsAllotmentDto(Guid IncomeStreamId, string Name, decimal Amount, int? DestinationAccountId, string? DestinationName);

    private record OutflowSectionDto(
        List<OutflowByCategoryDto> ByPlaidPrimary,
        List<InsurancePremiumDto> InsurancePremiums,
        List<ExternalAllotmentDto> ExternalAllotments);

    private record OutflowByCategoryDto(string Category, decimal Actual, decimal? Budgeted, string Source, bool IsProfileOnly);

    private record InsurancePremiumDto(string PolicyType, string? PolicyName, decimal MonthlyAmount, DateTime? RenewalDate);

    private record ExternalAllotmentDto(Guid IncomeStreamId, string Name, decimal Amount, string? Notes);

    private record VarianceDto(string Stream, decimal Profile, decimal Plaid, decimal DeltaPercent, string Severity);

    private async Task<int> CreateUserAsync(HttpClient client)
    {
        var resp = await client.PostAsync("/api/admin/users/test?scenario=fresh", null);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var user = await resp.Content.ReadFromJsonAsync<UserAdminControllerTests.UserDto>();
        return user!.UserId;
    }

    // ----- Budget CRUD -----

    [Fact]
    public async Task CreateBudget_PersistsExtendedFields()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        var resp = await client.PostAsJsonAsync("/api/Spending/budgets", new
        {
            UserId = userId,
            Category = "Groceries",
            MonthlyAmount = 600m,
            IsEstimated = false,
            PeriodType = 0, // Monthly
            EffectiveFrom = DateTime.UtcNow.AddMonths(-1),
            RolloverEnabled = true,
            RolloverAmount = 50m,
            PlaidPrimaryCategory = "FOOD_AND_DRINK",
        });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var created = await resp.Content.ReadFromJsonAsync<BudgetDto>();

        Assert.Equal("FOOD_AND_DRINK", created!.PlaidPrimaryCategory);
        Assert.True(created.RolloverEnabled);
        Assert.Equal(50m, created.RolloverAmount);
    }

    [Fact]
    public async Task EffectiveAsOf_FiltersByEffectiveDates()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        // Old budget: ended last month
        await client.PostAsJsonAsync("/api/Spending/budgets", new
        {
            UserId = userId,
            Category = "Groceries",
            MonthlyAmount = 400m,
            EffectiveFrom = DateTime.UtcNow.AddMonths(-3),
            EffectiveTo = DateTime.UtcNow.AddMonths(-1),
            PlaidPrimaryCategory = "FOOD_AND_DRINK",
        });
        // Current budget: active
        await client.PostAsJsonAsync("/api/Spending/budgets", new
        {
            UserId = userId,
            Category = "Groceries",
            MonthlyAmount = 600m,
            EffectiveFrom = DateTime.UtcNow.AddMonths(-1),
            PlaidPrimaryCategory = "FOOD_AND_DRINK",
        });

        var listResp = await client.GetAsync($"/api/Spending/budgets?userId={userId}&asOf={Uri.EscapeDataString(DateTime.UtcNow.ToString("o"))}");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var list = await listResp.Content.ReadFromJsonAsync<List<BudgetDto>>();
        Assert.Single(list!);
        Assert.Equal(600m, list![0].MonthlyAmount);
    }

    // ----- Rule CRUD + read-time application -----

    [Fact]
    public async Task CreateRule_AndApplyToMatchingTransaction()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        var ruleResp = await client.PostAsJsonAsync("/api/Spending/rules", new
        {
            UserId = userId,
            MatchType = 1, // MerchantContains
            MatchValue = "Starbucks",
            AssignedPrimaryCategory = "FOOD_AND_DRINK_COFFEE",
            Priority = 10,
            IsActive = true,
        });
        Assert.Equal(HttpStatusCode.Created, ruleResp.StatusCode);

        // Seed a starbucks transaction tagged as generic FOOD_AND_DRINK; rule should rewrite it.
        await SeedCashTransactionAsync(userId, -7.50m, DateTime.UtcNow.AddDays(-3),
            merchant: "Starbucks #1234", plaidCategory: "FOOD_AND_DRINK", plaidDetailed: "FOOD_AND_DRINK_FAST_FOOD");

        var resp = await client.GetAsync($"/api/Spending/by-category?userId={userId}&periodStart={Uri.EscapeDataString(DateTime.UtcNow.AddMonths(-1).ToString("o"))}&periodEnd={Uri.EscapeDataString(DateTime.UtcNow.AddDays(1).ToString("o"))}");
        var rows = await resp.Content.ReadFromJsonAsync<List<dynamic>>();
        Assert.NotNull(rows);
        var json = await resp.Content.ReadAsStringAsync();
        Assert.Contains("FOOD_AND_DRINK_COFFEE", json);
    }

    // ----- Internal-transfer exclusion -----

    [Fact]
    public async Task MonthlySummary_ExcludesCreditCardPayoff()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        // Real spend: $200 at Whole Foods (negative = outflow)
        await SeedCashTransactionAsync(userId, -200m, DateTime.UtcNow.AddDays(-5),
            merchant: "Whole Foods", plaidCategory: "FOOD_AND_DRINK", plaidDetailed: "FOOD_AND_DRINK_GROCERIES");

        // Internal CC payoff: -$1500 from checking — must NOT count as outflow
        await SeedCashTransactionAsync(userId, -1500m, DateTime.UtcNow.AddDays(-2),
            merchant: "Chase Card Payment", plaidCategory: "LOAN_PAYMENTS", plaidDetailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT");

        var resp = await client.GetAsync($"/api/Spending/summary?userId={userId}&from={Uri.EscapeDataString(DateTime.UtcNow.AddMonths(-1).ToString("o"))}&to={Uri.EscapeDataString(DateTime.UtcNow.AddDays(1).ToString("o"))}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var summary = await resp.Content.ReadFromJsonAsync<MonthlySummaryDto>();

        Assert.Equal(200m, summary!.TotalOutflows); // Only the grocery purchase, CC payoff excluded
        Assert.Equal(1, summary.TransactionCount);
    }

    [Fact]
    public async Task MonthlySummary_ExcludesPfmpTransferAndSelfDirectedDescriptions()
    {
        // Regression: user 20 had 7 "Transfer to Self-Directed Investment Account"
        // rows with Category="Transfer" and PlaidCategory=null. They slipped past the
        // Plaid-only exclusion list and aggregated to ~$12,800 of phantom outflow.
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        // Real purchase
        await SeedCashTransactionAsync(userId, -75m, DateTime.UtcNow.AddDays(-5),
            merchant: "Costco", plaidCategory: "GENERAL_MERCHANDISE", plaidDetailed: "GENERAL_MERCHANDISE_WAREHOUSES");

        // PFMP-internal Category = "Transfer", no Plaid fields — must be excluded
        await SeedCashTransactionAsync(userId, -8000m, DateTime.UtcNow.AddDays(-3),
            description: "Transfer to Self-Directed Investment Account", category: "Transfer");

        // Description-prefix match with no category at all — must also be excluded
        await SeedCashTransactionAsync(userId, -2500m, DateTime.UtcNow.AddDays(-2),
            description: "Transfer to Self-Directed Investment Account");

        // New Plaid investment-funding category that we just added — must be excluded
        await SeedCashTransactionAsync(userId, -1000m, DateTime.UtcNow.AddDays(-1),
            plaidCategory: "TRANSFER_OUT", plaidDetailed: "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS");

        var resp = await client.GetAsync($"/api/Spending/summary?userId={userId}&from={Uri.EscapeDataString(DateTime.UtcNow.AddMonths(-1).ToString("o"))}&to={Uri.EscapeDataString(DateTime.UtcNow.AddDays(1).ToString("o"))}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var summary = await resp.Content.ReadFromJsonAsync<MonthlySummaryDto>();

        Assert.Equal(75m, summary!.TotalOutflows); // Only Costco; all three transfers excluded
        Assert.Equal(1, summary.TransactionCount);
    }

    // ----- Cash flow reconciliation + allotments -----

    [Fact]
    public async Task CashFlowSummary_AppliesAllotmentSemantics()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        // Profile baseline: $5500 salary + $500 savings allotment + $300 child support allotment
        await SeedIncomeStreamAsync(userId, "Salary", "salary", 5500m, IncomeStreamAllotmentType.None, null);
        await SeedIncomeStreamAsync(userId, "Savings Allotment", "other", 500m, IncomeStreamAllotmentType.SavingsToLinkedAccount, null);
        await SeedIncomeStreamAsync(userId, "Child Support", "other", 300m, IncomeStreamAllotmentType.ExternalOutflow, null);

        // Insurance premium: $200/mo monthly
        await SeedInsuranceAsync(userId, "Auto", 200m, "Monthly");

        // Budget: $800/mo groceries
        await SeedBudgetAsync(userId, "FOOD_AND_DRINK", 800m);

        var resp = await client.GetAsync($"/api/Spending/cash-flow-summary?userId={userId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var summary = await resp.Content.ReadFromJsonAsync<CashFlowSummaryDto>();

        // Inflows: only Salary counts (savings allotment is internal, child support is outflow)
        Assert.Equal(5500m, summary!.TotalMonthlyInflows);
        Assert.Single(summary.Inflows.ByIncomeType);
        Assert.Equal("Salary", summary.Inflows.ByIncomeType[0].Type);

        // Savings allotment appears informationally
        Assert.Single(summary.Inflows.SavingsAllotments);
        Assert.Equal(500m, summary.Inflows.SavingsAllotments[0].Amount);

        // External allotment + insurance + budget all count as outflows
        Assert.Single(summary.Outflows.ExternalAllotments);
        Assert.Equal(300m, summary.Outflows.ExternalAllotments[0].Amount);

        Assert.Single(summary.Outflows.InsurancePremiums);
        Assert.Equal(200m, summary.Outflows.InsurancePremiums[0].MonthlyAmount);

        // Total outflows = 800 (groceries budget, no actuals) + 200 (insurance) + 300 (child support) = 1300
        Assert.Equal(1300m, summary.TotalMonthlyOutflows);

        // Net = 5500 - 1300 = 4200
        Assert.Equal(4200m, summary.NetMonthlyCashFlow);
    }

    // ----- P2.5 Frequency model -----

    [Theory]
    [InlineData(IncomeStreamFrequency.Weekly, 200, 866.67)]
    [InlineData(IncomeStreamFrequency.Biweekly, 450, 975.00)]
    [InlineData(IncomeStreamFrequency.Semimonthly, 487.50, 975.00)]
    [InlineData(IncomeStreamFrequency.Monthly, 975, 975.00)]
    public void Frequency_MonthlyFactor_RoundTrips(IncomeStreamFrequency freq, decimal perPeriod, decimal expectedMonthly)
    {
        var monthly = perPeriod * freq.MonthlyFactor();
        Assert.Equal(expectedMonthly, Math.Round(monthly, 2));
    }

    [Fact]
    public async Task CashFlowSummary_BiweeklyPartialAllotment_StreamStaysAsInflow_AndSliceIsInformational()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        // GS-13-style biweekly salary: $5,538.46 every 2 weeks ≈ $12,000/mo
        // Plus a $450 biweekly savings allotment ≈ $975/mo
        await SeedIncomeStreamWithFrequencyAsync(
            userId,
            name: "GS-13 Salary",
            incomeType: "salary",
            perPeriodAmount: 5538.46m,
            amountFrequency: IncomeStreamFrequency.Biweekly,
            allotmentType: IncomeStreamAllotmentType.SavingsToLinkedAccount,
            allotmentPerPeriodAmount: 450m,
            allotmentFrequency: IncomeStreamFrequency.Biweekly);

        var resp = await client.GetAsync($"/api/Spending/cash-flow-summary?userId={userId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var summary = await resp.Content.ReadFromJsonAsync<CashFlowSummaryDto>();

        // P2.5: with AllotmentPerPeriodAmount set, the stream is treated as a
        // partial slice — full salary stays as inflow AND the $450 biweekly slice
        // (≈ $975/mo) appears informationally under savings allotments.
        Assert.Single(summary!.Inflows.ByIncomeType);
        Assert.Equal("Salary", summary.Inflows.ByIncomeType[0].Type);
        // Monthly equivalent of $5,538.46 biweekly = 5538.46 × 26/12 ≈ 12,000.00
        Assert.Equal(12000m, Math.Round(summary.Inflows.ByIncomeType[0].Amount, 2));

        Assert.Single(summary.Inflows.SavingsAllotments);
        Assert.Equal(975.00m, Math.Round(summary.Inflows.SavingsAllotments[0].Amount, 2));
    }

    [Fact]
    public async Task CashFlowSummary_EmptyProfile_ReturnsZeros()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        var resp = await client.GetAsync($"/api/Spending/cash-flow-summary?userId={userId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var summary = await resp.Content.ReadFromJsonAsync<CashFlowSummaryDto>();

        Assert.Equal(0m, summary!.TotalMonthlyInflows);
        Assert.Equal(0m, summary.TotalMonthlyOutflows);
        Assert.Equal(0m, summary.NetMonthlyCashFlow);
        Assert.Empty(summary.Inflows.ByIncomeType);
        Assert.Empty(summary.Outflows.ByPlaidPrimary);
    }

    // ----- Recompute rate limit -----

    [Fact]
    public async Task Recompute_SecondCallWithinWindow_Returns429()
    {
        var client = _factory.CreateClient();
        var userId = await CreateUserAsync(client);

        var first = await client.PostAsync($"/api/Spending/recompute?userId={userId}", content: null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsync($"/api/Spending/recompute?userId={userId}", content: null);
        Assert.Equal((HttpStatusCode)429, second.StatusCode);
        Assert.True(second.Headers.Contains("Retry-After"));
    }

    // ----- Helpers (seed via DB scope) -----

    private async Task SeedCashTransactionAsync(int userId, decimal amount, DateTime when,
        string? merchant = null, string? plaidCategory = null, string? plaidDetailed = null,
        string? description = null, string? category = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        // Need a cash account for the user
        var acct = await db.CashAccounts.FirstOrDefaultAsync(a => a.UserId == userId);
        if (acct is null)
        {
            acct = new PFMP_API.Models.FinancialProfile.CashAccount
            {
                CashAccountId = Guid.NewGuid(),
                UserId = userId,
                Institution = "Test Bank",
                Nickname = "Test Checking",
                AccountType = "Checking",
                Balance = 0m,
                Purpose = "Daily Expenses",
                IsEmergencyFund = false,
                InterestRateApr = 0m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.CashAccounts.Add(acct);
            await db.SaveChangesAsync();
        }

        db.CashTransactions.Add(new CashTransaction
        {
            CashAccountId = acct.CashAccountId,
            TransactionType = amount >= 0 ? "Deposit" : "Withdrawal",
            Amount = amount,
            TransactionDate = DateTime.SpecifyKind(when, DateTimeKind.Utc),
            Merchant = merchant,
            Description = description,
            Category = category,
            PlaidCategory = plaidCategory,
            PlaidCategoryDetailed = plaidDetailed,
            Source = "Manual",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedIncomeStreamAsync(int userId, string name, string incomeType, decimal monthlyAmount,
        IncomeStreamAllotmentType allotment, int? accountId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.IncomeStreams.Add(new IncomeStreamProfile
        {
            IncomeStreamId = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            IncomeType = incomeType,
            MonthlyAmount = monthlyAmount,
            AnnualAmount = monthlyAmount * 12,
            IsGuaranteed = false,
            IsActive = true,
            AllotmentType = allotment,
            AllotmentDestinationAccountId = accountId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    /// <summary>P2.5 fixture: seed an income stream using the per-period + frequency
    /// model. Computes MonthlyAmount from PerPeriodAmount × factor so the AI prompt
    /// and dashboard read the same canonical number the production write path would
    /// produce.</summary>
    private async Task SeedIncomeStreamWithFrequencyAsync(
        int userId,
        string name,
        string incomeType,
        decimal perPeriodAmount,
        IncomeStreamFrequency amountFrequency,
        IncomeStreamAllotmentType allotmentType,
        decimal allotmentPerPeriodAmount,
        IncomeStreamFrequency allotmentFrequency)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var monthly = perPeriodAmount * amountFrequency.MonthlyFactor();
        db.IncomeStreams.Add(new IncomeStreamProfile
        {
            IncomeStreamId = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            IncomeType = incomeType,
            MonthlyAmount = monthly,
            AnnualAmount = monthly * 12,
            AmountFrequency = amountFrequency,
            PerPeriodAmount = perPeriodAmount,
            AllotmentType = allotmentType,
            AllotmentFrequency = allotmentFrequency,
            AllotmentPerPeriodAmount = allotmentPerPeriodAmount,
            IsGuaranteed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedInsuranceAsync(int userId, string policyType, decimal premium, string frequency)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.FinancialProfileInsurancePolicies.Add(new FinancialProfileInsurancePolicy
        {
            InsurancePolicyId = Guid.NewGuid(),
            UserId = userId,
            PolicyType = policyType,
            PremiumAmount = premium,
            PremiumFrequency = frequency,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedBudgetAsync(int userId, string plaidPrimary, decimal monthlyAmount)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.ExpenseBudgets.Add(new ExpenseBudget
        {
            UserId = userId,
            Category = plaidPrimary,
            PlaidPrimaryCategory = plaidPrimary,
            MonthlyAmount = monthlyAmount,
            PeriodType = BudgetPeriodType.Monthly,
            EffectiveFrom = DateTime.UtcNow.AddMonths(-1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
