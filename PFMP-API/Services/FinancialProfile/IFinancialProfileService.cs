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
        Task<FinancialProfileSnapshot?> GetSnapshotAsync(int userId, CancellationToken ct = default);
    }
}
