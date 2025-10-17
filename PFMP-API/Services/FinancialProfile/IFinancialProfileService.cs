using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services.FinancialProfile
{
    public interface IFinancialProfileService
    {
        Task UpsertHouseholdAsync(int userId, HouseholdProfileInput input, CancellationToken ct = default);
        Task UpsertRiskGoalsAsync(int userId, RiskGoalsInput input, CancellationToken ct = default);
        Task UpsertTspAsync(int userId, TspAllocationInput input, CancellationToken ct = default);
        Task UpsertCashAccountsAsync(int userId, CashAccountsInput input, CancellationToken ct = default);
        Task UpsertInvestmentAccountsAsync(int userId, InvestmentAccountsInput input, CancellationToken ct = default);
        Task UpsertPropertiesAsync(int userId, PropertiesInput input, CancellationToken ct = default);
        Task UpsertInsurancePoliciesAsync(int userId, InsurancePoliciesInput input, CancellationToken ct = default);
        Task UpsertIncomeStreamsAsync(int userId, IncomeStreamsInput input, CancellationToken ct = default);
        Task UpsertLiabilitiesAsync(int userId, LiabilitiesInput input, CancellationToken ct = default);
        Task UpsertExpensesAsync(int userId, ExpensesInput input, CancellationToken ct = default);
        Task UpsertTaxProfileAsync(int userId, TaxProfileInput input, CancellationToken ct = default);
        Task UpsertBenefitsAsync(int userId, BenefitsInput input, CancellationToken ct = default);
        Task UpsertLongTermObligationsAsync(int userId, LongTermObligationsInput input, CancellationToken ct = default);
        Task UpsertEquityInterestAsync(int userId, EquityInterestInput input, CancellationToken ct = default);
        Task<FinancialProfileSnapshot?> GetSnapshotAsync(int userId, CancellationToken ct = default);

        Task<HouseholdProfileInput> GetHouseholdAsync(int userId, CancellationToken ct = default);
        Task<RiskGoalsInput> GetRiskGoalsAsync(int userId, CancellationToken ct = default);
        Task<TspAllocationInput> GetTspAsync(int userId, CancellationToken ct = default);
        Task<CashAccountsInput> GetCashAccountsAsync(int userId, CancellationToken ct = default);
        Task<InvestmentAccountsInput> GetInvestmentAccountsAsync(int userId, CancellationToken ct = default);
        Task<PropertiesInput> GetPropertiesAsync(int userId, CancellationToken ct = default);
        Task<InsurancePoliciesInput> GetInsurancePoliciesAsync(int userId, CancellationToken ct = default);
        Task<IncomeStreamsInput> GetIncomeStreamsAsync(int userId, CancellationToken ct = default);
        Task<LiabilitiesInput> GetLiabilitiesAsync(int userId, CancellationToken ct = default);
        Task<ExpensesInput> GetExpensesAsync(int userId, CancellationToken ct = default);
        Task<TaxProfileInput> GetTaxProfileAsync(int userId, CancellationToken ct = default);
        Task<BenefitsInput> GetBenefitsAsync(int userId, CancellationToken ct = default);
        Task<LongTermObligationsInput> GetLongTermObligationsAsync(int userId, CancellationToken ct = default);
        Task<EquityInterestInput> GetEquityInterestAsync(int userId, CancellationToken ct = default);

        // TSP summary and snapshot
        Task<TspSummary> GetTspSummaryAsync(int userId, CancellationToken ct = default);
        Task CreateTspSnapshotAsync(int userId, CancellationToken ct = default);
        Task<TspSnapshotMeta?> GetLatestTspSnapshotMetaAsync(int userId, CancellationToken ct = default);
    }
}
